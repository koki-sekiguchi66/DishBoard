from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token
from datetime import date, timedelta
from ..models import MealRecord


class MealRecordCreateTests(APITestCase):
    """食事記録作成のテスト"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='testpass123')
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        self.meal_url = '/api/meals/'
        
    def test_create_meal_record_with_basic_nutrition(self):
        """基本的な栄養情報での食事記録作成"""
        data = {
            'record_date': date.today().isoformat(),
            'meal_timing': 'breakfast',
            'meal_name': 'テスト朝食',
            'calories': 500,
            'protein': 20,
            'fat': 15,
            'carbohydrates': 60
        }
        response = self.client.post(self.meal_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(MealRecord.objects.count(), 1)
        
        meal = MealRecord.objects.get()
        self.assertEqual(meal.meal_name, 'テスト朝食')
        self.assertEqual(float(meal.calories), 500)
        self.assertEqual(meal.user, self.user)
        
    def test_create_meal_record_with_detailed_nutrition(self):
        """詳細な栄養情報での食事記録作成"""
        data = {
            'record_date': date.today().isoformat(),
            'meal_timing': 'lunch',
            'meal_name': '詳細栄養素の昼食',
            'calories': 700,
            'protein': 30,
            'fat': 20,
            'carbohydrates': 80,
            'dietary_fiber': 5,
            'sodium': 800,
            'calcium': 200,
            'iron': 3,
            'vitamin_a': 100,
            'vitamin_b1': 0.5,
            'vitamin_b2': 0.3,
            'vitamin_c': 20
        }
        response = self.client.post(self.meal_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        meal = MealRecord.objects.get()
        self.assertEqual(float(meal.dietary_fiber), 5)
        self.assertEqual(float(meal.sodium), 800)
        self.assertEqual(float(meal.calcium), 200)
        
    def test_create_meal_record_different_timings(self):
        """異なる食事タイミングでの記録作成"""
        timings = ['breakfast', 'lunch', 'dinner', 'snack']
        
        for timing in timings:
            data = {
                'record_date': date.today().isoformat(),
                'meal_timing': timing,
                'meal_name': f'{timing}の食事',
                'calories': 400,
                'protein': 15,
                'fat': 10,
                'carbohydrates': 50
            }
            response = self.client.post(self.meal_url, data)
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        self.assertEqual(MealRecord.objects.count(), 4)
        
    def test_create_meal_record_missing_required_fields(self):
        """必須フィールド不足での作成失敗"""
        data = {
            'record_date': date.today().isoformat(),
            'meal_timing': 'breakfast',
            # meal_name が不足
            'calories': 500
        }
        response = self.client.post(self.meal_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class MealRecordRetrieveTests(APITestCase):
    """食事記録取得のテスト"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='testpass123')
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        self.meal_url = '/api/meals/'
        
        # テストデータ作成
        MealRecord.objects.create(
            user=self.user,
            record_date=date.today(),
            meal_timing='breakfast',
            meal_name='朝食',
            calories=400,
            protein=15,
            fat=10,
            carbohydrates=50
        )
        MealRecord.objects.create(
            user=self.user,
            record_date=date.today(),
            meal_timing='lunch',
            meal_name='昼食',
            calories=600,
            protein=25,
            fat=18,
            carbohydrates=70
        )
        
    def test_get_all_meal_records(self):
        """全食事記録の取得"""
        response = self.client.get(self.meal_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        
    def test_get_meal_record_by_id(self):
        """IDによる食事記録の取得"""
        meal = MealRecord.objects.first()
        response = self.client.get(f'{self.meal_url}{meal.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['meal_name'], meal.meal_name)
        
    def test_meal_records_ordered_by_date(self):
        """食事記録が日付順に並んでいることを確認"""
        # 昨日の記録を追加
        MealRecord.objects.create(
            user=self.user,
            record_date=date.today() - timedelta(days=1),
            meal_timing='dinner',
            meal_name='昨日の夕食',
            calories=700,
            protein=30,
            fat=22,
            carbohydrates=80
        )
        
        response = self.client.get(self.meal_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 新しい記録が先頭にあることを確認
        dates = [record['record_date'] for record in response.data]
        self.assertEqual(dates, sorted(dates, reverse=True))


class MealRecordUpdateTests(APITestCase):
    """食事記録更新のテスト"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='testpass123')
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        self.meal_url = '/api/meals/'
        
        self.meal = MealRecord.objects.create(
            user=self.user,
            record_date=date.today(),
            meal_timing='lunch',
            meal_name='昼食',
            calories=600,
            protein=25,
            fat=20,
            carbohydrates=70
        )
        
    def test_update_meal_record(self):
        """食事記録の更新"""
        data = {
            'record_date': date.today().isoformat(),
            'meal_timing': 'lunch',
            'meal_name': '更新された昼食',
            'calories': 650,
            'protein': 30,
            'fat': 22,
            'carbohydrates': 75
        }
        response = self.client.put(f'{self.meal_url}{self.meal.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.meal.refresh_from_db()
        self.assertEqual(self.meal.meal_name, '更新された昼食')
        self.assertEqual(float(self.meal.calories), 650)
        
    def test_partial_update_meal_record(self):
        """食事記録の部分更新"""
        data = {
            'meal_name': '部分更新された昼食'
        }
        response = self.client.patch(f'{self.meal_url}{self.meal.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.meal.refresh_from_db()
        self.assertEqual(self.meal.meal_name, '部分更新された昼食')
        # その他のフィールドは変更されていないことを確認
        self.assertEqual(float(self.meal.calories), 600)


class MealRecordDeleteTests(APITestCase):
    """食事記録削除のテスト"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='testpass123')
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        self.meal_url = '/api/meals/'
        
        self.meal = MealRecord.objects.create(
            user=self.user,
            record_date=date.today(),
            meal_timing='dinner',
            meal_name='夕食',
            calories=700,
            protein=30,
            fat=25,
            carbohydrates=80
        )
        
    def test_delete_meal_record(self):
        """食事記録の削除"""
        response = self.client.delete(f'{self.meal_url}{self.meal.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(MealRecord.objects.count(), 0)
        
    def test_delete_nonexistent_meal_record(self):
        """存在しない食事記録の削除"""
        response = self.client.delete(f'{self.meal_url}99999/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class MealRecordIsolationTests(APITestCase):
    """食事記録のユーザー間分離テスト"""
    
    def setUp(self):
        self.client = APIClient()
        
        # ユーザー1
        self.user1 = User.objects.create_user(username='user1', password='pass123')
        self.token1 = Token.objects.create(user=self.user1)
        
        # ユーザー2
        self.user2 = User.objects.create_user(username='user2', password='pass123')
        self.token2 = Token.objects.create(user=self.user2)
        
        # それぞれのユーザーの食事記録を作成
        MealRecord.objects.create(
            user=self.user1,
            record_date=date.today(),
            meal_timing='breakfast',
            meal_name='ユーザー1の朝食',
            calories=400,
            protein=15,
            fat=10,
            carbohydrates=50
        )
        MealRecord.objects.create(
            user=self.user2,
            record_date=date.today(),
            meal_timing='breakfast',
            meal_name='ユーザー2の朝食',
            calories=500,
            protein=20,
            fat=15,
            carbohydrates=60
        )
        
    def test_user_can_only_see_own_meals(self):
        """ユーザーは自分の食事記録のみ閲覧可能"""
        # ユーザー1でログイン
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token1.key}')
        response = self.client.get('/api/meals/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['meal_name'], 'ユーザー1の朝食')
        
        # ユーザー2でログイン
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token2.key}')
        response = self.client.get('/api/meals/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['meal_name'], 'ユーザー2の朝食')
        
    def test_user_cannot_access_other_users_meals(self):
        """ユーザーは他ユーザーの食事記録にアクセス不可"""
        user1_meal = MealRecord.objects.get(user=self.user1)
        
        # ユーザー2でユーザー1の食事記録にアクセス
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token2.key}')
        response = self.client.get(f'/api/meals/{user1_meal.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
      