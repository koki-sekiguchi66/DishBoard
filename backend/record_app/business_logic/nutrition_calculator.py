from django.db import connection
from django.db.models import Q, Sum
from django.contrib.postgres.search import TrigramSimilarity
from ..models import StandardFood, CustomFood
from .nutrition_units import salt_grams_to_sodium_mg

# トリグラム類似度の足切り閾値。意図的に緩い（ランキングではなく候補の粗い絞り込み）。
# 精度は後段のキーワード部分一致で担保している。ここだけを見て厳しくしないこと。
TRIGRAM_SIMILARITY_THRESHOLD = 0.08


class NutritionCalculatorService:

    @staticmethod
    def _standard_food_candidates(query, keyword_filter):
        """本番はpg_trgm、SQLiteのローカルテストは部分一致で候補を返す。

        SQLiteへ本番検索を移植する意図はない。開発設定がDB未指定時にSQLiteへ
        フォールバックするため、PostgreSQL固有関数で全テストが停止しないようにする。
        """
        if connection.vendor != 'postgresql':
            return StandardFood.objects.filter(keyword_filter).order_by('name')
        return (
            StandardFood.objects.annotate(similarity=TrigramSimilarity('name', query))
            .filter(similarity__gt=TRIGRAM_SIMILARITY_THRESHOLD)
            .filter(keyword_filter)
            .order_by('-similarity')
        )
    
    def search_foods(self, query):
        """食品名であいまい検索する。

        トリグラム類似度で粗く候補を絞ってから、キーワードの部分一致で確定する2段構え。
        1段目の閾値は足切りであってランキングではないため、意図的に緩くしている。
        """        
        if not query:
            return []
        
        results = []
        keywords = query.split()
        final_query = Q()
        for keyword in keywords:
            final_query &= Q(name__icontains=keyword)
        
        standard_foods = (
            self._standard_food_candidates(query, final_query)
        )[:10]
        
        for food in standard_foods:
            results.append({
                'id': f'standard_{food.id}',
                'name': food.name,
                'category': food.category,
                'type': 'standard',
                'nutrition': self._get_nutrition_per_100g(food)
            })
        
        
        
        return results
    
    def get_food_suggestions(self, query, limit=5):
        """食品名の候補を取得（オートコンプリート用）"""
        suggestions = []
        
        standard_foods = StandardFood.objects.filter(
            name__icontains=query
        ).values('name').distinct()[:limit]
        
        for food in standard_foods:
            suggestions.append(food['name'])
        
        return suggestions
    
    def _get_nutrition_per_100g(self, food):
        """StandardFood / CustomFood の共通形式で 100g あたりの栄養素を返す。"""
        return {
            'calories': food.calories_per_100g,
            'protein': food.protein_per_100g,
            'fat': food.fat_per_100g,
            'carbohydrates': food.carbs_per_100g,
            'dietary_fiber': food.fiber_per_100g,
            'sodium': food.sodium_per_100g,
            'calcium': food.calcium_per_100g,
            'iron': food.iron_per_100g,
            'vitamin_a': food.vitamin_a_per_100g,
            'vitamin_b1': food.vitamin_b1_per_100g,
            'vitamin_b2': food.vitamin_b2_per_100g,
            'vitamin_c': food.vitamin_c_per_100g,
        }
    
    def calculate_nutrition_for_amount(self, user, food_id, amount_grams):
        """指定された量の栄養素を計算

        Myアイテム（custom）は**必ず user で絞る**。
        food_id は呼び出し元から渡される任意の値であり、絞らないと
        他ユーザーの Myアイテムの栄養値を読み出せてしまう。
        標準食品は全ユーザー共通のマスタなので絞り込みの対象外。
        """
        try:
            food_type, food_pk = food_id.split('_', 1)

            if food_type == 'standard':
                food = StandardFood.objects.get(pk=food_pk)
            elif food_type == 'custom':
                food = CustomFood.objects.get(pk=food_pk, user=user)
            else:
                raise ValueError(f"不正な食品タイプ: {food_type}")
            
            nutrition_per_100g = self._get_nutrition_per_100g(food)
            multiplier = amount_grams / 100
            
            calculated_nutrition = {}
            for nutrient, value_per_100g in nutrition_per_100g.items():
                calculated_nutrition[nutrient] = round(value_per_100g * multiplier, 2)
            
            return calculated_nutrition
            
        except (ValueError, StandardFood.DoesNotExist, CustomFood.DoesNotExist) as e:
            raise ValueError(f"栄養素計算エラー: {str(e)}")
    
    def get_daily_nutrition_summary(self, user, target_date):
        """指定日の栄養素合計を計算"""
        from ..models import MealRecord
        
        meals = MealRecord.objects.filter(
            user=user,
            record_date=target_date
        )
        
        daily_total = {
            'calories': 0,
            'protein': 0,
            'fat': 0,
            'carbohydrates': 0,
            'dietary_fiber': 0,
            'sodium': 0,
            'calcium': 0,
            'iron': 0,
            'vitamin_a': 0,
            'vitamin_b1': 0,
            'vitamin_b2': 0,
            'vitamin_c': 0,
        }
        
        for meal in meals:
            daily_total['calories'] += meal.calories
            daily_total['protein'] += meal.protein
            daily_total['fat'] += meal.fat
            daily_total['carbohydrates'] += meal.carbohydrates
            daily_total['dietary_fiber'] += meal.dietary_fiber
            daily_total['sodium'] += meal.sodium
            daily_total['calcium'] += meal.calcium
            daily_total['iron'] += meal.iron
            daily_total['vitamin_a'] += meal.vitamin_a
            daily_total['vitamin_b1'] += meal.vitamin_b1
            daily_total['vitamin_b2'] += meal.vitamin_b2
            daily_total['vitamin_c'] += meal.vitamin_c
        
        for key in daily_total:
            daily_total[key] = round(daily_total[key], 2)
        
        return daily_total
    
    def create_custom_food(self, user, food_data):
        """ユーザーカスタム食品を作成"""
        custom_food = CustomFood.objects.create(
            user=user,
            name=food_data['name'],
            calories_per_100g=food_data['calories_per_100g'],
            protein_per_100g=food_data['protein_per_100g'],
            fat_per_100g=food_data['fat_per_100g'],
            carbs_per_100g=food_data['carbs_per_100g'],
            fiber_per_100g=food_data.get('fiber_per_100g', 0),
            sodium_per_100g=food_data.get('sodium_per_100g', 0),
            calcium_per_100g=food_data.get('calcium_per_100g', 0),
            iron_per_100g=food_data.get('iron_per_100g', 0),
            vitamin_a_per_100g=food_data.get('vitamin_a_per_100g', 0),
            vitamin_b1_per_100g=food_data.get('vitamin_b1_per_100g', 0),
            vitamin_b2_per_100g=food_data.get('vitamin_b2_per_100g', 0),
            vitamin_c_per_100g=food_data.get('vitamin_c_per_100g', 0),
        )
        return custom_food

    # =========================================================================
    # MCP（Claude）向けの拡張
    #
    # 既存メソッドは Web UI の /api/ が使っているため変更しない。
    # MCP はユーザー単位の絞り込みと食堂メニューへの対応が必要なため、
    # 別メソッドとして追加する。
    # =========================================================================

    def search_foods_across_sources(self, user, query, limit, item_types=None, cafeteria=None):
        """標準食品・Myアイテム・食堂メニューを横断してあいまい検索する。

        既存の search_foods() は標準食品しか見ず、user 引数も持たないため
        MCP からは使えない（Myアイテムはユーザーごとに分離する必要がある）。

        栄養値の意味が供給元で異なる点に注意:
          - 標準食品 / Myアイテム: 100g あたりの値
          - 食堂メニュー: **1食ぶんの実数値**（100g あたりではない）
        呼び出し側が取り違えないよう nutrition_basis を必ず添える。
        """
        if not query:
            return []

        keyword_filter = Q()
        for keyword in query.split():
            keyword_filter &= Q(name__icontains=keyword)

        from itertools import zip_longest
        from .food_search import matching_foods
        from ..models import CafeteriaMenu

        sources = set(item_types if item_types is not None else ('standard', 'custom', 'cafeteria'))
        groups = []
        if 'standard' in sources:
            ranked = list(self._standard_food_candidates(query, keyword_filter)[:limit])
            seen = {food.pk for food in ranked}
            ranked.extend(food for food in matching_foods(StandardFood.objects.all(), query)
                          if food.pk not in seen)
            groups.append([self._format_food(food, 'standard') for food in ranked[:limit]])
        if 'custom' in sources:
            foods = matching_foods(CustomFood.objects.filter(user=user), query)
            groups.append([self._format_food(food, 'custom') for food in foods[:limit]])
        if 'cafeteria' in sources:
            menus = CafeteriaMenu.objects.all()
            if cafeteria:
                menus = menus.filter(cafeteria=cafeteria)
            grouped = {}
            for menu in matching_foods(menus, query):
                nutrition = self._get_nutrition_of_serving(menu)
                key = (menu.menu_id, menu.name, tuple(nutrition.items()))
                if key not in grouped:
                    grouped[key] = {
                        'item_type': 'cafeteria', 'item_id': menu.id, 'name': menu.name,
                        'category': menu.category_label or menu.get_category_display(),
                        'nutrition_basis': 'per_serving', 'nutrition': nutrition,
                        'cafeterias': [],
                    }
                grouped[key]['cafeterias'].append({
                    'code': menu.cafeteria, 'name': menu.get_cafeteria_display(), 'item_id': menu.id,
                })
            groups.append(list(grouped.values())[:limit])
        return [food for group in zip_longest(*groups) for food in group if food is not None][:limit]

    def _format_food(self, food, item_type):
        """標準食品と利用者の食品をMCP検索結果へ変換する。"""
        return {
            'item_type': item_type, 'item_id': food.id, 'name': food.name,
            'category': food.category if item_type == 'standard' else 'Myアイテム',
            'nutrition_basis': 'per_100g', 'nutrition': self._get_nutrition_per_100g(food),
        }

    def _search_standard_foods(self, query, keyword_filter, limit):
        """標準食品をトリグラム類似度 + キーワード一致で検索する。"""
        foods = self._standard_food_candidates(query, keyword_filter)[:limit]

        return [
            {
                'item_type': 'standard',
                'item_id': food.id,
                'name': food.name,
                'category': food.category,
                'nutrition_basis': 'per_100g',
                'nutrition': self._get_nutrition_per_100g(food),
            }
            for food in foods
        ]

    def _search_custom_foods(self, user, keyword_filter, limit):
        """Myアイテムを検索する。**必ずそのユーザーのものだけ**を返す。

        pg_trgm の GIN インデックスは StandardFood.name にしか張られていない。
        Myアイテムは1人あたり数十件の規模なので部分一致で十分。
        """
        foods = CustomFood.objects.filter(user=user).filter(keyword_filter).order_by('name')[:limit]

        return [
            {
                'item_type': 'custom',
                'item_id': food.id,
                'name': food.name,
                'category': 'Myアイテム',
                'nutrition_basis': 'per_100g',
                'nutrition': self._get_nutrition_per_100g(food),
            }
            for food in foods
        ]

    def _search_cafeteria_menus(self, keyword_filter, limit):
        """食堂メニューを検索する。全ユーザー共通のマスタなので絞り込みは不要。"""
        from ..models import CafeteriaMenu

        menus = CafeteriaMenu.objects.filter(keyword_filter).order_by('name')[:limit]

        return [
            {
                'item_type': 'cafeteria',
                'item_id': menu.id,
                'name': menu.name,
                # 同じ料理を複数の食堂が出すため、どの食堂かまで示さないと選べない
                'category': f'{menu.get_cafeteria_display()} / {menu.category_label or menu.get_category_display()}',
                'nutrition_basis': 'per_serving',
                'nutrition': self._get_nutrition_of_serving(menu),
            }
            for menu in menus
        ]

    def _get_nutrition_of_serving(self, menu):
        """食堂メニューの1食ぶんの栄養素を共通形式で返す。

        CafeteriaMenu は 100g あたりではなく提供1食ぶんの実数値を持つ。
        食塩相当量gだけは記録側のナトリウムmgへ換算する。
        """
        return {
            'calories': menu.calories,
            'protein': menu.protein,
            'fat': menu.fat,
            'carbohydrates': menu.carbohydrates,
            'dietary_fiber': menu.dietary_fiber,
            'sodium': salt_grams_to_sodium_mg(menu.sodium),
            'calcium': menu.calcium,
            'iron': menu.iron,
            'vitamin_a': menu.vitamin_a,
            'vitamin_b1': menu.vitamin_b1,
            'vitamin_b2': menu.vitamin_b2,
            'vitamin_c': menu.vitamin_c,
        }

    def resolve_item(self, user, item_type, item_id, amount_grams, round_digits):
        """明細1件を解決し、食品名と計算済みの栄養素を返す。

        既存の calculate_nutrition_for_amount() は
          - 食堂メニューに対応していない（standard / custom のみ）
          - 食品名を返さない（記録の明細には item_name が要る）
          - food_id が 'custom_12' のような文字列で、MCP の入力形式と合わない
        ため MCP からは使わない。

        食堂メニューは Web UI（toMenuItemPayload）と同じく**分量で変倍しない**。
        1食ぶんの実数値をそのまま記録する。値の意味が 100g あたりではないため。

        見つからない場合は None を返す（呼び出し側が利用者向けの文言を組み立てる）。
        """
        food = self.find_item(user, item_type, item_id)
        if food is None:
            return None

        if item_type == 'cafeteria':
            nutrition = self._get_nutrition_of_serving(food)
        else:
            per_100g = self._get_nutrition_per_100g(food)
            multiplier = amount_grams / 100
            nutrition = {key: value * multiplier for key, value in per_100g.items()}

        return {
            'name': food.name,
            'nutrition': {
                key: round(value, round_digits) for key, value in nutrition.items()
            },
        }

    def find_item(self, user, item_type, item_id):
        """供給元の食品を1件引く。Myアイテムは必ずそのユーザーのものに限る。"""
        from ..models import CafeteriaMenu

        if item_type == 'standard':
            return StandardFood.objects.filter(pk=item_id).first()
        if item_type == 'custom':
            return CustomFood.objects.filter(pk=item_id, user=user).first()
        if item_type == 'cafeteria':
            return CafeteriaMenu.objects.filter(pk=item_id).first()
        return None

    def get_nutrition_trend(self, user, start_date, end_date, round_digits):
        """期間内の日別栄養素合計を返す。記録のある日だけを含む。

        日ごとにクエリを撃つと期間の長さぶん N+1 になるため、
        record_date でグループ化した集計クエリ1回で取得する。
        """
        from ..models import MealRecord

        daily_rows = (
            MealRecord.objects.filter(
                user=user,
                record_date__gte=start_date,
                record_date__lte=end_date,
            )
            .values('record_date')
            .annotate(
                calories=Sum('calories'),
                protein=Sum('protein'),
                fat=Sum('fat'),
                carbohydrates=Sum('carbohydrates'),
            )
            .order_by('record_date')
        )

        return [
            {
                'date': row['record_date'].isoformat(),
                'calories': round(row['calories'] or 0, round_digits),
                'protein': round(row['protein'] or 0, round_digits),
                'fat': round(row['fat'] or 0, round_digits),
                'carbohydrates': round(row['carbohydrates'] or 0, round_digits),
            }
            for row in daily_rows
        ]

    def get_weight_trend(self, user, start_date, end_date):
        """期間内の体重記録を日付順で返す。"""
        from ..models import WeightRecord

        records = (
            WeightRecord.objects.filter(
                user=user,
                record_date__gte=start_date,
                record_date__lte=end_date,
            )
            .values('record_date', 'weight')
            .order_by('record_date')
        )

        return [
            {'date': row['record_date'].isoformat(), 'weight': row['weight']}
            for row in records
        ]
