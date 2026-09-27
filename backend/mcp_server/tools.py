"""MCP ツールの本体。

ここは**入出力変換に徹する層**である。ドメイン処理は
record_app/business_logic/ と record_app/serializers.py にある。

すべてのツールは context.resolve_user() でユーザーを解決し、
以降のクエリを必ずそのユーザーで絞る。ここを迂回しないこと。

FastMCP のデコレータを使わず素の関数にしてあるのは、
テストからトランスポートを起動せずに直接呼べるようにするため
（SDK のバージョンアップでテストが壊れないようにする）。
登録は server.py が add_tool() で行う。
"""
import logging
from typing import Literal

from asgiref.sync import sync_to_async
from pydantic import BaseModel, Field, ConfigDict

from . import formatters, validators
from .constants import (
    CUSTOM_FOOD_DRAFT_MAX_AGE,
    CUSTOM_FOOD_DRAFT_SALT,
    MAX_DRAFT_TOKEN_LENGTH,
    MAX_SOURCE_URL_LENGTH,
    MAX_MEAL_NAME_LENGTH,
    MAX_CAFETERIA_SUGGESTIONS,
    MAX_LIST_RECORDS,
    MAX_SEARCH_RESULTS,
    NUTRIENT_ROUND_DIGITS,
    SCOPE_MEALS_READ,
    SCOPE_MEALS_WRITE,
    SCOPE_WEIGHT_READ,
)
from .context import resolve_user
from .errors import NotFoundError, ValidationError
from .rate_limit import check_write_rate_limit

logger = logging.getLogger(__name__)


class MealItemInput(BaseModel):
    """食事明細の入力。検索・食品作成の結果から種別とIDを取る。"""

    item_type: Literal['standard', 'custom', 'cafeteria'] = Field(
        description='食品の種別。検索または食品作成が返した値をそのまま使う'
    )
    item_id: int = Field(description='検索または食品作成が返した item_id')
    amount_grams: float | None = Field(
        default=None,
        description=(
            '分量(g)。item_type が standard / custom のときは '
            'この分量で栄養値を按分する。cafeteria は1食ぶんの値が'
            '決まっているため、この値では変倍されない。重量不明のMyアイテムには使用できない'
        )
    )
    servings: float | None = Field(
        default=None, description='1食分の栄養値または重量を持つMyアイテムの食数。amount_grams とどちらか一方を指定する。重量不明なら食数のみ。',
    )


class FoodNutritionInput(BaseModel):
    """出典で確認できた栄養値。単位はツール説明に従う。"""

    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)
    calories: float = Field(ge=0)
    protein: float = Field(ge=0)
    fat: float = Field(ge=0)
    carbohydrates: float = Field(ge=0)
    dietary_fiber: float = Field(default=0, ge=0)
    sodium: float = Field(default=0, ge=0)
    calcium: float = Field(default=0, ge=0)
    iron: float = Field(default=0, ge=0)
    vitamin_a: float = Field(default=0, ge=0)
    vitamin_b1: float = Field(default=0, ge=0)
    vitamin_b2: float = Field(default=0, ge=0)
    vitamin_c: float = Field(default=0, ge=0)


class CustomFoodInput(BaseModel):
    """登録時の表示基準と出典を含むMyアイテムの入力。"""

    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)
    name: str = Field(min_length=1, max_length=MAX_MEAL_NAME_LENGTH)
    nutrition_basis: Literal['per_100g', 'per_serving'] = 'per_100g'
    serving_size_g: float | None = None
    nutrition: FoodNutritionInput
    source: Literal['manual', 'url']
    source_url: str = Field(default='', max_length=MAX_SOURCE_URL_LENGTH)


async def draft_custom_food(food: CustomFoodInput) -> dict:
    """Myアイテムの下書きを返す。DBには保存しない。"""
    from django.core import signing
    from record_app.business_logic.custom_food import prepare_custom_food

    user = await resolve_user(SCOPE_MEALS_READ)
    data = food.model_dump()
    data['name'] = validators.validate_meal_name(food.name)
    try:
        values = prepare_custom_food(data)
    except ValueError as error:
        raise ValidationError(str(error)) from error
    token = signing.dumps({'user_id': user.id, 'food': values}, salt=CUSTOM_FOOD_DRAFT_SALT, compress=True)
    return {**data, 'saved': False, 'draft_token': token,
            'expires_in_seconds': CUSTOM_FOOD_DRAFT_MAX_AGE}


