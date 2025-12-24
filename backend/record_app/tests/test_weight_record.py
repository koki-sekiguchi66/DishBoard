from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token
from datetime import date, timedelta
from ..models import WeightRecord


class WeightRecordCreateTests(APITestCase):
    """体重記録作成のテスト"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='testpass123')
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        self.weight_url = '/api/weights/'
        
    def test_create_weight_record(self):
        """体重記録の作成"""
        data = {
            'record_date': date.today().isoformat(),
            'weight': 70.5
        }
        response = self.client.post(self.weight_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(WeightRecord.objects.count(), 1)
        self.assertEqual(float(WeightRecord.objects.get().weight), 70.5)
        
    def test_create_weight_record_with_decimal(self):
        """小数点を含む体重記録の作成"""
        data = {
            'record_date': date.today().isoformat(),
            'weight': 65.75
        }
        response = self.client.post(self.weight_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(float(WeightRecord.objects.get().weight), 65.75)
        
    def test_update_weight_same_date(self):
        """同じ日付の体重記録更新（上書き）"""
        data = {
            'record_date': date.today().isoformat(),
            'weight': 70.0
        }
        response1 = self.client.post(self.weight_url, data)
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)
        
        # 同じ日付で異なる体重を記録
        data['weight'] = 71.0
        response2 = self.client.post(self.weight_url, data)
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        
        # レコードは1件のみ、値は更新されている
        self.assertEqual(WeightRecord.objects.count(), 1)
        self.assertEqual(float(WeightRecord.objects.get().weight), 71.0)
        
    def test_create_weight_record_missing_weight(self):
        """体重値が不足している場合の作成失敗"""
        data = {
            'record_date': date.today().isoformat()
        }
        response = self.client.post(self.weight_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class WeightRecordRetrieveTests(APITestCase):
    """体重記録取得のテスト"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='testpass123')
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        self.weight_url = '/api/weights/'
        
        # テストデータ作成
        for i in range(5):
            WeightRecord.objects.create(
                user=self.user,
                record_date=date.today() - timedelta(days=i),
                weight=70.0 + i * 0.5
            )
        
    def test_get_all_weight_records(self):
        """全体重記録の取得"""
        response = self.client.get(self.weight_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 5)
        
    def test_weight_records_ordered_by_date(self):
        """体重記録が日付順に並んでいることを確認"""
        response = self.client.get(self.weight_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        dates = [record['record_date'] for record in response.data]
        self.assertEqual(dates, sorted(dates, reverse=True))


class WeightRecordIsolationTests(APITestCase):
    """体重記録のユーザー間分離テスト"""
    
    def setUp(self):
        self.client = APIClient()
        
        self.user1 = User.objects.create_user(username='user1', password='pass123')
        self.token1 = Token.objects.create(user=self.user1)
        
        self.user2 = User.objects.create_user(username='user2', password='pass123')
        self.token2 = Token.objects.create(user=self.user2)
        
        WeightRecord.objects.create(
            user=self.user1,
            record_date=date.today(),
            weight=70.0
        )
        WeightRecord.objects.create(
            user=self.user2,
            record_date=date.today(),
            weight=65.0
        )
        
    def test_user_can_only_see_own_weights(self):
        """ユーザーは自分の体重記録のみ閲覧可能"""
        # ユーザー1でログイン
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token1.key}')
        response = self.client.get('/api/weights/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(float(response.data[0]['weight']), 70.0)
        
        # ユーザー2でログイン
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token2.key}')
        response = self.client.get('/api/weights/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(float(response.data[0]['weight']), 65.0)
