"""MCPの削除権限とツール注釈を検証する。"""
import pytest

from mcp_server import tools
from mcp_server.errors import NotFoundError, ValidationError, InsufficientScopeError
from mcp_server.server import build_server
from record_app.models import MealRecord


pytestmark = pytest.mark.django_db


def test_削除は本人の確認と書き込み権限を必要とする(user, meal_record, mcp_auth_context, run_async):
    with mcp_auth_context(user):
        with pytest.raises(ValidationError):
            run_async(tools.delete_meal_record, meal_record.id, confirmed=False)
    assert MealRecord.objects.filter(pk=meal_record.id).exists()
    with mcp_auth_context(user, scopes=['meals:read']):
        with pytest.raises(InsufficientScopeError):
            run_async(tools.delete_meal_record, meal_record.id, confirmed=True)
    with mcp_auth_context(user):
        result = run_async(tools.delete_meal_record, meal_record.id, confirmed=True)
    assert result == {'id': meal_record.id, 'deleted': True}
    assert not MealRecord.objects.filter(pk=meal_record.id).exists()


def test_他人の記録を削除できない(other_user, meal_record, mcp_auth_context, run_async):
    with mcp_auth_context(other_user):
        with pytest.raises(NotFoundError):
            run_async(tools.delete_meal_record, meal_record.id, confirmed=True)
    assert MealRecord.objects.filter(pk=meal_record.id).exists()


def test_参照ツールと書き込みツールの注釈を区別する(run_async):
    server = build_server('https://example.com/mcp', 'https://example.com/o')
    registered = {tool.name: tool for tool in run_async(server.list_tools)}
    for name in ('get_meal_record', 'search_foods', 'draft_meal', 'list_meal_records',
                 'get_daily_nutrition', 'get_nutrition_trend', 'suggest_cafeteria_menus', 'draft_custom_food'):
        annotation = registered[name].annotations
        assert annotation.readOnlyHint is True
        assert annotation.destructiveHint is False
        assert annotation.openWorldHint is False
    assert registered['delete_meal_record'].annotations.destructiveHint is True
    assert registered['create_meal_record'].annotations.readOnlyHint is False
    assert registered['create_custom_food'].annotations.readOnlyHint is False
