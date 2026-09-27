"""重量不明の1食分食品を推定重量なしで記録する。"""
import json
import uuid
import pytest

from mcp_server import tools
from mcp_server.errors import ValidationError, InsufficientScopeError
from record_app.models import CustomFood, MealRecord

pytestmark = pytest.mark.django_db


def sandwich():
    return tools.CustomFoodInput(name='重量不明サンド', nutrition_basis='per_serving', source='manual',
                                 nutrition={'calories': 250, 'protein': 10, 'fat': 12, 'carbohydrates': 26})


def test_重量なしで直接登録し食数だけで記録する(user, mcp_auth_context, run_async, authenticated_client):
    with mcp_auth_context(user):
        result = run_async(tools.create_custom_food, food=sandwich())
        assert result['serving_size_g'] is None
        assert 'is_verified' not in result
        food = CustomFood.objects.get(pk=result['item_id'])
        assert food.calories_per_100g is None
        assert food.nutrition_per_serving['calories'] == 250
        search = run_async(tools.search_foods, '重量不明サンド')
        assert search['foods'][0]['nutrition']['calories'] == 250
        items = [tools.MealItemInput(item_type='custom', item_id=food.id, servings=1.5)]
        meal = run_async(tools.create_meal_record, '2026-09-27', 'lunch', 'サンド', items)
        assert meal['total']['calories'] == 375
        assert meal['items'][0]['amount_grams'] is None
        assert meal['items'][0]['servings'] == 1.5
        with pytest.raises(ValidationError, match='重量'):
            run_async(tools.draft_meal, '不可', [tools.MealItemInput(
                item_type='custom', item_id=food.id, amount_grams=100)])
    response = authenticated_client.post('/api/foods/calculate/', {'food_id': f'custom_{food.id}', 'amount': 100})
    assert response.status_code == 400
    assert authenticated_client.get(f'/api/meal-records/{meal["id"]}/').data['items'][0]['servings'] == 1.5


def test_重量の追加と削除で1食分の栄養値を保持する(user, mcp_auth_context, run_async, authenticated_client):
    with mcp_auth_context(user):
        food = run_async(tools.create_custom_food, food=sandwich())
    path = f'/api/foods/custom/{food["item_id"]}/'
    response = authenticated_client.patch(path, {'serving_size_g': 125}, format='json')
    assert response.status_code == 200, response.data
    assert response.data['calories_per_100g'] == 200
    response = authenticated_client.patch(path, {'serving_size_g': None}, format='json')
    assert response.status_code == 200, response.data
    assert response.data['calories_per_100g'] is None
    assert response.data['nutrition_per_serving']['calories'] == 250
    assert authenticated_client.patch(path, {'nutrition_basis': 'per_100g'}, format='json').status_code == 400


def test_Webでも1食分の食品とスナップショットを保存して再利用できる(authenticated_client, other_authenticated_client):
    food = authenticated_client.post('/api/foods/custom/', sandwich().model_dump(), format='json')
    assert food.status_code == 201, food.data
    assert other_authenticated_client.get(f'/api/foods/custom/{food.data["id"]}/').status_code == 404
    item = {'item_type': 'custom', 'item_id': food.data['id'], 'item_name': 'サンド',
            'amount_grams': None, 'servings': 2, 'calories': 500, 'protein': 20, 'fat': 24, 'carbohydrates': 52}
    menu = authenticated_client.post('/api/custom-menus/', {'name': '昼', 'items': [item]}, format='json')
    assert menu.status_code == 201, menu.data
    meal = authenticated_client.post(f'/api/custom-menus/{menu.data["id"]}/create_meal_from_menu/',
                                     {'multiplier': 0.5}, format='json')
    assert meal.status_code == 201, meal.data
    record = MealRecord.objects.get()
    assert record.items.get().amount_grams is None
    assert record.items.get().servings == 1
    assert record.calories == 250


def test_直接作成にも書き込み権限が必要(user, mcp_auth_context, run_async):
    with mcp_auth_context(user, scopes=['meals:read']):
        with pytest.raises(InsufficientScopeError):
            run_async(tools.create_custom_food, food=sandwich())
    assert not CustomFood.objects.exists()


def test_重量不明の記録も再送と編集で食数を保持する(user, mcp_auth_context, run_async):
    with mcp_auth_context(user):
        food = run_async(tools.create_custom_food, food=sandwich())
        items = [tools.MealItemInput(item_type='custom', item_id=food['item_id'], servings=1)]
        key = str(uuid.uuid4())
        original = run_async(tools.create_meal_record, '2026-09-27', 'lunch', 'サンド', items, idempotency_key=key)
        repeated = run_async(tools.create_meal_record, '2026-09-27', 'lunch', 'サンド', items, idempotency_key=key)
        assert repeated['id'] == original['id']
        updated = run_async(tools.update_meal_record, original['id'], '2026-09-27', 'lunch', 'サンド',
                            [items[0].model_copy(update={'servings': 0.5})])
        assert updated['items'][0]['amount_grams'] is None
        assert updated['items'][0]['servings'] == 0.5
        assert updated['total']['calories'] == 125
    assert MealRecord.objects.count() == 1


@pytest.mark.parametrize('servings', [None, 0, -1])
def test_重量不明のWeb明細には正の食数が必要(authenticated_client, servings):
    response = authenticated_client.post('/api/custom-menus/', {'name': '不正', 'items': [{
        'item_type': 'custom', 'item_id': 1, 'item_name': 'サンド',
        'amount_grams': None, 'servings': servings,
        **sandwich().nutrition.model_dump(),
    }]}, format='json')
    assert response.status_code == 400
    assert 'servings' in str(response.data)


def test_Web応答の保存形式を再送しても重量を補わない(authenticated_client):
    created = authenticated_client.post('/api/foods/custom/', sandwich().model_dump(), format='json')
    response = authenticated_client.put(f'/api/foods/custom/{created.data["id"]}/', created.data, format='json')
    assert response.status_code == 200, response.data
    assert response.data['calories_per_100g'] is None
    assert response.data['nutrition_per_serving']['calories'] == 250


@pytest.mark.parametrize('nutrition', [
    {'calories': 250},
    {'calories': -1, 'protein': 1, 'fat': 1, 'carbohydrates': 1},
    {'calories': float('inf'), 'protein': 1, 'fat': 1, 'carbohydrates': 1},
])
def test_Webの1食分栄養値も検証する(authenticated_client, nutrition):
    payload = sandwich().model_dump() | {'nutrition': nutrition}
    response = authenticated_client.post('/api/foods/custom/', json.dumps(payload), content_type='application/json')
    assert response.status_code == 400
