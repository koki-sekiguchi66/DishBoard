"""表記ゆれと検索対象の絞り込みを検証する。"""
import pytest

from mcp_server import tools
from record_app.models import CafeteriaMenu, StandardFood


pytestmark = pytest.mark.django_db


@pytest.mark.parametrize('query', ['鯖', 'サバ', 'ｻﾊﾞ'])
def test_かなと漢字と半角の表記ゆれを検索できる(user, mcp_auth_context, run_async, query):
    food = StandardFood.objects.create(
        food_number='TEST1', name='＜魚類＞　（さば類）　まさば　生', category='魚',
        calories_per_100g=211, protein_per_100g=20.6, fat_per_100g=16.8, carbs_per_100g=0.3,
    )
    with mcp_auth_context(user):
        result = run_async(tools.search_foods, query)
    assert result['foods'][0]['item_id'] == food.id


def test_低脂肪牛乳を複合語で検索できる(user, mcp_auth_context, run_async):
    food = StandardFood.objects.create(
        food_number='TEST2', name='＜牛乳及び乳製品＞　加工乳　低脂肪', category='乳',
        calories_per_100g=42, protein_per_100g=3.8, fat_per_100g=1, carbs_per_100g=5.5,
    )
    with mcp_auth_context(user):
        result = run_async(tools.search_foods, '低脂肪牛乳')
    assert result['foods'][0]['item_id'] == food.id


def test_同一学食メニューを統合して食堂で絞り込める(user, mcp_auth_context, run_async):
    for site in ['rune', 'hokubu', 'chuo']:
        CafeteriaMenu.objects.create(
            cafeteria=site, menu_id='SAME', name='カツカレー', category='rice',
            calories=800, protein=20, fat=25, carbohydrates=100,
        )
    with mcp_auth_context(user):
        result = run_async(tools.search_foods, 'カツ', item_types=['cafeteria'])
        filtered = run_async(tools.search_foods, 'カツ', cafeteria='chuo')
        excluded = run_async(tools.search_foods, 'カツ', item_types=['custom'])
    assert result['count'] == 1
    assert len(result['foods'][0]['cafeterias']) == 3
    assert filtered['count'] == 1
    assert filtered['foods'][0]['cafeterias'][0]['code'] == 'chuo'
    assert excluded['foods'] == []


def test_調理品を原材料と同一食品にしない(user, mcp_auth_context, run_async):
    StandardFood.objects.create(
        food_number='TEST3', name='若どり　むね　皮なし　生', category='肉',
        calories_per_100g=105, protein_per_100g=23.3, fat_per_100g=1.9, carbs_per_100g=0.1,
    )
    with mcp_auth_context(user):
        result = run_async(tools.search_foods, 'サラダチキン')
    assert result['foods'] == []
    assert result['suggestions'][0]['query'] == '若どり むね 皮なし'
    assert result['suggestions'][0]['exact_match'] is False