async def create_custom_food(draft_token: str | None = None, confirmed: bool | None = None,
                             food: CustomFoodInput | None = None) -> dict:
    """指定した栄養値または署名付き下書きからMyアイテムを作成する。"""
    from django.core import signing
    from record_app.business_logic.custom_food import prepare_custom_food

    user = await resolve_user(SCOPE_MEALS_WRITE)
    if confirmed is False:
        raise ValidationError('作成が取り消されています。')
    if (food is None) == (draft_token is None):
        raise ValidationError('food または draft_token のどちらか一方を指定してください。')
    if food is not None:
        data = food.model_dump()
        data['name'] = validators.validate_meal_name(food.name)
        try:
            values = prepare_custom_food(data)
        except ValueError as error:
            raise ValidationError(str(error)) from error
        check_write_rate_limit(user.id)
        return await sync_to_async(_create_custom_food_sync)(user, values)
    if not draft_token or len(draft_token) > MAX_DRAFT_TOKEN_LENGTH:
        raise ValidationError('draft_custom_food で有効な下書きを作成してください。')
    try:
        draft = signing.loads(draft_token, salt=CUSTOM_FOOD_DRAFT_SALT, max_age=CUSTOM_FOOD_DRAFT_MAX_AGE)
    except signing.BadSignature as error:
        raise ValidationError('下書きが無効または期限切れです。draft_custom_food からやり直してください。') from error
    if draft['user_id'] != user.id:
        raise ValidationError('この下書きは利用できません。本人の下書きを作成してください。')
    check_write_rate_limit(user.id)
    return await sync_to_async(_create_custom_food_sync)(user, draft['food'])


def _create_custom_food_sync(user, values):
    from django.db import IntegrityError, transaction
    from record_app.serializers import CustomFoodSerializer
    from record_app.business_logic.custom_food import format_custom_food

    serializer = CustomFoodSerializer(data=values)
    if not serializer.is_valid():
        raise ValidationError(f'Myアイテムを作成できません: {serializer.errors}')
    try:
        with transaction.atomic():
            food = serializer.save(user=user)
    except IntegrityError as error:
        raise ValidationError('同じ名前のMyアイテムが既にあります。search_foods で確認してください。') from error
    return format_custom_food(food)


# =============================================================================
# T1: 食品検索
# =============================================================================

async def search_foods(
    query: str,
    item_types: list[Literal['standard', 'custom', 'cafeteria']] | None = None,
    cafeteria: Literal['rune', 'hokubu', 'chuo'] | None = None,
) -> dict:
    """食品を名前で検索する（標準食品・Myアイテム・食堂メニューを横断）。"""
    user = await resolve_user(SCOPE_MEALS_READ)
    cleaned_query = validators.validate_search_query(query)

    from record_app.business_logic.nutrition_calculator import NutritionCalculatorService
    from record_app.business_logic.food_search import related_suggestions

    if item_types is not None and (not item_types or set(item_types) - {'standard', 'custom', 'cafeteria'}):
        raise ValidationError('item_types は standard / custom / cafeteria を1つ以上指定してください。')
    if cafeteria not in (None, 'rune', 'hokubu', 'chuo'):
        raise ValidationError('cafeteria は rune / hokubu / chuo のいずれかです。')

    calculator = NutritionCalculatorService()
    foods = await sync_to_async(calculator.search_foods_across_sources)(
        user, cleaned_query, MAX_SEARCH_RESULTS, item_types=item_types, cafeteria=cafeteria
    )

    return {'query': cleaned_query, 'count': len(foods), 'foods': foods,
            'suggestions': related_suggestions(cleaned_query) if not foods else []}


# =============================================================================
# T2: 指定日の栄養サマリー
# =============================================================================

async def get_daily_nutrition(date: str) -> dict:
    """指定日の栄養素合計と、その日の食事の一覧を返す。"""
    user = await resolve_user(SCOPE_MEALS_READ)
    target_date = validators.parse_date(date, 'date')

    return await sync_to_async(_get_daily_nutrition_sync)(user, target_date)


