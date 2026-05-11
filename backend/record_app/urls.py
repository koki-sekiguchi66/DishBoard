from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.authtoken.views import obtain_auth_token
from .views import (
    MealTimingChoicesView, MealRecordViewSet, WeightRecordViewSet,
    CustomFoodViewSet, UserRegistrationView, UserProfileView, LogoutView,
    CustomMenuViewSet,
    search_foods, food_suggestions, calculate_nutrition,
    daily_nutrition_summary, list_cafeteria_menus, health_check,
    process_nutrition_label,
)

router = DefaultRouter()
router.register(r'meal-records', MealRecordViewSet, basename='mealrecord')
router.register(r'meals', MealRecordViewSet, basename='meal')  # 後方互換: バックエンドテスト用
router.register(r'weights', WeightRecordViewSet, basename='weight')
router.register(r'foods/custom', CustomFoodViewSet, basename='custom-food')
router.register(r'custom-menus', CustomMenuViewSet, basename='custommenu')

urlpatterns = [
    path('meal-timings/', MealTimingChoicesView.as_view(), name='meal-timing-choices'),
    path('', include(router.urls)),
    path('register/', UserRegistrationView.as_view(), name='register'),
    path('login/', obtain_auth_token, name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('foods/search/', search_foods, name='search-foods'),
    path('foods/suggestions/', food_suggestions, name='food-suggestions'),
    path('foods/calculate/', calculate_nutrition, name='calculate-nutrition'),
    path('nutrition/daily-summary/', daily_nutrition_summary, name='daily-nutrition-summary'),
    path('cafeteria/list/', list_cafeteria_menus, name='list-cafeteria'),
    path('ocr/nutrition-label/', process_nutrition_label, name='ocr-nutrition-label'),
    path('health/', health_check, name='health-check'),
]
