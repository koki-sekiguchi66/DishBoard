import pytest
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token
from record_app.models import CustomFood


# =============================================================================
# pytest ベースのテスト
# =============================================================================

class TestCustomFoodCreation:
    """Myアイテム作成のテスト"""
    
    @pytest.fixture(autouse=True)
    def setup(self, authenticated_client, user):
        self.client = authenticated_client
        self.user = user
        self.url = '/api/foods/custom/'
    
    def test_create_custom_food_basic(self):
        """基本的なMyアイテムの作成"""
        data = {
            'name': 'テストプロテインバー',
            'calories_per_100g': 350,
            'protein_per_100g': 25,
            'fat_per_100g': 10,
            'carbs_per_100g': 40,
        }
        response = self.client.post(self.url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert CustomFood.objects.count() == 1
        
        food = CustomFood.objects.get()
        assert food.name == 'テストプロテインバー'
        assert food.user == self.user
    
    def test_create_custom_food_with_all_nutrients(self):
        """全栄養素を指定したMyアイテムの作成"""
        data = {
            'name': '詳細Myアイテム',
            'calories_per_100g': 200,
            'protein_per_100g': 15,
            'fat_per_100g': 8,
            'carbs_per_100g': 20,
            'fiber_per_100g': 3,
            'sodium_per_100g': 100,
            'calcium_per_100g': 50,
            'iron_per_100g': 1.5,
            'vitamin_a_per_100g': 30,
            'vitamin_b1_per_100g': 0.1,
            'vitamin_b2_per_100g': 0.05,
            'vitamin_c_per_100g': 10,
        }
        response = self.client.post(self.url, data)
        assert response.status_code == status.HTTP_201_CREATED
        
        food = CustomFood.objects.get()
        assert float(food.fiber_per_100g) == 3
        assert float(food.vitamin_c_per_100g) == 10
    
    def test_create_custom_food_without_authentication(self):
        """未認証でのMyアイテム作成は401エラー"""
        client = APIClient()
        data = {
            'name': 'テスト食品',
            'calories_per_100g': 100,
            'protein_per_100g': 5,
            'fat_per_100g': 3,
            'carbs_per_100g': 15,
        }
        response = client.post(self.url, data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestCustomFoodRetrieval:
    """Myアイテム取得のテスト"""
    
    @pytest.fixture(autouse=True)
    def setup(self, authenticated_client, user, custom_food):
        self.client = authenticated_client
        self.user = user
        self.food = custom_food
        self.url = '/api/foods/custom/'
    
    def test_get_custom_food_list(self):
        """Myアイテム一覧の取得"""
        response = self.client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
    
    def test_get_custom_food_by_id(self):
        """IDによるMyアイテムの取得"""
        response = self.client.get(f'{self.url}{self.food.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == self.food.name


class TestCustomFoodUpdate:
    """Myアイテム更新のテスト"""
    
    @pytest.fixture(autouse=True)
    def setup(self, authenticated_client, user, custom_food):
        self.client = authenticated_client
        self.user = user
        self.food = custom_food
        self.url = '/api/foods/custom/'
    
    def test_update_custom_food(self):
        """Myアイテムの全更新"""
        data = {
            'name': '更新された食品',
            'calories_per_100g': 300,
            'protein_per_100g': 20,
            'fat_per_100g': 12,
            'carbs_per_100g': 30,
        }
        response = self.client.put(f'{self.url}{self.food.id}/', data)
        assert response.status_code == status.HTTP_200_OK
        
        self.food.refresh_from_db()
        assert self.food.name == '更新された食品'
        assert float(self.food.calories_per_100g) == 300
    
    def test_partial_update_custom_food(self):
        """Myアイテムの部分更新"""
        data = {
            'name': '部分更新食品',
        }
        response = self.client.patch(f'{self.url}{self.food.id}/', data)
        assert response.status_code == status.HTTP_200_OK
        
        self.food.refresh_from_db()
        assert self.food.name == '部分更新食品'


class TestCustomFoodDeletion:
    """Myアイテム削除のテスト"""
    
    @pytest.fixture(autouse=True)
    def setup(self, authenticated_client, user, custom_food):
        self.client = authenticated_client
        self.user = user
        self.food = custom_food
        self.url = '/api/foods/custom/'
    
    def test_delete_custom_food(self):
        """Myアイテムの削除"""
        response = self.client.delete(f'{self.url}{self.food.id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert CustomFood.objects.count() == 0


class TestCustomFoodIsolation:
    """Myアイテムのユーザー分離テスト"""
    
    @pytest.fixture(autouse=True)
    def setup(self, authenticated_client, other_authenticated_client,
              user, other_user):
        self.client = authenticated_client
        self.other_client = other_authenticated_client
        self.user = user
        self.other_user = other_user
        self.url = '/api/foods/custom/'
        
        self.my_food = CustomFood.objects.create(
            user=user,
            name='自分の食品',
            calories_per_100g=100,
            protein_per_100g=5,
            fat_per_100g=3,
            carbs_per_100g=15,
        )
        self.other_food = CustomFood.objects.create(
            user=other_user,
            name='他人の食品',
            calories_per_100g=200,
            protein_per_100g=10,
            fat_per_100g=6,
            carbs_per_100g=25,
        )
    
    def test_user_sees_only_own_foods(self):
        """ユーザーは自分のMyアイテムのみ見える"""
        response = self.client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['name'] == '自分の食品'
    
    def test_user_cannot_access_others_food(self):
        """他ユーザーの食品にはアクセスできない"""
        response = self.client.get(f'{self.url}{self.other_food.id}/')
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestCustomFoodValidation:
    """Myアイテムバリデーションのテスト"""
    
    @pytest.fixture(autouse=True)
    def setup(self, authenticated_client, user):
        self.client = authenticated_client
        self.user = user
        self.url = '/api/foods/custom/'
    
    def test_create_custom_food_missing_name(self):
        """名前なしでの作成は失敗する"""
        data = {
            'calories_per_100g': 100,
            'protein_per_100g': 5,
            'fat_per_100g': 3,
            'carbs_per_100g': 15,
        }
        response = self.client.post(self.url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_create_custom_food_negative_calories(self):
        """負のカロリー値でのテスト"""
        data = {
            'name': 'テスト',
            'calories_per_100g': -100,
            'protein_per_100g': 5,
            'fat_per_100g': 3,
            'carbs_per_100g': 15,
        }
        response = self.client.post(self.url, data)
        assert response.status_code in [400, 201]
    
    def test_create_custom_food_empty_name(self):
        """空文字名での作成は失敗する"""
        data = {
            'name': '',
            'calories_per_100g': 100,
            'protein_per_100g': 5,
            'fat_per_100g': 3,
            'carbs_per_100g': 15,
        }
        response = self.client.post(self.url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestCustomFoodDuplicateName:
    """同名Myアイテムの重複作成・更新のテスト

    CustomFood.Meta.unique_together は (user, name) だが、user は
    read_only のため DRF が UniqueTogetherValidator を生成せず、
    重複時に DB の IntegrityError が素通りして500になっていた不具合の回帰テスト。
    """

    @pytest.fixture(autouse=True)
    def setup(self, authenticated_client, user, custom_food):
        self.client = authenticated_client
        self.user = user
        self.food = custom_food
        self.url = '/api/foods/custom/'

    def test_create_with_duplicate_name_returns_400(self):
        """既存と同じ名前で作成すると500ではなく400になる"""
        data = {
            'name': self.food.name,
            'calories_per_100g': 100,
            'protein_per_100g': 5,
            'fat_per_100g': 3,
            'carbs_per_100g': 15,
        }
        response = self.client.post(self.url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert CustomFood.objects.filter(user=self.user, name=self.food.name).count() == 1

    def test_update_to_duplicate_name_returns_400(self):
        """別アイテムを既存と同じ名前へ更新すると500ではなく400になる"""
        other = CustomFood.objects.create(
            user=self.user,
            name='別のMyアイテム',
            calories_per_100g=100,
            protein_per_100g=5,
            fat_per_100g=3,
            carbs_per_100g=15,
        )
        data = {
            'name': self.food.name,
            'calories_per_100g': 100,
            'protein_per_100g': 5,
            'fat_per_100g': 3,
            'carbs_per_100g': 15,
        }
        response = self.client.put(f'{self.url}{other.id}/', data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST


# =============================================================================
# Django TestCase ベースのテスト
# =============================================================================

class CustomFoodServiceTests(APITestCase):
    """CustomFoodService のAPIテスト"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser', password='testpass123'
        )
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Token {self.token.key}'
        )
        self.url = '/api/foods/custom/'
    
    def test_create_custom_food_via_api(self):
        """API経由でのMyアイテム作成"""
        data = {
            'name': 'API作成食品',
            'calories_per_100g': 250,
            'protein_per_100g': 12,
            'fat_per_100g': 8,
            'carbs_per_100g': 30,
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_custom_food_default_values(self):
        """オプショナル栄養素のデフォルト値"""
        data = {
            'name': 'デフォルト値テスト',
            'calories_per_100g': 100,
            'protein_per_100g': 5,
            'fat_per_100g': 3,
            'carbs_per_100g': 15,
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        food = CustomFood.objects.get(name='デフォルト値テスト')
        self.assertEqual(float(food.fiber_per_100g), 0)
        self.assertEqual(float(food.sodium_per_100g), 0)