def _get_daily_nutrition_sync(user, target_date):
    from django.db.models import Count

    from record_app.business_logic.nutrition_calculator import NutritionCalculatorService
    from record_app.models import MealRecord, NutritionGoal

    calculator = NutritionCalculatorService()
    total = calculator.get_daily_nutrition_summary(user, target_date)

    # 未設定でもモデルの既定値を返す。既定値の定義はモデルに一本化している（ADR #28）
    goal_row = NutritionGoal.objects.filter(user=user).first() or NutritionGoal()
    goal = {
        'calories': goal_row.calories,
        'protein': goal_row.protein,
        'fat': goal_row.fat,
        'carbs': goal_row.carbs,
    }
    remaining = {
        'calories': round(goal['calories'] - total['calories'], 1),
        'protein': round(goal['protein'] - total['protein'], 1),
        'fat': round(goal['fat'] - total['fat'], 1),
        'carbs': round(goal['carbs'] - total['carbohydrates'], 1),
    }

    meals = (
        MealRecord.objects.filter(user=user, record_date=target_date)
        .annotate(items_count=Count('items'))
        .order_by('created_at')
    )

    return {
        'date': target_date.isoformat(),
        'total': total,
        'goal': goal,
        'remaining': remaining,
        'meals': [formatters.format_meal_summary(meal, meal.items_count) for meal in meals],
    }


# =============================================================================
# T3: 期間の推移
# =============================================================================

async def get_nutrition_trend(start_date: str, end_date: str) -> dict:
    """期間内の日別の栄養素合計と体重を返す（サーバ側で集計済み）。"""
    user = await resolve_user(SCOPE_MEALS_READ)
    start, end = validators.parse_date_range(start_date, end_date)

    # 体重は weight:read を持つ場合だけ含める。
    # 栄養の分析だけを許可したユーザーに体重を返さないため
    include_weight = await _has_weight_scope()

    return await sync_to_async(_get_trend_sync)(user, start, end, include_weight)


async def _has_weight_scope():
    from mcp.server.auth.middleware.auth_context import get_access_token

    access_token = get_access_token()
    return access_token is not None and SCOPE_WEIGHT_READ in access_token.scopes


def _get_trend_sync(user, start, end, include_weight):
    from record_app.business_logic.nutrition_calculator import NutritionCalculatorService

    calculator = NutritionCalculatorService()
    daily = calculator.get_nutrition_trend(user, start, end, NUTRIENT_ROUND_DIGITS)

    result = {
        'start_date': start.isoformat(),
        'end_date': end.isoformat(),
        'days_with_records': len(daily),
        'daily': daily,
    }

    if include_weight:
        result['weights'] = calculator.get_weight_trend(user, start, end)

    return result


# =============================================================================
# T4: 食事記録の一覧
# =============================================================================

async def list_meal_records(start_date: str, end_date: str) -> dict:
    """期間内の食事記録を一覧する（明細なし・件数と PFC + kcal のみ）。"""
    user = await resolve_user(SCOPE_MEALS_READ)
    start, end = validators.parse_date_range(start_date, end_date)

    return await sync_to_async(_list_meal_records_sync)(user, start, end)


def _list_meal_records_sync(user, start, end):
    from django.db.models import Count

    from record_app.models import MealRecord

    # 一覧では明細の中身は不要。件数だけ annotate で取り N+1 を避ける
    # （既存の MealRecordViewSet.get_queryset() と同じ考え方）
    meals = (
        MealRecord.objects.filter(user=user, record_date__gte=start, record_date__lte=end)
        .annotate(items_count=Count('items'))
        .order_by('-record_date', '-created_at')
    )[:MAX_LIST_RECORDS]

    records = [formatters.format_meal_summary(meal, meal.items_count) for meal in meals]

    return {
        'start_date': start.isoformat(),
        'end_date': end.isoformat(),
        'count': len(records),
        'records': records,
    }


# =============================================================================
# T5: 食事記録の詳細
# =============================================================================

async def get_meal_record(meal_record_id: int) -> dict:
    """食事記録1件の詳細を返す（明細と12栄養素つき）。"""
    user = await resolve_user(SCOPE_MEALS_READ)

    return await sync_to_async(_get_meal_record_sync)(user, meal_record_id)


