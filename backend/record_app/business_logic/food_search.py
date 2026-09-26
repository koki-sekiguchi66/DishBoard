"""食品名の表記ゆれを吸収し、代替候補は別物として案内する。"""
import unicodedata


SPELLING_ALIASES = {'鯖': 'さば', '鮭': 'さけ', '鶏': 'とり', '卵': 'たまご'}
COMPOUND_ALIASES = {'低脂肪牛乳': '加工乳 低脂肪'}
RELATED_QUERIES = {
    '鯖棒寿司': 'しめさば',
    '鯖寿司': 'しめさば',
    'サラダチキン': '若どり むね 皮なし',
    'グラノーラ': 'シリアル',
    'シリアル': 'コーンフレーク',
    'サンドイッチ': 'パン',
    'ベースブレッド': 'パン',
}


def normalize_food_name(value):
    """幅・かな・代表的な漢字表記と区切り記号を正規化する。"""
    value = unicodedata.normalize('NFKC', value).casefold()
    for original, replacement in SPELLING_ALIASES.items():
        value = value.replace(original, replacement)
    value = ''.join(chr(ord(char) - 0x60) if 'ァ' <= char <= 'ヶ' else char for char in value)
    return ''.join(char for char in value if char.isalnum() or char == 'ー')


def search_terms(query):
    """複合語の別名を検索語へ展開する。"""
    normalized = normalize_food_name(query)
    for alias, replacement in COMPOUND_ALIASES.items():
        if normalized == normalize_food_name(alias):
            query = replacement
            break
    return [term for part in query.split() if (term := normalize_food_name(part))]


def related_suggestions(query):
    """商品そのものが無い場合だけ使う、原材料・カテゴリへの検索案。"""
    normalized = normalize_food_name(query)
    return [
        {'query': replacement, 'exact_match': False,
         'note': '別の食品・原材料の参考候補です。栄養値の代用にはせず、商品の表示からMyアイテムを作成してください。'}
        for alias, replacement in RELATED_QUERIES.items()
        if normalize_food_name(alias) == normalized
    ]


def matching_foods(queryset, query):
    """小規模マスタの名前を正規化し、全キーワードが一致する候補を返す。"""
    terms = search_terms(query)
    if not terms:
        return []
    return [food for food in queryset.order_by('name', 'pk')
            if all(term in normalize_food_name(food.name) for term in terms)]
