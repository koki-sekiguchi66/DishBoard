from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token


class UserRegistrationTests(APITestCase):
    """ユーザー登録のテスト"""
    
    def setUp(self):
        self.client = APIClient()
        self.register_url = '/api/register/'
        
    def test_user_registration_success(self):
        """正常なユーザー登録"""
        data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'testpass123',
            'confirm_password': 'testpass123'
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username='testuser').exists())
        
    def test_user_registration_password_mismatch(self):
        """パスワード不一致でのユーザー登録失敗"""
        data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'testpass123',
            'confirm_password': 'differentpass'
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(username='testuser').exists())
        
    def test_user_registration_duplicate_username(self):
        """重複ユーザー名での登録失敗"""
        User.objects.create_user(username='testuser', password='testpass123')
        data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'testpass123',
            'confirm_password': 'testpass123'
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.filter(username='testuser').count(), 1)
        
    def test_user_registration_short_password(self):
        """短いパスワードでの登録失敗"""
        data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'short',
            'confirm_password': 'short'
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
    def test_user_registration_missing_fields(self):
        """必須フィールドが不足している場合の登録失敗"""
        data = {
            'username': 'testuser',
            'password': 'testpass123'
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class UserLoginTests(APITestCase):
    """ユーザーログインのテスト"""
    
    def setUp(self):
        self.client = APIClient()
        self.login_url = '/api/login/'
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            email='test@example.com'
        )
        
    def test_user_login_success(self):
        """正常なログイン"""
        data = {
            'username': 'testuser',
            'password': 'testpass123'
        }
        response = self.client.post(self.login_url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)
        
        # トークンが正しく作成されているか確認
        token = Token.objects.get(user=self.user)
        self.assertEqual(response.data['token'], token.key)
        
    def test_user_login_invalid_password(self):
        """無効なパスワードでのログイン失敗"""
        data = {
            'username': 'testuser',
            'password': 'wrongpassword'
        }
        response = self.client.post(self.login_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
    def test_user_login_nonexistent_user(self):
        """存在しないユーザーでのログイン失敗"""
        data = {
            'username': 'nonexistent',
            'password': 'testpass123'
        }
        response = self.client.post(self.login_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
    def test_user_login_missing_credentials(self):
        """認証情報不足でのログイン失敗"""
        data = {
            'username': 'testuser'
        }
        response = self.client.post(self.login_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class TokenAuthenticationTests(APITestCase):
    """トークン認証のテスト"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.token = Token.objects.create(user=self.user)
        
    def test_authenticated_request(self):
        """認証済みリクエスト"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        response = self.client.get('/api/meals/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
    def test_unauthenticated_request(self):
        """未認証リクエスト"""
        response = self.client.get('/api/meals/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
    def test_invalid_token_request(self):
        """無効なトークンでのリクエスト"""
        self.client.credentials(HTTP_AUTHORIZATION='Token invalid-token-123')
        response = self.client.get('/api/meals/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)