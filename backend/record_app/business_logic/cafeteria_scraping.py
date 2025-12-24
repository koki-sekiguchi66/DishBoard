import requests
from bs4 import BeautifulSoup
import re
import time
from ..models import CafeteriaMenu

class CafeteriaScraper:
    """食堂メニュースクレイピング"""
    
    BASE_URL = 'https://west2-univ.jp/sp/menu.php?t=650118'
    MENU_LOAD_URL = 'https://west2-univ.jp/sp/menu_load.php'
    
    # データベースのカテゴリー値のマッピング
    CATEGORY_MAP = {
        'on_a': 'main',
        'on_b': 'side',
        'on_c': 'noodle',
        'on_d': 'rice',
        'on_e': 'dessert',
        'on_bunrui1': 'order',
        'on_bunrui2': 'kebab',
        'on_bunrui3': 'parfait',
        'on_bunrui4': 'night',
    }
    
    def __init__(self):
        """セッションを初期化"""
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
            'Connection': 'keep-alive',
        })
    
    def fetch_and_update_menus(self):
        """メニュー情報を取得してデータベースを更新"""
        try:
            print("=== スクレイピング開始 ===")
            menus = []
            
            for category_id, category_code in self.CATEGORY_MAP.items():
                print(f"\nカテゴリー処理中: {category_id} ({category_code})")
                
                # 各カテゴリーのメニューを動的に取得
                category_menus = self._fetch_category_menus(category_id, category_code)
                menus.extend(category_menus)
                print(f"  → {len(category_menus)}件のメニューを取得")
                
                # サーバーに負荷をかけないよう少し待機
                time.sleep(0.5)
            
            print(f"\n=== 合計 {len(menus)}件のメニューを取得 ===")
            
            # データベースを更新
            if menus:
                CafeteriaMenu.objects.all().delete()
                CafeteriaMenu.objects.bulk_create([
                    CafeteriaMenu(**menu) for menu in menus
                ])
                print("データベース更新完了")
            else:
                print("警告: メニューが1件も取得できませんでした")
            
            return len(menus)
            
        except Exception as e:
            print(f"エラー発生: {str(e)}")
            raise Exception(f"メニュー取得に失敗しました: {str(e)}")
    
    def _fetch_category_menus(self, category_id, category_code):
        """特定カテゴリーのメニューを取得"""
        try:
            # menu_load.phpを使用してカテゴリーのメニューを取得
            params = {
                't': '650118',
                'a': category_id
            }
            
            response = self.session.get(self.MENU_LOAD_URL, params=params, timeout=10)
            response.encoding = 'utf-8'
            
            if not response.text or 'Loaded' not in response.text:
                print(f"  警告: {category_id}のデータが空です")
                return []
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # ulタグを探す
            ul = soup.find('ul')
            if not ul:
                print(f"  警告: {category_id}にulタグが見つかりません")
                return []
            
            menu_items = ul.find_all('li')
            print(f"  {len(menu_items)}個のli要素を発見")
            
            menus = []
            for item in menu_items:
                menu_data = self._parse_menu_item(item, category_code)
                if menu_data:
                    menus.append(menu_data)
                    print(f"    - {menu_data['name']}")
            
            return menus
            
        except requests.exceptions.RequestException as e:
            print(f"  エラー: {category_id}の取得に失敗 - {str(e)}")
            return []
    
    def _parse_menu_item(self, item, category):
        """個別メニュー項目をパース"""
        link = item.find('a')
        if not link:
            return None
        
        detail_url = link.get('href', '')
        if not detail_url:
            return None
        
        # メニューIDを抽出
        menu_id = None
        if 'c=' in detail_url:
            menu_id = detail_url.split('c=')[-1].split('&')[0]
        
        if not menu_id:
            return None
        
        # メニュー名を取得
        h3 = item.find('h3')
        if not h3:
            return None
        
        # h3の最初のテキストノードがメニュー名
        name = h3.contents[0].strip() if h3.contents else None
        if not name:
            return None
        
        # 詳細ページから栄養素情報を取得
        nutrition = self._fetch_nutrition_detail(menu_id)
        
        return {
            'menu_id': menu_id,
            'name': name,
            'category': category,
            **nutrition
        }
    
    def _fetch_nutrition_detail(self, menu_id):
        """詳細ページから栄養素情報を取得"""
        try:
            detail_url = f'https://west2-univ.jp/sp/detail.php?t=650118&c={menu_id}'
            
            response = self.session.get(detail_url, timeout=10)
            response.encoding = 'utf-8'
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # ul.detailを探す
            detail_list = soup.find('ul', class_='detail')
            if not detail_list:
                print(f"      警告: メニューID {menu_id} の栄養情報が見つかりません")
                return self._empty_nutrition()
            
            nutrition = {}
            items = detail_list.find_all('li')
            
            for li in items:
                strong = li.find('strong')
                if not strong:
                    continue
                
                label = strong.text.strip()
                
                # span.priceから値を取得
                price_span = li.find('span', class_='price')
                if not price_span:
                    continue
                
                value_text = price_span.text.strip()
                
                # 数値を抽出
                try:
                    number_match = re.search(r'([\d.]+)', value_text)
                    if number_match:
                        value = float(number_match.group(1))
                    else:
                        value = 0.0
                except (ValueError, AttributeError):
                    value = 0.0
                
                # フィールドマッピング
                field_map = {
                    'エネルギー': 'calories',
                    'タンパク質': 'protein',
                    'たんぱく質': 'protein',
                    '脂質': 'fat',
                    '炭水化物': 'carbohydrates',
                    '食物繊維': 'dietary_fiber',
                    '食塩相当量': 'sodium',
                    'カルシウム': 'calcium',
                    '鉄': 'iron',
                    'ビタミン A': 'vitamin_a',
                    'ビタミンA': 'vitamin_a',
                    'ビタミン B1': 'vitamin_b1',
                    'ビタミンB1': 'vitamin_b1',
                    'ビタミン B2': 'vitamin_b2',
                    'ビタミンB2': 'vitamin_b2',
                    'ビタミン C': 'vitamin_c',
                    'ビタミンC': 'vitamin_c',
                }
                
                field = field_map.get(label)
                if field:
                    nutrition[field] = value
            
            # 少し待機
            time.sleep(0.3)
            
            return {**self._empty_nutrition(), **nutrition}
            
        except requests.exceptions.RequestException as e:
            print(f"      エラー: メニューID {menu_id} の栄養素取得失敗 - {str(e)}")
            return self._empty_nutrition()
    
    def _empty_nutrition(self):
        """空の栄養素データを返す"""
        return {
            'calories': 0.0,
            'protein': 0.0,
            'fat': 0.0,
            'carbohydrates': 0.0,
            'dietary_fiber': 0.0,
            'sodium': 0.0,
            'calcium': 0.0,
            'iron': 0.0,
            'vitamin_a': 0.0,
            'vitamin_b1': 0.0,
            'vitamin_b2': 0.0,
            'vitamin_c': 0.0,
        }