def _get_meal_record_sync(user, meal_record_id):
    meal = _find_own_meal_record(user, meal_record_id)
    return formatters.format_meal_detail(meal)


def _find_own_meal_record(user, meal_record_id):
    """自分の食事記録を引く。他人のものは「存在しない」として扱う。

    403 ではなく 404 相当にするのは、そのIDの記録が存在すること自体を
    漏らさないため（既存 API と揃える）。
    """
    from record_app.models import MealRecord

    meal = (
        MealRecord.objects.filter(pk=meal_record_id, user=user)
        .prefetch_related('items')
        .first()
    )
    if meal is None:
        raise NotFoundError(
            f'食事記録 id={meal_record_id} は見つかりません。'
            'list_meal_records で正しい id を確認してください。'
        )
    return meal


# =============================================================================
# T6: 下書き（DB に書かない）
# =============================================================================

async def draft_meal(meal_name: str, items: list[MealItemInput]) -> dict:
    """食事の下書きを作る。栄養値を計算して返すだけで、**DB には保存しない**。"""
    user = await resolve_user(SCOPE_MEALS_READ)
    cleaned_name = validators.validate_meal_name(meal_name)
    validators.validate_items(items)

    return await sync_to_async(_draft_meal_sync)(user, cleaned_name, items)


def _draft_meal_sync(user, meal_name, items):
    resolved = _resolve_items(user, items)

    return {
        'meal_name': meal_name,
        'items': [entry['formatted'] for entry in resolved],
        'total': formatters.sum_nutrients([entry['nutrition'] for entry in resolved]),
        'saved': False,
    }


def _resolve_items(user, items):
    """入力の明細を、名前と栄養値が確定した状態に解決する。

    見つからない食品があれば、その時点で中断して利用者に伝える
    （一部だけ登録されるより、何も登録されない方が直しやすい）。
    """
    from record_app.business_logic.nutrition_calculator import NutritionCalculatorService

    calculator = NutritionCalculatorService()
    resolved = []

    for index, item in enumerate(items):
        try:
            entry = calculator.resolve_item(
                user, item.item_type, item.item_id, item.amount_grams, NUTRIENT_ROUND_DIGITS,
                servings=item.servings,
            )
        except ValueError as error:
            raise ValidationError(str(error)) from error
        if entry is None:
            raise NotFoundError(
                f'items[{index}] の食品が見つかりません'
                f'（item_type={item.item_type}, item_id={item.item_id}）。'
                'search_foods で item_type と item_id を確認してください。'
            )

        resolved_input = item.model_copy(update={'amount_grams': entry['amount_grams']})
        if entry['amount_grams'] is not None:
            validators.validate_amount_grams(entry['amount_grams'])
        resolved.append({
            'input': resolved_input,
            'name': entry['name'],
            'nutrition': entry['nutrition'],
            'formatted': formatters.format_draft_item(resolved_input, entry['name'], entry['nutrition']),
        })

    return resolved


# =============================================================================
# T7 / T8: 書き込み
# =============================================================================

async def create_meal_record(
    record_date: str,
    meal_timing: Literal['breakfast', 'lunch', 'dinner', 'snack'],
    meal_name: str,
    items: list[MealItemInput],
    idempotency_key: str | None = None,
) -> dict:
    """食事記録を作成する。作成された記録の全体を返す。"""
    user = await resolve_user(SCOPE_MEALS_WRITE)
    target_date = validators.parse_date(record_date, 'record_date')
    cleaned_name = validators.validate_meal_name(meal_name)
    validators.validate_items(items)
    check_write_rate_limit(user.id)

    return await sync_to_async(_create_meal_record_sync)(
        user, target_date, meal_timing, cleaned_name, items,
        validators.validate_idempotency_key(idempotency_key),
    )


