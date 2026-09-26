"""食品ソースに依存せずナトリウムmgで計算する。"""
import pytest

from mcp_server import tools
from mcp_server.tools import MealItemInput
from record_app.business_logic.ocr_processor import NutritionExtractor
from record_app.serializers import CafeteriaMenuSerializer


pytestmark = pytest.mark.django_db


def test_学食の食塩相当量をナトリウムmgへ換算する(user, cafeteria_menus, mcp_auth_context, run_async):
    menu = cafeteria_menus[0]
    menu.sodium = 2.54
    menu.save()
    with mcp_auth_context(user):
        result = run_async(tools.draft_meal, '学食', [
            MealItemInput(item_type='cafeteria', item_id=menu.id, amount_grams=100),
        ])
    assert result['total']['sodium'] == 1000
    assert CafeteriaMenuSerializer(menu).data['sodium'] == 1000


@pytest.mark.parametrize('line', ['食塩相当量 2.54g', 'ナトリウム 1000mg', 'Na 1000mg'])
def test_OCRの塩分をナトリウムmgで返す(line):
    assert NutritionExtractor().extract_from_lines([line])['sodium'] == 1000
