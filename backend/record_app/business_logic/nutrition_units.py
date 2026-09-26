"""栄養値の境界で行う単位変換。"""

SALT_TO_SODIUM_RATIO = 2.54
MILLIGRAMS_PER_GRAM = 1000


def salt_grams_to_sodium_mg(salt_grams):
    """食塩相当量gをナトリウムmgへ換算する。"""
    return salt_grams * MILLIGRAMS_PER_GRAM / SALT_TO_SODIUM_RATIO