def _create_meal_record_sync(user, record_date, meal_timing, meal_name, items, idempotency_key=None):
    from record_app.serializers import MealRecordSerializer
    from record_app.services import MealService

    def save_meal():
        payload = _build_meal_payload(user, record_date, meal_timing, meal_name, items)
        serializer = MealRecordSerializer(data=payload)
        if not serializer.is_valid():
            raise ValidationError(f'食事記録を作成できませんでした: {serializer.errors}')
        return serializer.save(user=user)

    request_data = {
        'record_date': record_date.isoformat(), 'meal_timing': meal_timing, 'meal_name': meal_name,
        'items': [item.model_dump() for item in items],
    }
    try:
        meal = MealService.create_idempotently(user, idempotency_key, request_data, save_meal)
    except ValueError as error:
        raise ValidationError(str(error)) from error
    return formatters.format_meal_detail(meal)


async def update_meal_record(
    meal_record_id: int,
    record_date: str,
    meal_timing: Literal['breakfast', 'lunch', 'dinner', 'snack'],
    meal_name: str,
    items: list[MealItemInput],
) -> dict:
    """既存の食事記録を更新する。明細は指定された内容で**置き換わる**。"""
    user = await resolve_user(SCOPE_MEALS_WRITE)
    target_date = validators.parse_date(record_date, 'record_date')
    cleaned_name = validators.validate_meal_name(meal_name)
    validators.validate_items(items)
    check_write_rate_limit(user.id)

    return await sync_to_async(_update_meal_record_sync)(
        user, meal_record_id, target_date, meal_timing, cleaned_name, items
    )


def _update_meal_record_sync(user, meal_record_id, record_date, meal_timing, meal_name, items):
    from record_app.serializers import MealRecordSerializer

    meal = _find_own_meal_record(user, meal_record_id)
    payload = _build_meal_payload(user, record_date, meal_timing, meal_name, items)

    serializer = MealRecordSerializer(meal, data=payload)
    if not serializer.is_valid():
        raise ValidationError(f'食事記録を更新できませんでした: {serializer.errors}')

    updated = serializer.save()
    return formatters.format_meal_detail(updated)


async def delete_meal_record(meal_record_id: int, confirmed: bool | None = None) -> dict:
    """利用者が削除を指示した自分の食事記録を明細とともに削除する。"""
    user = await resolve_user(SCOPE_MEALS_WRITE)
    if confirmed is False:
        raise ValidationError('削除が取り消されています。')
    check_write_rate_limit(user.id)
    return await sync_to_async(_delete_meal_record_sync)(user, meal_record_id)


def _delete_meal_record_sync(user, meal_record_id):
    meal = _find_own_meal_record(user, meal_record_id)
    meal.delete()
    return {'id': meal_record_id, 'deleted': True}


def _build_meal_payload(user, record_date, meal_timing, meal_name, items):
    """シリアライザに渡す形へ変換する。合計は明細から算出する。

    栄養値は**この時点の実数値**として明細に載せる。参照ではなくスナップショット
    として保存する設計（ADR #1）を MCP 経由でも守るため。
    """
    resolved = _resolve_items(user, items)
    totals = formatters.sum_nutrients([entry['nutrition'] for entry in resolved])

    item_payloads = []
    for display_order, entry in enumerate(resolved):
        item_payloads.append({
            'item_type': entry['input'].item_type,
            'item_id': entry['input'].item_id,
            'item_name': entry['name'],
            'amount_grams': entry['input'].amount_grams,
            'servings': entry['input'].servings,
            'display_order': display_order,
            **entry['nutrition'],
        })

    return {
        'record_date': record_date.isoformat(),
        'meal_timing': meal_timing,
        'meal_name': meal_name,
        **totals,
        'items': item_payloads,
    }


# =============================================================================
# T9: 残りの目標に合う学食メニューの提案
# =============================================================================

async def suggest_cafeteria_menus(
    date: str,
    cafeteria: Literal['rune', 'hokubu', 'chuo'] | None = None,
) -> dict:
    """残りの栄養目標に近い学食メニューを提案する。"""
    user = await resolve_user(SCOPE_MEALS_READ)
    target_date = validators.parse_date(date, 'date')

    return await sync_to_async(_suggest_cafeteria_sync)(user, target_date, cafeteria)


def _suggest_cafeteria_sync(user, target_date, cafeteria):
    from record_app.business_logic.cafeteria_advisor import CafeteriaAdvisor

    return CafeteriaAdvisor().suggest(
        user, target_date, limit=MAX_CAFETERIA_SUGGESTIONS, cafeteria=cafeteria
    )
