"""同梱の成分表を使った取り込みの回帰テスト。"""
import csv
from io import StringIO
from pathlib import Path

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from record_app.models import StandardFood


CSV_PATH = Path(__file__).resolve().parents[2] / 'data' / 'standard_foods.csv'
pytestmark = pytest.mark.django_db


def test_同梱CSVの全食品と代表的な栄養値を取り込む():
    call_command('load_standard_foods', str(CSV_PATH), stdout=StringIO())
    with CSV_PATH.open(encoding='utf-8-sig', newline='') as stream:
        rows = [row for row in csv.reader(stream) if len(row) > 3 and row[1].isdigit()]
    assert StandardFood.objects.count() == len(rows)
    assert StandardFood.objects.filter(food_number='01001').exists()
    rice = StandardFood.objects.get(name__contains='水稲めし', name__endswith='精白米\u3000うるち米')
    assert rice.carbs_per_100g == 37.1
    assert rice.fiber_per_100g == 1.5
    assert rice.sodium_per_100g == 1
    assert rice.calcium_per_100g == 3
    assert rice.iron_per_100g == 0.1
    oats = StandardFood.objects.get(name__contains='オートミール')
    assert oats.carbs_per_100g == 69.1
    assert oats.fiber_per_100g == 9.4
    milk = StandardFood.objects.get(name__contains='加工乳', name__endswith='低脂肪')
    assert milk.carbs_per_100g == 5.5
    assert milk.sodium_per_100g == 60
    assert milk.calcium_per_100g == 130
    assert milk.iron_per_100g == 0.1
    fish = StandardFood.objects.get(food_number='10154')
    assert (fish.carbs_per_100g, fish.sodium_per_100g, fish.calcium_per_100g, fish.iron_per_100g) == (0.3, 110, 6, 1.2)
    assert (fish.vitamin_a_per_100g, fish.vitamin_b1_per_100g,
            fish.vitamin_b2_per_100g, fish.vitamin_c_per_100g) == (37, 0.21, 0.31, 1)
    assert StandardFood.objects.get(food_number='11214').vitamin_b2_per_100g == 0.10
    assert StandardFood.objects.get(food_number='11220').vitamin_b2_per_100g == 0.11
    assert StandardFood.objects.filter(vitamin_a_per_100g__gt=0).exists()
    assert StandardFood.objects.filter(carbs_per_100g__gt=0).count() > len(rows) / 2
    original_id = rice.id
    rice.carbs_per_100g = 0
    rice.save()
    call_command('load_standard_foods', str(CSV_PATH), stdout=StringIO())
    rice.refresh_from_db()
    assert rice.id == original_id
    assert rice.carbs_per_100g == 37.1
    assert StandardFood.objects.count() == len(rows)


def test_成分識別子のないCSVは取り込まない(tmp_path):
    path = tmp_path / 'invalid.csv'
    path.write_text('01,01001,1,不正な食品\n', encoding='utf-8')
    with pytest.raises(CommandError):
        call_command('load_standard_foods', str(path))
    assert not StandardFood.objects.exists()


def test_列順が変わっても成分識別子で読み取る(tmp_path):
    with CSV_PATH.open(encoding='utf-8-sig', newline='') as stream:
        rows = list(csv.reader(stream))
    header = rows[11]
    rice = next(row for row in rows[12:] if row[1] == '01088')
    for row in (header, rice):
        row[20], row[21] = row[21], row[20]
    path = tmp_path / 'reordered.csv'
    with path.open('w', encoding='utf-8-sig', newline='') as stream:
        csv.writer(stream).writerows([header, rice])
    call_command('load_standard_foods', str(path), stdout=StringIO())
    assert StandardFood.objects.get(food_number='01088').carbs_per_100g == 37.1


def test_不正行があれば途中の食品も保存しない(tmp_path):
    with CSV_PATH.open(encoding='utf-8-sig', newline='') as stream:
        rows = list(csv.reader(stream))
    invalid = rows[13].copy()
    invalid[20] = 'NaN'
    path = tmp_path / 'invalid-row.csv'
    with path.open('w', encoding='utf-8', newline='') as stream:
        csv.writer(stream).writerows([rows[11], rows[12], invalid])
    with pytest.raises(CommandError):
        call_command('load_standard_foods', str(path))
    assert not StandardFood.objects.exists()
