import csv
import math

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from record_app.models import StandardFood


NUTRIENT_CODES = {
    'calories_per_100g': 'ENERC_KCAL',
    'protein_per_100g': 'PROT-',
    'fat_per_100g': 'FAT-',
    'carbs_per_100g': 'CHOCDF-',
    'fiber_per_100g': 'FIB-',
    'sodium_per_100g': 'NA',
    'calcium_per_100g': 'CA',
    'iron_per_100g': 'FE',
    'vitamin_a_per_100g': 'VITA_RAE',
    'vitamin_b1_per_100g': 'THIA',
    'vitamin_b2_per_100g': 'RIBF',
    'vitamin_c_per_100g': 'VITC',
}
MISSING_VALUES = {'Tr', '-', '–', '—', '*', ''}


def clean_value(value):
    """成分表の欠測・微量・推定値表記を数値化する。"""
    value = value.strip().replace('†', '').removeprefix('(').removesuffix(')')
    if value in MISSING_VALUES:
        return 0.0
    number = float(value)
    if not math.isfinite(number) or number < 0:
        raise ValueError('栄養値は有限の非負数である必要があります')
    return number


class Command(BaseCommand):
    """成分識別子を検証して標準食品マスタを冪等に更新する。"""

    help = '文科省食品標準成分表CSVの成分識別子に基づいて食品データを投入します'

    def add_arguments(self, parser):
        parser.add_argument('file_path', type=str, help='取り込むCSVファイル')

    @transaction.atomic
    def handle(self, *args, **options):
        with open(options['file_path'], encoding='utf-8-sig', newline='') as stream:
            reader = csv.reader(stream)
            for header in reader:
                if '成分識別子' in header:
                    break
            else:
                raise CommandError('成分識別子のヘッダーがありません。')
            codes = [value.strip() for value in header]
            if any(codes.count(code) != 1 for code in NUTRIENT_CODES.values()):
                raise CommandError('必要な成分識別子が欠落または重複しています。')
            columns = {field: codes.index(code) for field, code in NUTRIENT_CODES.items()}
            count = 0
            for row in reader:
                if not any(value.strip() for value in row):
                    continue
                try:
                    if not row[1].isdigit() or not row[3].strip():
                        raise ValueError('食品番号または食品名が不正です')
                    values = {field: clean_value(row[index]) for field, index in columns.items()}
                    StandardFood.objects.update_or_create(
                        food_number=row[1],
                        defaults={'category': row[0], 'name': row[3], **values},
                    )
                except (IndexError, ValueError) as error:
                    raise CommandError(f'CSVの{reader.line_num}行目が不正です: {error}') from error
                count += 1
            if not count:
                raise CommandError('食品データがありません。')
        self.stdout.write(self.style.SUCCESS(f'{count}件 食品情報を登録しました。'))
