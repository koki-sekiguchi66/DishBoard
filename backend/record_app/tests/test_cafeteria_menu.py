from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token
from ..models import CafeteriaMenu


class CafeteriaMenuTests(APITestCase):
    """食堂メニューのテスト"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='testpass123')
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        
        # テストデータ作成
        CafeteriaMenu.objects.create(
            menu_id='001',
            name='チキンカレー',
            category='rice',
            calories=700,
            protein=25,
            fat=20,
            carbohydrates=100
        )
        CafeteriaMenu.objects.create(
            menu_id='002',
            name='ハンバーグ定食',
            category='main',
            calories=650,
            protein=30,
            fat=25,
            carbohydrates=80
        )
        CafeteriaMenu.objects.create(
            menu_id='003',
            name='ラーメン',
            category='noodle',
            calories=550,
            protein=20,
            fat=15,
            carbohydrates=90
        )
        
    def test_list_all_cafeteria_menus(self):
        """全食堂メニューの取得"""
        response = self.client.get('/api/cafeteria/list/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)
        
    def test_filter_cafeteria_menus_by_category(self):
        """カテゴリーによる食堂メニューのフィルタリング"""
        response = self.client.get('/api/cafeteria/list/?category=rice')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'チキンカレー')
        
    def test_cafeteria_menu_includes_nutrition(self):
        """食堂メニューに栄養情報が含まれる"""
        response = self.client.get('/api/cafeteria/list/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        menu = response.data[0]
        self.assertIn('calories', menu)
        self.assertIn('protein', menu)
        self.assertIn('fat', menu)
        self.assertIn('carbohydrates', menu)