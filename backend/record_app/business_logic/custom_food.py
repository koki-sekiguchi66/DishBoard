"""Myアイテムの出典検証と1食分・100g当たりの変換。"""
import math

from django.core.exceptions import ValidationError
from django.core.validators import URLValidator


GRAMS_PER_100G = 100
MAX_SERVING_SIZE_G = 10000
NUTRIENT_FIELDS = {
    'calories': 'calories_per_100g', 'protein': 'protein_per_100g',
    'fat': 'fat_per_100g', 'carbohydrates': 'carbs_per_100g',
    'dietary_fiber': 'fiber_per_100g', 'sodium': 'sodium_per_100g',
    'calcium': 'calcium_per_100g', 'iron': 'iron_per_100g',
    'vitamin_a': 'vitamin_a_per_100g', 'vitamin_b1': 'vitamin_b1_per_100g',
    'vitamin_b2': 'vitamin_b2_per_100g', 'vitamin_c': 'vitamin_c_per_100g',
}


def validate_metadata(data):
    """出典と1食分の重量に矛盾がないことを検証する。"""
    basis = data.get('nutrition_basis', 'per_100g')
    size = data.get('serving_size_g')
    if basis not in ('per_100g', 'per_serving'):
        raise ValueError('nutrition_basis は per_100g / per_serving で指定してください。')
    if size is not None and (not math.isfinite(size) or not 0 < size <= MAX_SERVING_SIZE_G):
        raise ValueError(f'serving_size_g は0より大きく{MAX_SERVING_SIZE_G}g以下で指定してください。')
    if basis == 'per_serving' and size is None:
        raise ValueError('per_serving では serving_size_g が必要です。')
    source = data.get('source', 'manual')
    url = data.get('source_url', '')
    if source not in ('manual', 'url'):
        raise ValueError('source は manual / url で指定してください。')
    if source == 'url' and not url:
        raise ValueError('source=url では source_url が必要です。')
    if source == 'manual' and url:
        raise ValueError('source_url がある場合は source=url を指定してください。')
    if url:
        try:
            URLValidator(schemes=['http', 'https'])(url)
        except ValidationError as error:
            raise ValueError('source_url は http / https のURLで指定してください。') from error


def prepare_custom_food(data):
    """表示基準の栄養値を既存の100g当たり保存形式へ換算する。"""
    validate_metadata(data)
    factor = GRAMS_PER_100G / data['serving_size_g'] if data['nutrition_basis'] == 'per_serving' else 1
    values = {field: data['nutrition'].get(key, 0) * factor for key, field in NUTRIENT_FIELDS.items()}
    if any(not math.isfinite(value) or value < 0 for value in values.values()):
        raise ValueError('栄養値は換算後も有限の非負数である必要があります。')
    return {key: value for key, value in data.items() if key != 'nutrition'} | values


def format_custom_food(food):
    """Myアイテムを登録時の栄養基準でMCPへ返す。"""
    factor = food.serving_size_g / GRAMS_PER_100G if food.nutrition_basis == 'per_serving' else 1
    return {
        'item_type': 'custom', 'item_id': food.id, 'name': food.name, 'category': 'Myアイテム',
        'nutrition_basis': food.nutrition_basis, 'serving_size_g': food.serving_size_g,
        'source': food.source, 'source_url': food.source_url, 'is_verified': food.is_verified,
        'nutrition': {key: getattr(food, field) * factor for key, field in NUTRIENT_FIELDS.items()},
    }
