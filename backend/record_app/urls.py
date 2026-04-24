# DishBoard/record_app/urls.py
"""
URL設計方針:
  - ViewSet で CRUD が完結するリソースは Router に一元化
  - 関数ベースView は検索・計算など ViewSet に馴染まない操作に限定
  - Router と function-based path の競合を避けるため、同一プレフィックスの重複登録を禁止

変更履歴:
  - foods/custom/ 系の関数ベースpathを削除（CustomFoodViewSet に統合）
  - meals / meal-records の重複は両方残す（後方互換のため）
    フロントエンド(mealApi.js) → /meal-records/
    バックエンドテスト          → /meals/
    TODO: テスト側を /meal-records/ に統一後、meals 登録を削除する
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.authtoken.views import obtain_auth_token
from .views import (
    MealTimingChoicesView, MealRecordViewSet, WeightRecordViewSet,
    CustomFoodViewSet, UserRegistrationView, CustomMenuViewSet,
    search_foods, food_suggestions, calculate_nutrition,
    daily_nutrition_summary, list_cafeteria_menus, health_check,
    process_nutrition_label,
)

router = DefaultRouter()
# 正規エンドポイント（フロントエンドが使用）
router.register(r'meal-records', MealRecordViewSet, basename='mealrecord')
# 後方互換（バックエンドテストが使用）— TODO: テスト移行後に削除
router.register(r'meals', MealRecordViewSet, basename='meal')
router.register(r'weights', WeightRecordViewSet, basename='weight')
router.register(r'foods/custom', CustomFoodViewSet, basename='custom-food')
router.register(r'custom-menus', CustomMenuViewSet, basename='custommenu')

urlpatterns = [
    # 基本URL
    path('meal-timings/', MealTimingChoicesView.as_view(), name='meal-timing-choices'),
    path('', include(router.urls)),
    path('register/', UserRegistrationView.as_view(), name='register'),
    path('login/', obtain_auth_token, name='login'),

    # 食品検索・栄養計算（ViewSet に馴染まない横断的操作）
    path('foods/search/', search_foods, name='search-foods'),
    path('foods/suggestions/', food_suggestions, name='food-suggestions'),
    path('foods/calculate/', calculate_nutrition, name='calculate-nutrition'),

    # foods/custom/ 系の関数ベースpathは CustomFoodViewSet に統合済みのため削除
    # - GET  /foods/custom/          → ViewSet.list
    # - POST /foods/custom/          → ViewSet.create
    # - PUT  /foods/custom/<id>/     → ViewSet.update
    # - DELETE /foods/custom/<id>/   → ViewSet.destroy
    # - POST /foods/custom/create_from_meal/ → ViewSet.create_from_meal

    # 栄養サマリー
    path('nutrition/daily-summary/', daily_nutrition_summary, name='daily-nutrition-summary'),

    # 食堂メニュー
    path('cafeteria/list/', list_cafeteria_menus, name='list-cafeteria'),

    # OCR エンドポイント
    path('ocr/nutrition-label/', process_nutrition_label, name='ocr-nutrition-label'),

    # 本番環境用ヘルスチェック
    path('health/', health_check, name='health-check'),
]
