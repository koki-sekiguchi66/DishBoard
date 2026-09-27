"""Myアイテムの入力検証と1食分・100g当たりの変換。"""
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
    """重量不明なら1食分を保持し、分かる場合だけ100gへ換算する。"""
    validate_metadata(data)
    nutrition = validate_nutrition(data['nutrition'])
    unknown_weight = data['nutrition_basis'] == 'per_serving' and data.get('serving_size_g') is None
    if unknown_weight:
        values = {field: None for field in NUTRIENT_FIELDS.values()}
        return {key: value for key, value in data.items() if key != 'nutrition'} | values | {'nutrition_per_serving': nutrition}
    factor = GRAMS_PER_100G / data['serving_size_g'] if data['nutrition_basis'] == 'per_serving' else 1
    values = {field: nutrition[key] * factor for key, field in NUTRIENT_FIELDS.items()}
    if any(not math.isfinite(value) or value < 0 for value in values.values()):
        raise ValueError('栄養値は換算後も有限の非負数である必要があります。')
    return {key: value for key, value in data.items() if key != 'nutrition'} | values | {'nutrition_per_serving': None}


def validate_nutrition(nutrition):
    """WebとMCPの両方で栄養値の必須項目と有限性を検証する。"""
    if not isinstance(nutrition, dict) or not {'calories', 'protein', 'fat', 'carbohydrates'} <= nutrition.keys():
        raise ValueError('栄養値にはcalories・protein・fat・carbohydratesが必要です。')
    if nutrition.keys() - NUTRIENT_FIELDS.keys():
        raise ValueError('未知の栄養素が含まれています。')
    values = {key: nutrition.get(key, 0) for key in NUTRIENT_FIELDS}
    if any(isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0
           for value in values.values()):
        raise ValueError('栄養値は有限の非負数で指定してください。')
    return values


def serving_nutrition(food):
    """食品の1食分栄養値を返す。重量がない場合は換算しない。"""
    if food.nutrition_per_serving is not None:
        return food.nutrition_per_serving
    if food.serving_size_g is None:
        raise ValueError('この食品には1食分の栄養値または重量がありません。')
    return {key: getattr(food, field) * food.serving_size_g / GRAMS_PER_100G
            for key, field in NUTRIENT_FIELDS.items()}


def normalize_food_update(attrs, instance=None):
    """入力基準の変更で不明な重量を推定せず、既存の栄養値を保持する。"""
    metadata = {key: attrs.get(key, getattr(instance, key, default)) for key, default in (
        ('nutrition_basis', 'per_100g'), ('serving_size_g', None), ('source', 'manual'), ('source_url', ''),
    )}
    validate_metadata(metadata)
    nutrition = attrs.pop('nutrition', None)
    per_serving = attrs.get('nutrition_per_serving')
    provided_per100 = any(attrs.get(field) is not None for field in NUTRIENT_FIELDS.values())
    if nutrition is not None:
        if provided_per100 or per_serving is not None:
            raise ValueError('nutritionと保存形式の栄養値を同時に指定しないでください。')
        return attrs | prepare_custom_food(metadata | {'nutrition': nutrition})
    unknown = metadata['nutrition_basis'] == 'per_serving' and metadata['serving_size_g'] is None
    if unknown:
        if provided_per100:
            raise ValueError('重量不明の食品には1食分のnutritionを指定してください。')
        if per_serving is None and instance:
            per_serving = serving_nutrition(instance)
        return attrs | prepare_custom_food(metadata | {'nutrition': per_serving})
    if per_serving is not None or (instance and instance.nutrition_per_serving is not None):
        if provided_per100:
            # 明示的な100g栄養値で置換する場合にだけ基準の変更を許す。
            attrs['nutrition_per_serving'] = None
        else:
            if metadata['serving_size_g'] is None:
                raise ValueError('重量不明の食品を100g基準に変更するには重量または100g栄養値が必要です。')
            values = prepare_custom_food(metadata | {'nutrition_basis': 'per_serving',
                'nutrition': per_serving if per_serving is not None else instance.nutrition_per_serving})
            return attrs | values | {'nutrition_basis': metadata['nutrition_basis']}
    values = {key: attrs.get(field, getattr(instance, field, None if key in ('calories', 'protein', 'fat', 'carbohydrates') else 0))
              for key, field in NUTRIENT_FIELDS.items()}
    validate_nutrition(values)
    return attrs | {'nutrition_per_serving': None}


def format_custom_food(food):
    """Myアイテムを登録時の栄養基準でMCPへ返す。"""
    return {
        'item_type': 'custom', 'item_id': food.id, 'name': food.name, 'category': 'Myアイテム',
        'nutrition_basis': food.nutrition_basis, 'serving_size_g': food.serving_size_g,
        'source': food.source, 'source_url': food.source_url,
        'nutrition': serving_nutrition(food) if food.nutrition_basis == 'per_serving' else
            {key: getattr(food, field) for key, field in NUTRIENT_FIELDS.items()},
    }
