from django.db.models import Q
from django.contrib.postgres.search import TrigramSimilarity
from ..models import StandardFood, CustomFood

class NutritionCalculatorService:
    
    def search_foods(self, query):
        """食品名で検索"""        
        if not query:
            return []
        
        results = []
        keywords = query.split()
        initial_candidates = (
            StandardFood.objects.annotate(
                similarity=TrigramSimilarity('name', query)
            )
            .filter(similarity__gt=0.08) 
        )

        final_query = Q()
        for keyword in keywords:
            final_query &= Q(name__icontains=keyword)
        
        standard_foods = (
            initial_candidates.filter(final_query)
            .order_by('-similarity') 
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
        
        # 標準食品から候補取得
        standard_foods = StandardFood.objects.filter(
            name__icontains=query
        ).values('name').distinct()[:limit]
        
        for food in standard_foods:
            suggestions.append(food['name'])
        
        return suggestions
    
    def _get_nutrition_per_100g(self, food):
        """100gあたりの栄養素を取得（内部メソッド）"""
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
    
    def calculate_nutrition_for_amount(self, food_id, amount_grams):
        """指定された量の栄養素を計算"""
        try:
            food_type, food_pk = food_id.split('_', 1)
            
            if food_type == 'standard':
                food = StandardFood.objects.get(pk=food_pk)
            elif food_type == 'custom':
                food = CustomFood.objects.get(pk=food_pk)
            else:
                raise ValueError(f"不正な食品タイプ: {food_type}")
            
            nutrition_per_100g = self._get_nutrition_per_100g(food)
            multiplier = amount_grams / 100
            
            # 各栄養素を量に応じて計算
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
        
        # 栄養素の合計を初期化
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
        
        # 各食事の栄養素を合計
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
        
        # 小数点以下2桁に丸める
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