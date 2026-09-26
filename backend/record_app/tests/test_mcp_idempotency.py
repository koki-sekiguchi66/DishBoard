"""食事作成の再送・同時実行・利用者分離を検証する。"""
from uuid import uuid4

import pytest

from mcp_server import tools
from mcp_server.errors import ValidationError
from mcp_server.rate_limit import reset_rate_limit
from record_app.models import MealRecord


pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def clear_rate_limit():
    reset_rate_limit()
    yield
    reset_rate_limit()


def create(run_async, food_id, key, name='ごはん'):
    return run_async(tools.create_meal_record, '2026-09-26', 'lunch', name, [
        tools.MealItemInput(item_type='standard', item_id=food_id, amount_grams=100),
    ], idempotency_key=key)


def test_同一キーの再送は食品マスタ更新後も同じ記録を返す(user, standard_foods, mcp_auth_context, run_async):
    key = str(uuid4())
    food = standard_foods[0]
    with mcp_auth_context(user):
        first = create(run_async, food.id, key)
        food.calories_per_100g += 100
        food.save()
        second = create(run_async, food.id, key)
    assert second == first
    assert MealRecord.objects.count() == 1


def test_キーの内容変更と削除後の再利用を拒否する(user, standard_foods, mcp_auth_context, run_async):
    key = str(uuid4())
    with mcp_auth_context(user):
        first = create(run_async, standard_foods[0].id, key)
        with pytest.raises(ValidationError):
            create(run_async, standard_foods[0].id, key, '変更')
        run_async(tools.delete_meal_record, first['id'], confirmed=True)
        with pytest.raises(ValidationError):
            create(run_async, standard_foods[0].id, key)
    assert not MealRecord.objects.exists()


def test_同じキーでも利用者が異なれば別の記録を作る(user, other_user, standard_foods, mcp_auth_context, run_async):
    key = str(uuid4())
    with mcp_auth_context(user):
        first = create(run_async, standard_foods[0].id, key)
    with mcp_auth_context(other_user):
        second = create(run_async, standard_foods[0].id, key)
    assert first['id'] != second['id']


def test_UUIDでないキーを拒否する(user, standard_foods, mcp_auth_context, run_async):
    with mcp_auth_context(user):
        with pytest.raises(ValidationError):
            create(run_async, standard_foods[0].id, 'invalid')
    assert not MealRecord.objects.exists()


@pytest.mark.django_db(transaction=True)
def test_同時に再送しても1件だけ作成する(user, standard_foods):
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier
    from django.db import connections
    from datetime import date

    key = uuid4()
    barrier = Barrier(2)

    def send():
        try:
            barrier.wait(timeout=10)
            return tools._create_meal_record_sync(user, date(2026, 9, 26), 'lunch', 'ごはん', [
                tools.MealItemInput(item_type='standard', item_id=standard_foods[0].id, amount_grams=100),
            ], key)
        finally:
            connections.close_all()

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(lambda _: send(), range(2)))
    assert results[0] == results[1]
    assert MealRecord.objects.count() == 1


def test_失敗時に記録とキーを両方ロールバックする(user):
    from record_app.models import MealCreationRequest
    from record_app.services import MealService

    def fail_after_create():
        MealRecord.objects.create(user=user, meal_timing='lunch', meal_name='失敗')
        raise ValueError('作成失敗')

    with pytest.raises(ValueError):
        MealService.create_idempotently(user, uuid4(), {'name': '失敗'}, fail_after_create)
    assert not MealRecord.objects.exists()
    assert not MealCreationRequest.objects.exists()
