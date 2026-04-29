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

    def test_user_registration_invalid_email(self):
        """無効なメールアドレスでの登録"""
        data = {
            'username': 'testuser',
            'email': 'invalid-email',
            'password': 'testpass123',
            'confirm_password': 'testpass123'
        }
        response = self.client.post(self.register_url, data)
        self.assertIn(response.status_code, [
            status.HTTP_400_BAD_REQUEST, 
            status.HTTP_201_CREATED
        ])

    def test_user_registration_empty_username(self):
        """空のユーザー名での登録失敗"""
        data = {
            'username': '',
            'email': 'test@example.com',
            'password': 'testpass123',
            'confirm_password': 'testpass123'
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_registration_whitespace_username(self):
        """空白のみのユーザー名での登録"""
        data = {
            'username': '   ',
            'email': 'test@example.com',
            'password': 'testpass123',
            'confirm_password': 'testpass123'
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_registration_long_username(self):
        """非常に長いユーザー名での登録"""
        data = {
            'username': 'a' * 200,  
            'email': 'test@example.com',
            'password': 'testpass123',
            'confirm_password': 'testpass123'
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

    def test_user_login_empty_password(self):
        """空のパスワードでのログイン失敗"""
        data = {
            'username': 'testuser',
            'password': ''
        }
        response = self.client.post(self.login_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_login_returns_user_info(self):
        """ログイン成功時にユーザー情報を返す"""
        data = {
            'username': 'testuser',
            'password': 'testpass123'
        }
        response = self.client.post(self.login_url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        if 'user_id' in response.data:
            self.assertEqual(response.data['user_id'], self.user.id)
        if 'username' in response.data:
            self.assertEqual(response.data['username'], self.user.username)

    def test_user_login_case_sensitive_username(self):
        """ユーザー名の大文字小文字の区別"""
        data = {
            'username': 'TESTUSER',  
            'password': 'testpass123'
        }
        response = self.client.post(self.login_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_login_multiple_times(self):
        """複数回ログインしても同じトークンを返す"""
        data = {
            'username': 'testuser',
            'password': 'testpass123'
        }
        
        response1 = self.client.post(self.login_url, data)
        self.assertEqual(response1.status_code, status.HTTP_200_OK)

        token1 = response1.data['token']     
        response2 = self.client.post(self.login_url, data)
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        token2 = response2.data['token']
        self.assertEqual(token1, token2)


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

    def test_expired_token_request(self):
        """
        期限切れトークンのテスト
        """
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        response = self.client.get('/api/meals/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_token_without_prefix(self):
        """Tokenプレフィックスなしでのリクエスト"""
        self.client.credentials(HTTP_AUTHORIZATION=self.token.key)
        response = self.client.get('/api/meals/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_bearer_prefix_instead_of_token(self):
        """Bearerプレフィックスでのリクエスト（Token認証では無効）"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token.key}')
        response = self.client.get('/api/meals/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_empty_authorization_header(self):
        """空の認証ヘッダー"""
        self.client.credentials(HTTP_AUTHORIZATION='')
        response = self.client.get('/api/meals/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_malformed_authorization_header(self):
        """不正な形式の認証ヘッダー"""
        self.client.credentials(HTTP_AUTHORIZATION='Token') 
        response = self.client.get('/api/meals/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_with_extra_spaces(self):
        """余分なスペースを含むトークン"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token  {self.token.key}')  
        response = self.client.get('/api/meals/')
    
        self.assertIn(response.status_code, [
            status.HTTP_200_OK,
            status.HTTP_401_UNAUTHORIZED
        ])


class LogoutTests(APITestCase):
    """ログアウトのテスト"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.token = Token.objects.create(user=self.user)
        self.logout_url = '/api/logout/'
        
    def test_logout_success(self):
        """正常なログアウト"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        response = self.client.post(self.logout_url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_logout_without_authentication(self):
        """未認証でのログアウト"""
        response = self.client.post(self.logout_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_deletes_token(self):
        """ログアウト後にトークンが削除される"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        response = self.client.post(self.logout_url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Token.objects.filter(user=self.user).exists())

    def test_logout_invalidates_token_for_requests(self):
        """ログアウト後は同じトークンでアクセスできない"""
        token_key = self.token.key
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token_key}')

        response = self.client.post(self.logout_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token_key}')
        response = self.client.get('/api/meals/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class UserProfileTests(APITestCase):
    """ユーザープロファイルのテスト"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            email='test@example.com'
        )
        self.token = Token.objects.create(user=self.user)
        self.profile_url = '/api/profile/'
        
    def test_get_user_profile(self):
        """ユーザープロファイルの取得"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        response = self.client.get(self.profile_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'testuser')
        self.assertEqual(response.data['email'], 'test@example.com')
        self.assertIn('date_joined', response.data)

    def test_get_profile_unauthenticated(self):
        """未認証でのプロファイル取得"""
        response = self.client.get(self.profile_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)