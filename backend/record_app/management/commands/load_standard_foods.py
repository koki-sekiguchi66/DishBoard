import csv
from django.core.management.base import BaseCommand
from record_app.models import StandardFood

class Command(BaseCommand):
    help = '文科省食品標準成分表のCSVファイルから食品データを投入します'

    def add_arguments(self, parser):
        parser.add_argument('file_path', type=str, help='The path to the CSV file to import.')

    def handle(self, *args, **options):
        file_path = options['file_path']

        def clean_value(value):
            """
            '(Tr)', '-', 'Tr', '*', '' などを0.0に変換する。
            括弧も取り除く。
            """
            if isinstance(value, str):
                value = value.strip()
                if value in ('(Tr)', '-', 'Tr', '*', ''):
                    return 0.0
                value = value.replace('(', '').replace(')', '')
            try:
                return float(value)
            except (ValueError, TypeError):
                return 0.0


        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            # ヘッダーを13行読み飛ばす
            for _ in range(13):
                next(reader)
            
            count = 0
            for row in reader: 
                food_number = row[1]
                StandardFood.objects.update_or_create(
                    food_number=food_number,
                    defaults={
                        'category': row[0],
                        'name': row[3],
                        'calories_per_100g': clean_value(row[6]),
                        'protein_per_100g': clean_value(row[9]),
                        'fat_per_100g': clean_value(row[12]),
                        'carbs_per_100g': clean_value(row[21]),
                        'fiber_per_100g': clean_value(row[19]),
                        'sodium_per_100g': clean_value(row[24]),
                        'calcium_per_100g': clean_value(row[26]),
                        'iron_per_100g': clean_value(row[29]),
                        'vitamin_a_per_100g': clean_value(row[40]),
                        'vitamin_b1_per_100g': clean_value(row[47]),
                        'vitamin_b2_per_100g': clean_value(row[48]),
                        'vitamin_c_per_100g': clean_value(row[55]),
                    }
                )
                count += 1

        self.stdout.write(self.style.SUCCESS(f'{count}件 食品情報を登録しました。'))