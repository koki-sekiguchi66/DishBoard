"""Myアイテムの下書き・出典・1食分指定の回帰テスト。"""
import pytest
from django.core import signing

from mcp_server import tools
from mcp_server.errors import ValidationError, InsufficientScopeError
from record_app.models import CustomFood


pytestmark = pytest.mark.django_db


def food_input(**overrides):
    data = {
        'name': 'テストプロテイン', 'nutrition_basis': 'per_serving', 'serving_size_g': 28,
        'source': 'url', 'source_url': 'https://example.com/nutrition',
        'nutrition': {'calories': 117, 'protein': 20.7, 'fat': 1.8, 'carbohydrates': 4.6},
    }
    return tools.CustomFoodInput(**(data | overrides))


def test_下書きは保存せず確認後に未検証で作成する(user, mcp_auth_context, run_async):
    with mcp_auth_context(user):
        draft = run_async(tools.draft_custom_food, food_input())
        assert draft['saved'] is False
        assert not CustomFood.objects.exists()
        with pytest.raises(ValidationError):
            run_async(tools.create_custom_food, draft['draft_token'])
        result = run_async(tools.create_custom_food, draft['draft_token'], confirmed=True)
        search = run_async(tools.search_foods, 'テストプロテイン')
        meal = run_async(tools.draft_meal, '2杯', [
            tools.MealItemInput(item_type='custom', item_id=result['item_id'], servings=2),
        ])
        grams = run_async(tools.draft_meal, '56g', [
            tools.MealItemInput(item_type='custom', item_id=result['item_id'], amount_grams=56),
        ])
    food = CustomFood.objects.get()
    assert food.calories_per_100g == pytest.approx(117 * 100 / 28)
    assert food.is_verified is False
    assert food.source_url == 'https://example.com/nutrition'
    assert search['foods'][0]['nutrition_basis'] == 'per_serving'
    assert search['foods'][0]['nutrition']['calories'] == pytest.approx(117)
    assert meal['total']['calories'] == 234
    assert meal['items'][0]['amount_grams'] == 56
    assert meal['total'] == grams['total']


def test_別ユーザーの下書きと改ざんを拒否する(user, other_user, mcp_auth_context, run_async):
    with mcp_auth_context(user):
        draft = run_async(tools.draft_custom_food, food_input())
        with pytest.raises(ValidationError):
            run_async(tools.create_custom_food, draft['draft_token'] + 'broken', confirmed=True)
    with mcp_auth_context(other_user):
        with pytest.raises(ValidationError):
            run_async(tools.create_custom_food, draft['draft_token'], confirmed=True)
    assert not CustomFood.objects.exists()


def test_下書きは読み取り権限で作れるが作成は書き込み権限を要求する(user, mcp_auth_context, run_async):
    with mcp_auth_context(user, scopes=['meals:read']):
        draft = run_async(tools.draft_custom_food, food_input(source='manual', source_url=''))
        with pytest.raises(InsufficientScopeError):
            run_async(tools.create_custom_food, draft['draft_token'], confirmed=True)


def test_期限切れの下書きを拒否する(user, mcp_auth_context, run_async, monkeypatch):
    with mcp_auth_context(user):
        draft = run_async(tools.draft_custom_food, food_input())
        monkeypatch.setattr(signing.time, 'time', lambda: 9999999999)
        with pytest.raises(ValidationError):
            run_async(tools.create_custom_food, draft['draft_token'], confirmed=True)
    assert not CustomFood.objects.exists()


@pytest.mark.parametrize('overrides', [
    {'source': 'url', 'source_url': ''},
    {'source': 'url', 'source_url': 'javascript:alert(1)'},
    {'serving_size_g': None},
])
def test_出典と1食分重量を検証する(user, mcp_auth_context, run_async, overrides):
    with mcp_auth_context(user):
        with pytest.raises(ValidationError):
            run_async(tools.draft_custom_food, food_input(**overrides))


def test_同名食品を上書きしない(user, mcp_auth_context, run_async):
    with mcp_auth_context(user):
        draft = run_async(tools.draft_custom_food, food_input())
        run_async(tools.create_custom_food, draft['draft_token'], confirmed=True)
        with pytest.raises(ValidationError):
            run_async(tools.create_custom_food, draft['draft_token'], confirmed=True)
    assert CustomFood.objects.count() == 1


def test_食数と重量の同時指定を拒否する(user, custom_food, mcp_auth_context, run_async):
    with mcp_auth_context(user):
        with pytest.raises(ValidationError):
            run_async(tools.draft_meal, '不正', [tools.MealItemInput(
                item_type='custom', item_id=custom_food.id, amount_grams=100, servings=2,
            )])


@pytest.mark.parametrize('servings', [0, -1, float('nan'), float('inf'), 101])
def test_不正な食数を拒否する(user, custom_food, mcp_auth_context, run_async, servings):
    with mcp_auth_context(user):
        with pytest.raises(ValidationError):
            run_async(tools.draft_meal, '不正', [tools.MealItemInput(
                item_type='custom', item_id=custom_food.id, servings=servings,
            )])


def test_食数指定を実重量で食事記録に保存する(user, mcp_auth_context, run_async):
    with mcp_auth_context(user):
        draft = run_async(tools.draft_custom_food, food_input())
        food = run_async(tools.create_custom_food, draft['draft_token'], confirmed=True)
        meal = run_async(tools.create_meal_record, '2026-09-26', 'snack', 'プロテイン', [
            tools.MealItemInput(item_type='custom', item_id=food['item_id'], servings=2),
        ])
        detail = run_async(tools.get_meal_record, meal['id'])
    assert detail['items'][0]['amount_grams'] == 56
    assert detail['total']['calories'] == 234


def test_Webで変更した栄養値は再確認が必要になる(custom_food, authenticated_client):
    custom_food.is_verified = True
    custom_food.save()
    response = authenticated_client.patch(f'/api/foods/custom/{custom_food.pk}/', {
        'calories_per_100g': 250,
    })
    assert response.status_code == 200
    assert response.data['is_verified'] is False


def test_Webで出典と1食分重量を確認できる(custom_food, authenticated_client, other_authenticated_client):
    path = f'/api/foods/custom/{custom_food.pk}/'
    response = authenticated_client.patch(path, {
        'nutrition_basis': 'per_serving', 'serving_size_g': 28,
        'source': 'url', 'source_url': 'https://example.com/nutrition', 'is_verified': True,
    })
    assert response.status_code == 200
    assert response.data['is_verified'] is True
    assert response.data['serving_size_g'] == 28
    assert other_authenticated_client.get(path).status_code == 404
    assert other_authenticated_client.patch(path, {'is_verified': False}).status_code == 404
