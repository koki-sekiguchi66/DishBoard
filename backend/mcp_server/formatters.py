"""モデル → ツール返り値の変換。

MCP 層の責務は入出力変換だけである。ここに計算ロジックを書かないこと
（栄養値の計算は business_logic/nutrition_calculator.py にある）。

返す栄養素を用途で絞っているのは、ツールの返り値がすべて Claude の
コンテキストを消費するため。分析系は PFC + kcal、詳細取得時だけ12栄養素。
"""
from .constants import (
    DETAIL_NUTRIENT_KEYS,
    NUTRIENT_ROUND_DIGITS,
    SUMMARY_NUTRIENT_KEYS,
)


def _nutrients_from(source, keys):
    """オブジェクトから指定キーの栄養素を取り出して丸める。"""
    return {
        key: round(getattr(source, key) or 0, NUTRIENT_ROUND_DIGITS)
        for key in keys
    }


def format_meal_summary(meal_record, items_count):
    """一覧用の食事記録。明細は含めず、件数と PFC + kcal だけ返す。"""
    return {
        'id': meal_record.id,
        'date': meal_record.record_date.isoformat(),
        'meal_timing': meal_record.meal_timing,
        'meal_timing_label': meal_record.get_meal_timing_display(),
        'meal_name': meal_record.meal_name,
        'items_count': items_count,
        **_nutrients_from(meal_record, SUMMARY_NUTRIENT_KEYS),
    }


def format_meal_detail(meal_record):
    """詳細用の食事記録。明細と12栄養素を含む。

    呼び出し側で prefetch_related('items') しておくこと（N+1 回避）。
    """
    return {
        'id': meal_record.id,
        'date': meal_record.record_date.isoformat(),
        'meal_timing': meal_record.meal_timing,
        'meal_timing_label': meal_record.get_meal_timing_display(),
        'meal_name': meal_record.meal_name,
        'total': _nutrients_from(meal_record, DETAIL_NUTRIENT_KEYS),
        'items': [format_meal_item(item) for item in meal_record.items.all()],
    }


def format_meal_item(item):
    """明細1行。栄養値は記録時点のスナップショット（現在の食品DBの値ではない）。"""
    return {
        'item_type': item.item_type,
        'item_id': item.item_id,
        'item_name': item.item_name,
        'amount_grams': item.amount_grams,
        'servings': item.servings,
        **_nutrients_from(item, DETAIL_NUTRIENT_KEYS),
    }


def format_draft_item(item_input, item_name, nutrition):
    """下書きの明細1行。DB には保存されていない値である。"""
    return {
        'item_type': item_input.item_type,
        'item_id': item_input.item_id,
        'item_name': item_name,
        'amount_grams': item_input.amount_grams,
        'servings': item_input.servings,
        **nutrition,
    }


def sum_nutrients(nutrition_list):
    """明細の栄養素を合計する。12栄養素すべてを対象にする。"""
    totals = {key: 0.0 for key in DETAIL_NUTRIENT_KEYS}
    for nutrition in nutrition_list:
        for key in DETAIL_NUTRIENT_KEYS:
            totals[key] += nutrition.get(key, 0)
    return {
        key: round(value, NUTRIENT_ROUND_DIGITS)
        for key, value in totals.items()
    }
