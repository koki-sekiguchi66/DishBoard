"""ツール入力の検証。

Claude は人間より遥かに速く・大量に叩けるため、入力サイズには必ず上限を置く。
エラーメッセージは Claude が読んで**自力で直せる**内容にすること
（「不正です」ではなく「何がどう不正で、どうすればよいか」）。
"""
from datetime import date
import math
from uuid import UUID

from .constants import (
    MAX_AMOUNT_GRAMS,
    MAX_ITEMS_PER_MEAL,
    MAX_SERVINGS,
    MAX_MEAL_NAME_LENGTH,
    MAX_TREND_DAYS,
    MIN_SEARCH_QUERY_LENGTH,
    VALID_ITEM_TYPES,
)
from .errors import ValidationError


def parse_date(value, field_name):
    """YYYY-MM-DD の文字列を date に変換する。

    相対日付（「昨日」など）はここでは解釈しない。
    サーバとユーザーのタイムゾーンの解釈がずれるため、
    絶対日付への変換は Claude 側の責務とする。
    """
    if not value:
        raise ValidationError(f'{field_name} は YYYY-MM-DD 形式で指定してください。')
    try:
        return date.fromisoformat(value)
    except (ValueError, TypeError):
        raise ValidationError(
            f'{field_name} の日付形式が正しくありません（受け取った値: {value!r}）。'
            'YYYY-MM-DD 形式で指定してください。'
        )


def parse_date_range(start_date, end_date):
    """期間を検証して (start, end) を返す。上限日数を超えたらエラー。"""
    start = parse_date(start_date, 'start_date')
    end = parse_date(end_date, 'end_date')

    if start > end:
        raise ValidationError(
            f'start_date（{start_date}）が end_date（{end_date}）より後になっています。'
        )

    # 両端を含むので +1 日
    span_days = (end - start).days + 1
    if span_days > MAX_TREND_DAYS:
        raise ValidationError(
            f'期間が長すぎます（{span_days}日）。一度に取得できるのは '
            f'{MAX_TREND_DAYS}日までです。期間を分けて取得してください。'
        )

    return start, end


def validate_search_query(query):
    """検索キーワードの長さを検証する。"""
    cleaned = (query or '').strip()
    from record_app.business_logic.food_search import normalize_food_name

    if len(normalize_food_name(cleaned)) < MIN_SEARCH_QUERY_LENGTH:
        raise ValidationError(
            f'検索キーワードは{MIN_SEARCH_QUERY_LENGTH}文字以上で指定してください。'
        )
    return cleaned


def validate_meal_name(meal_name):
    """食事名の長さを検証する。"""
    cleaned = (meal_name or '').strip()
    if not cleaned:
        raise ValidationError('meal_name（食事名）は必須です。')
    if len(cleaned) > MAX_MEAL_NAME_LENGTH:
        raise ValidationError(
            f'meal_name が長すぎます（{len(cleaned)}文字）。'
            f'{MAX_MEAL_NAME_LENGTH}文字以内にしてください。'
        )
    return cleaned


def validate_items(items):
    """明細リストを検証する。件数・種別・分量の上限を見る。"""
    if not items:
        raise ValidationError(
            'items が空です。食品を1件以上指定してください。'
            'search_foods で item_type と item_id を調べてから渡してください。'
        )

    if len(items) > MAX_ITEMS_PER_MEAL:
        raise ValidationError(
            f'items が多すぎます（{len(items)}件）。1回の食事に指定できるのは '
            f'{MAX_ITEMS_PER_MEAL}件までです。食事を分けて記録してください。'
        )

    for index, item in enumerate(items):
        position = f'items[{index}]'

        if item.item_type not in VALID_ITEM_TYPES:
            raise ValidationError(
                f'{position}.item_type が不正です（{item.item_type!r}）。'
                f'{" / ".join(VALID_ITEM_TYPES)} のいずれかを指定してください。'
            )

        if (item.amount_grams is None) == (item.servings is None):
            raise ValidationError(f'{position} は amount_grams / servings のどちらか一方を指定してください。')
        if item.amount_grams is not None:
            validate_amount_grams(item.amount_grams)
        elif not math.isfinite(item.servings) or not 0 < item.servings <= MAX_SERVINGS:
            raise ValidationError(f'{position}.servings は0より大きく{MAX_SERVINGS}以下で指定してください。')

    return items


def validate_amount_grams(amount):
    """直接指定と食数換算の両方に同じ重量上限を適用する。"""
    if not math.isfinite(amount) or not 0 < amount <= MAX_AMOUNT_GRAMS:
        raise ValidationError(f'amount_grams は0より大きく{MAX_AMOUNT_GRAMS}g以下の有限の数で指定してください。')


def validate_idempotency_key(value):
    """再送キーをUUIDに正規化する。省略時は従来の作成動作。"""
    if value is None:
        return None
    try:
        return UUID(value)
    except (ValueError, TypeError, AttributeError) as error:
        raise ValidationError('idempotency_key はUUID文字列で指定してください。') from error
