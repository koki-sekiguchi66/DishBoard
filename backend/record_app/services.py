from datetime import date
from django.db import transaction
from .models import (
    MealRecord, MealRecordItem, WeightRecord, 
    CustomFood, CustomMenu
)
from .business_logic.nutrition_calculator import NutritionCalculatorService

class MealService:
    """食事記録に関するビジネスロジックを扱うサービスクラス"""

    @staticmethod
    @transaction.atomic
    def create_meal_from_menu(user, menu: CustomMenu, data: dict) -> MealRecord:
        """カスタムメニューから食事記録を作成する"""
        record_date = data.get('record_date', date.today())
        meal_timing = data.get('meal_timing', 'breakfast')
        multiplier = float(data.get('multiplier', 1.0))

        if multiplier <= 0:
            raise ValueError('倍率は正の数でなければなりません')

        # 食事記録ヘッダーの作成
        meal_record = MealRecord.objects.create(
            user=user,
            record_date=record_date,
            meal_timing=meal_timing,
            meal_name=menu.name,
            calories=menu.total_calories * multiplier,
            protein=menu.total_protein * multiplier,
            fat=menu.total_fat * multiplier,
            carbohydrates=menu.total_carbohydrates * multiplier,
            dietary_fiber=menu.total_dietary_fiber * multiplier,
            sodium=menu.total_sodium * multiplier,
            calcium=menu.total_calcium * multiplier,
            iron=menu.total_iron * multiplier,
            vitamin_a=menu.total_vitamin_a * multiplier,
            vitamin_b1=menu.total_vitamin_b1 * multiplier,
            vitamin_b2=menu.total_vitamin_b2 * multiplier,
            vitamin_c=menu.total_vitamin_c * multiplier,
        )

        # 明細行の作成
        menu_items = menu.items.all()
        MealRecordItem.objects.bulk_create([
            MealRecordItem(
                meal_record=meal_record,
                item_type=item.item_type,
                item_id=item.item_id,
                item_name=item.item_name,
                amount_grams=item.amount_grams * multiplier,
                display_order=item.display_order,
                calories=item.calories * multiplier,
                protein=item.protein * multiplier,
                fat=item.fat * multiplier,
                carbohydrates=item.carbohydrates * multiplier,
                dietary_fiber=item.dietary_fiber * multiplier,
                sodium=item.sodium * multiplier,
                calcium=item.calcium * multiplier,
                iron=item.iron * multiplier,
                vitamin_a=item.vitamin_a * multiplier,
                vitamin_b1=item.vitamin_b1 * multiplier,
                vitamin_b2=item.vitamin_b2 * multiplier,
                vitamin_c=item.vitamin_c * multiplier,
            )
            for item in menu_items
        ])

        return meal_record


class WeightService:
    """体重記録に関するビジネスロジック"""

    @staticmethod
    def register_weight(user, weight: float, record_date: date) -> tuple[WeightRecord, bool]:
        """体重を登録または更新する"""
        return WeightRecord.objects.update_or_create(
            user=user,
            record_date=record_date,
            defaults={'weight': weight}
        )


class CustomFoodService:
    """カスタム食品に関するビジネスロジック"""
    
    @staticmethod
    def create_custom_food(user, data: dict) -> CustomFood:
        """栄養計算サービスを利用してカスタム食品を作成する"""
        calculator = NutritionCalculatorService()
        return calculator.create_custom_food(user, data)