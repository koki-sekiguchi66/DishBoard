from django.db import models
from django.contrib.auth.models import User
from django.contrib.postgres.indexes import GinIndex
from django.core.validators import MinValueValidator
from datetime import date



class MealRecord(models.Model):
    """ユーザーの食事記録"""
    MEAL_TIMING_CHOICES = [
        ('breakfast', '朝食'),
        ('lunch', '昼食'),
        ('dinner', '夕食'),
        ('snack', '間食'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name='ユーザー')
    record_date = models.DateField(verbose_name='日付', default=date.today, db_index=True)
    meal_timing = models.CharField(max_length=10, choices=MEAL_TIMING_CHOICES, verbose_name='食事タイミング')
    meal_name = models.CharField(max_length=100, verbose_name='食事名')

    # 基本栄養情報
    calories = models.FloatField(default=0.0, verbose_name='カロリー(kcal)')
    protein = models.FloatField(default=0.0, verbose_name="タンパク質(g)")
    fat = models.FloatField(default=0.0, verbose_name="脂質(g)")
    carbohydrates = models.FloatField(default=0.0, verbose_name="炭水化物(g)")

    # 詳細栄養情報
    dietary_fiber = models.FloatField(default=0.0, verbose_name="食物繊維(g)")
    sodium = models.FloatField(default=0.0, verbose_name="ナトリウム(mg)")
    calcium = models.FloatField(default=0.0, verbose_name="カルシウム(mg)")
    iron = models.FloatField(default=0.0, verbose_name="鉄分(mg)")
    vitamin_a = models.FloatField(default=0.0, verbose_name="ビタミンA(μg)")
    vitamin_b1 = models.FloatField(default=0.0, verbose_name="ビタミンB1(mg)")
    vitamin_b2 = models.FloatField(default=0.0, verbose_name="ビタミンB2(mg)")
    vitamin_c = models.FloatField(default=0.0, verbose_name="ビタミンC(mg)")

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新日時")

    def __str__(self):
        return f"{self.record_date} - {self.get_meal_timing_display()} - {self.meal_name}"
    
    class Meta:
        verbose_name = "食事記録"
        verbose_name_plural = "食事記録"
        indexes = [
            models.Index(fields=['user', 'record_date'], name='meal_user_date_idx'),
            models.Index(fields=['user', 'meal_timing'], name='meal_user_timing_idx'),
            models.Index(fields=['-created_at'], name='meal_created_desc_idx'),
        ]
        ordering = ['-record_date', '-created_at']

class MealRecordItem(models.Model):
    """
    食事記録に含まれる個別の食品アイテム
    """
    
    ITEM_TYPE_CHOICES = [
        ('standard', '標準食品'),
        ('custom', 'カスタム食品'),
        ('cafeteria', '食堂メニュー'),
    ]
    
    meal_record = models.ForeignKey(
        'MealRecord',
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='食事記録'
    )
    

    item_type = models.CharField(
        max_length=20, 
        choices=ITEM_TYPE_CHOICES, 
        verbose_name='アイテム種別',
        db_index=True
    )
    item_id = models.IntegerField(
        verbose_name='アイテムID',
        db_index=True
    )
    
    # 保存時点の値を保持
    item_name = models.CharField(
        max_length=200, 
        verbose_name='アイテム名'
    )
    amount_grams = models.FloatField(
        validators=[MinValueValidator(0)],
        verbose_name='分量(g)'
    )
    display_order = models.IntegerField(
        default=0, 
        verbose_name='表示順序'
    )
    
    # 栄養素のスナップショット
    calories = models.FloatField(default=0, verbose_name='エネルギー(kcal)')
    protein = models.FloatField(default=0, verbose_name='タンパク質(g)')
    fat = models.FloatField(default=0, verbose_name='脂質(g)')
    carbohydrates = models.FloatField(default=0, verbose_name='炭水化物(g)')
    dietary_fiber = models.FloatField(default=0, verbose_name='食物繊維(g)')
    sodium = models.FloatField(default=0, verbose_name='食塩相当量(g)')
    calcium = models.FloatField(default=0, verbose_name='カルシウム(mg)')
    iron = models.FloatField(default=0, verbose_name='鉄(mg)')
    vitamin_a = models.FloatField(default=0, verbose_name='ビタミンA(μg)')
    vitamin_b1 = models.FloatField(default=0, verbose_name='ビタミンB1(mg)')
    vitamin_b2 = models.FloatField(default=0, verbose_name='ビタミンB2(mg)')
    vitamin_c = models.FloatField(default=0, verbose_name='ビタミンC(mg)')
    
    class Meta:
        verbose_name = '食事記録アイテム'
        verbose_name_plural = '食事記録アイテム'
        ordering = ['display_order', 'id']
        indexes = [
            models.Index(fields=['meal_record', 'display_order'], name='mealitem_record_order_idx'),
            models.Index(fields=['item_type', 'item_id'], name='mealitem_polymorphic_idx'),
        ]
    
    def __str__(self):
        return f"{self.item_name} ({self.amount_grams}g)"



class WeightRecord(models.Model):
    """ユーザーの体重記録"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name='ユーザー')
    record_date = models.DateField(verbose_name='日付', default=date.today, db_index=True)
    weight = models.FloatField(verbose_name='体重(kg)')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新日時")

    def __str__(self):
        return f"{self.user.username} - {self.record_date} : {self.weight}kg"

    class Meta:
        verbose_name = "体重記録"
        verbose_name_plural = "体重記録"
        indexes = [
            models.Index(fields=['user', 'record_date'], name='weight_user_date_idx'),
            models.Index(fields=['user', '-record_date'], name='weight_user_date_desc_idx'),
        ]
        ordering = ['-record_date']


class StandardFood(models.Model):
    """文科省食品標準成分表の食品情報"""

    food_number = models.CharField(max_length=10, unique=True, verbose_name="食品番号")
    name = models.CharField(max_length=100, verbose_name="食品名", db_index=True)
    category = models.CharField(max_length=50, verbose_name="分類", db_index=True)
    
    # 100gあたりの栄養成分
    calories_per_100g = models.FloatField(verbose_name="エネルギー(kcal)")
    protein_per_100g = models.FloatField(verbose_name="たんぱく質(g)")
    fat_per_100g = models.FloatField(verbose_name="脂質(g)")
    carbs_per_100g = models.FloatField(verbose_name="炭水化物(g)")
    fiber_per_100g = models.FloatField(default=0, verbose_name="食物繊維(g)")
    sodium_per_100g = models.FloatField(default=0, verbose_name="ナトリウム(mg)")
    calcium_per_100g = models.FloatField(default=0, verbose_name="カルシウム(mg)")
    iron_per_100g = models.FloatField(default=0, verbose_name="鉄(mg)")
    vitamin_a_per_100g = models.FloatField(default=0, verbose_name="ビタミンA(μg)")
    vitamin_b1_per_100g = models.FloatField(default=0, verbose_name="ビタミンB1(mg)")
    vitamin_b2_per_100g = models.FloatField(default=0, verbose_name="ビタミンB2(mg)")
    vitamin_c_per_100g = models.FloatField(default=0, verbose_name="ビタミンC(mg)")
    
    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name = "標準食品"
        verbose_name_plural = "標準食品"
        indexes = [
            GinIndex(fields=['name'], name='standardfood_name_gin_idx', opclasses=['gin_trgm_ops']),
            models.Index(fields=['category', 'name'], name='standardfood_cat_name_idx'),
            models.Index(fields=['category'], name='standardfood_category_idx'),
        ]
        ordering = ['category', 'name']


class CustomFood(models.Model):
    """ユーザーが追加した食品情報"""

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=100, db_index=True)
    
    # 100gあたりの栄養成分
    calories_per_100g = models.FloatField(verbose_name="エネルギー(kcal)")
    protein_per_100g = models.FloatField(verbose_name="たんぱく質(g)")
    fat_per_100g = models.FloatField(verbose_name="脂質(g)")
    carbs_per_100g = models.FloatField(verbose_name="炭水化物(g)")
    fiber_per_100g = models.FloatField(default=0, verbose_name="食物繊維(g)")
    sodium_per_100g = models.FloatField(default=0, verbose_name="ナトリウム(mg)")
    calcium_per_100g = models.FloatField(default=0, verbose_name="カルシウム(mg)")
    iron_per_100g = models.FloatField(default=0, verbose_name="鉄(mg)")
    vitamin_a_per_100g = models.FloatField(default=0, verbose_name="ビタミンA(μg)")
    vitamin_b1_per_100g = models.FloatField(default=0, verbose_name="ビタミンB1(mg)")
    vitamin_b2_per_100g = models.FloatField(default=0, verbose_name="ビタミンB2(mg)")
    vitamin_c_per_100g = models.FloatField(default=0, verbose_name="ビタミンC(mg)")

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新日時")

    def __str__(self):
        return f"{self.user.username} - {self.name}"

    class Meta:
        verbose_name = "カスタム食品"
        verbose_name_plural = "カスタム食品"
        unique_together = ['user', 'name']
        indexes = [
            models.Index(fields=['user', 'name'], name='customfood_user_name_idx'),
            models.Index(fields=['user'], name='customfood_user_idx'),
        ]
        ordering = ['user', 'name']


class CafeteriaMenu(models.Model):
    """食堂メニュー情報"""
    
    MENU_CATEGORY = [
        ('main', '主菜'),
        ('side', '副菜'),
        ('noodle', '麺類'),
        ('rice', '丼・カレー'),
        ('dessert', 'デザート'),
        ('order', 'オーダー'),
        ('kebab', 'ケバブ＆ベジタリアン'),
        ('parfait', 'パフェ'),
        ('night', '夜限定'),
        ('other', 'その他'),
    ]
    
    menu_id = models.CharField(max_length=20, unique=True, verbose_name='メニューID')
    name = models.CharField(max_length=200, verbose_name='メニュー名', db_index=True)
    category = models.CharField(max_length=20, choices=MENU_CATEGORY, verbose_name='カテゴリー', db_index=True)
    
    # 栄養成分
    calories = models.FloatField(verbose_name='エネルギー(kcal)')
    protein = models.FloatField(verbose_name='タンパク質(g)')
    fat = models.FloatField(verbose_name='脂質(g)')
    carbohydrates = models.FloatField(verbose_name='炭水化物(g)')
    dietary_fiber = models.FloatField(default=0, verbose_name='食物繊維(g)')
    sodium = models.FloatField(default=0, verbose_name='食塩相当量(g)')
    calcium = models.FloatField(default=0, verbose_name='カルシウム(mg)')
    iron = models.FloatField(default=0, verbose_name='鉄(mg)')
    vitamin_a = models.FloatField(default=0, verbose_name='ビタミンA(μg)')
    vitamin_b1 = models.FloatField(default=0, verbose_name='ビタミンB1(mg)')
    vitamin_b2 = models.FloatField(default=0, verbose_name='ビタミンB2(mg)')
    vitamin_c = models.FloatField(default=0, verbose_name='ビタミンC(mg)')
    
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新日時')
    
    class Meta:
        verbose_name = '食堂メニュー'
        verbose_name_plural = '食堂メニュー'
        ordering = ['category', 'name']
        indexes = [
            models.Index(fields=['category'], name='cafeteria_category_idx'),
            models.Index(fields=['category', 'name'], name='cafeteria_cat_name_idx'),
            models.Index(fields=['updated_at'], name='cafeteria_updated_idx'),
        ]
    
    def __str__(self):
        return f"{self.get_category_display()} - {self.name}"

class CustomMenu(models.Model):
    """ユーザーが追加した再利用可能なメニューテンプレート"""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name='ユーザー')
    name = models.CharField(max_length=100, verbose_name='メニュー名', db_index=True)
    description = models.TextField(blank=True, verbose_name='説明')
    
    # 合計の栄養素を事前計算し更新
    total_calories = models.FloatField(default=0, verbose_name='合計カロリー(kcal)')
    total_protein = models.FloatField(default=0, verbose_name='合計タンパク質(g)')
    total_fat = models.FloatField(default=0, verbose_name='合計脂質(g)')
    total_carbohydrates = models.FloatField(default=0, verbose_name='合計炭水化物(g)')
    total_dietary_fiber = models.FloatField(default=0, verbose_name='合計食物繊維(g)')
    total_sodium = models.FloatField(default=0, verbose_name='合計ナトリウム(mg)')
    total_calcium = models.FloatField(default=0, verbose_name='合計カルシウム(mg)')
    total_iron = models.FloatField(default=0, verbose_name='合計鉄分(mg)')
    total_vitamin_a = models.FloatField(default=0, verbose_name='合計ビタミンA(μg)')
    total_vitamin_b1 = models.FloatField(default=0, verbose_name='合計ビタミンB1(mg)')
    total_vitamin_b2 = models.FloatField(default=0, verbose_name='合計ビタミンB2(mg)')
    total_vitamin_c = models.FloatField(default=0, verbose_name='合計ビタミンC(mg)')
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='作成日時')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新日時')
    
    class Meta:
        verbose_name = 'Myメニュー'
        verbose_name_plural = 'Myメニュー'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'name'], name='custommenu_user_name_idx'),
            models.Index(fields=['user', '-created_at'], name='custommenu_user_created_idx'),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.name}"
    
    def calculate_totals(self):
        """
        メニューアイテムから合計栄養素を計算
        集計クエリを1回のみ実行
        結果をモデルフィールドにキャッシュ
        """
        from django.db.models import Sum
        
        totals = self.items.aggregate(
            total_calories=Sum('calories'),
            total_protein=Sum('protein'),
            total_fat=Sum('fat'),
            total_carbohydrates=Sum('carbohydrates'),
            total_dietary_fiber=Sum('dietary_fiber'),
            total_sodium=Sum('sodium'),
            total_calcium=Sum('calcium'),
            total_iron=Sum('iron'),
            total_vitamin_a=Sum('vitamin_a'),
            total_vitamin_b1=Sum('vitamin_b1'),
            total_vitamin_b2=Sum('vitamin_b2'),
            total_vitamin_c=Sum('vitamin_c'),
        )
        
        # None値を0に変換して設定
        for key, value in totals.items():
            setattr(self, key, value or 0)


class CustomMenuItem(models.Model):
    """Myメニューに含まれる個別の食品"""
    
    ITEM_TYPE_CHOICES = [
        ('standard', '標準食品'),
        ('custom', 'Myアイテム'),
        ('cafeteria', '食堂メニュー'),
    ]
    
    custom_menu = models.ForeignKey(
        CustomMenu, 
        on_delete=models.CASCADE, 
        related_name='items',
        verbose_name='Myメニュー'
    )
    item_type = models.CharField(max_length=20, choices=ITEM_TYPE_CHOICES, verbose_name='アイテム種別')
    item_id = models.IntegerField(verbose_name='アイテムID')
    item_name = models.CharField(max_length=200, verbose_name='アイテム名')
    amount_grams = models.FloatField(verbose_name='分量(g)')
    display_order = models.IntegerField(default=0, verbose_name='表示順序')
    
    calories = models.FloatField(verbose_name='カロリー(kcal)')
    protein = models.FloatField(verbose_name='タンパク質(g)')
    fat = models.FloatField(verbose_name='脂質(g)')
    carbohydrates = models.FloatField(verbose_name='炭水化物(g)')
    dietary_fiber = models.FloatField(default=0, verbose_name='食物繊維(g)')
    sodium = models.FloatField(default=0, verbose_name='ナトリウム(mg)')
    calcium = models.FloatField(default=0, verbose_name='カルシウム(mg)')
    iron = models.FloatField(default=0, verbose_name='鉄分(mg)')
    vitamin_a = models.FloatField(default=0, verbose_name='ビタミンA(μg)')
    vitamin_b1 = models.FloatField(default=0, verbose_name='ビタミンB1(mg)')
    vitamin_b2 = models.FloatField(default=0, verbose_name='ビタミンB2(mg)')
    vitamin_c = models.FloatField(default=0, verbose_name='ビタミンC(mg)')
    
    class Meta:
        verbose_name = 'メニューアイテム'
        verbose_name_plural = 'メニューアイテム'
        ordering = ['display_order']
        indexes = [
            models.Index(fields=['custom_menu', 'display_order'], name='custommenuitem_menu_order_idx'),
        ]
    
    def __str__(self):
        return f"{self.custom_menu.name} - {self.item_name}"