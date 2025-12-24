# record_app/views.py

import os
import re
import logging
import tempfile
from pathlib import Path

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, viewsets, generics, permissions
from rest_framework.decorators import api_view, action, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny
from datetime import date
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

# OCR関連
import cv2
import numpy as np
from PIL import Image
import pytesseract

from .models import MealRecord, WeightRecord, CustomFood, CafeteriaMenu, CustomMenu
from .serializers import (
    MealRecordSerializer, MealRecordListSerializer, 
    UserRegistrationSerializer, WeightRecordSerializer,
    CustomFoodSerializer, CafeteriaMenuSerializer,
    CustomMenuSerializer, CustomMenuListSerializer
)
from .business_logic.nutrition_calculator import NutritionCalculatorService
from .services import MealService, WeightService, CustomFoodService

logger = logging.getLogger(__name__)


# ===============================
# OCR処理エンドポイント
# ===============================

@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
@permission_classes([permissions.IsAuthenticated])
def process_nutrition_label(request):
    """
    栄養成分表示のOCR処理
    
    画像を受け取り、Tesseractで文字認識を行い、
    栄養成分の数値を抽出して返す
    """
    logger.info("=== OCR処理開始 ===")
    logger.info(f"User: {request.user}")
    logger.info(f"FILES: {request.FILES}")
    logger.info(f"POST data: {request.POST}")
    
    if 'image' not in request.FILES:
        logger.error("画像ファイルが見つかりません")
        return Response(
            {'error': '画像ファイルが必要です'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    image_file = request.FILES['image']
    logger.info(f"受信ファイル: {image_file.name}, サイズ: {image_file.size} bytes")
    
    # ファイルサイズチェック (10MB)
    if image_file.size > 10 * 1024 * 1024:
        logger.error(f"ファイルサイズ超過: {image_file.size} bytes")
        return Response(
            {'error': 'ファイルサイズは10MB以下にしてください'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # 一時ファイルに保存
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp_file:
            for chunk in image_file.chunks():
                tmp_file.write(chunk)
            tmp_path = tmp_file.name
        
        logger.info(f"一時ファイル保存: {tmp_path}")
        
        # 画像読み込みと前処理
        img = cv2.imread(tmp_path)
        if img is None:
            logger.error("画像の読み込みに失敗")
            os.unlink(tmp_path)
            return Response(
                {'error': '画像の読み込みに失敗しました'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        logger.info(f"画像サイズ: {img.shape}")
        
        # グレースケール変換
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # ノイズ除去
        denoised = cv2.fastNlMeansDenoising(gray, None, h=10, templateWindowSize=7, searchWindowSize=21)
        
        # 適応的二値化
        binary = cv2.adaptiveThreshold(
            denoised, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            11, 2
        )
        
        # OCR実行（日本語+英語）
        logger.info("Tesseract OCR実行中...")
        custom_config = r'--oem 3 --psm 6 -c preserve_interword_spaces=1'
        ocr_text = pytesseract.image_to_string(
            binary,
            lang='jpn+eng',
            config=custom_config
        )
        
        logger.info(f"OCR結果テキスト長: {len(ocr_text)}")
        logger.debug(f"OCR結果:\n{ocr_text}")
        
        # 一時ファイル削除
        os.unlink(tmp_path)
        
        # 栄養成分を抽出
        nutrition_data = extract_nutrition_values(ocr_text)
        
        logger.info(f"抽出された栄養成分: {nutrition_data}")
        
        return Response({
            'success': True,
            'nutrition': nutrition_data,
            'raw_text': ocr_text if os.getenv('DEBUG', 'False') == 'True' else None
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.exception("OCR処理中にエラーが発生しました")
        if 'tmp_path' in locals() and os.path.exists(tmp_path):
            os.unlink(tmp_path)
        return Response(
            {'error': f'OCR処理に失敗しました: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def extract_nutrition_values(text):
    """
    OCRで認識されたテキストから栄養成分の数値を抽出
    """
    nutrition_data = {
        # 基本栄養素
        'calories': None,
        'protein': None,
        'fat': None,
        'carbohydrates': None,
        # 詳細栄養素
        'dietary_fiber': None,
        'sodium': None,
        'calcium': None,
        'iron': None,
        'vitamin_a': None,
        'vitamin_b1': None,
        'vitamin_b2': None,
        'vitamin_c': None,
    }
    
    # テキストを正規化（全角→半角、改行を保持）
    text = normalize_text(text)
    
    # 各栄養素のパターン定義
    patterns = {
        'calories': [
            r'エネルギー[:\s]*([0-9.]+)\s*(?:kcal|キロカロリー)',
            r'熱量[:\s]*([0-9.]+)\s*(?:kcal|キロカロリー)',
            r'カロリー[:\s]*([0-9.]+)',
        ],
        'protein': [
            r'(?:たんぱく質|タンパク質|蛋白質|たん白質)[:\s]*([0-9.]+)\s*g',
            r'protein[:\s]*([0-9.]+)\s*g',
        ],
        'fat': [
            r'脂質[:\s]*([0-9.]+)\s*g',
            r'fat[:\s]*([0-9.]+)\s*g',
        ],
        'carbohydrates': [
            r'炭水化物[:\s]*([0-9.]+)\s*g',
            r'糖質[:\s]*([0-9.]+)\s*g',
            r'carbohydrate[:\s]*([0-9.]+)\s*g',
        ],
        'dietary_fiber': [
            r'食物繊維[:\s]*([0-9.]+)\s*g',
            r'食物せんい[:\s]*([0-9.]+)\s*g',
            r'fiber[:\s]*([0-9.]+)\s*g',
        ],
        'sodium': [
            r'ナトリウム[:\s]*([0-9.]+)\s*mg',
            r'食塩相当量[:\s]*([0-9.]+)\s*g',
            r'sodium[:\s]*([0-9.]+)\s*mg',
        ],
        'calcium': [
            r'カルシウム[:\s]*([0-9.]+)\s*mg',
            r'calcium[:\s]*([0-9.]+)\s*mg',
        ],
        'iron': [
            r'鉄[:\s]*([0-9.]+)\s*mg',
            r'iron[:\s]*([0-9.]+)\s*mg',
        ],
        'vitamin_a': [
            r'ビタミンa[:\s]*([0-9.]+)\s*(?:μg|mcg|ug)',
            r'vitamin\s*a[:\s]*([0-9.]+)\s*(?:μg|mcg|ug)',
        ],
        'vitamin_b1': [
            r'ビタミンb1[:\s]*([0-9.]+)\s*mg',
            r'vitamin\s*b1[:\s]*([0-9.]+)\s*mg',
        ],
        'vitamin_b2': [
            r'ビタミンb2[:\s]*([0-9.]+)\s*mg',
            r'vitamin\s*b2[:\s]*([0-9.]+)\s*mg',
        ],
        'vitamin_c': [
            r'ビタミンc[:\s]*([0-9.]+)\s*mg',
            r'vitamin\s*c[:\s]*([0-9.]+)\s*mg',
        ],
    }
    
    # 各栄養素について値を検索
    for nutrient, pattern_list in patterns.items():
        for pattern in pattern_list:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    value = float(match.group(1))
                    nutrition_data[nutrient] = value
                    logger.debug(f"{nutrient}を検出: {value}")
                    break  # 最初に見つかったパターンを採用
                except (ValueError, IndexError):
                    continue
    
    return nutrition_data


def normalize_text(text):
    """
    テキストを正規化（全角→半角変換など）
    """
    import unicodedata
    
    # 全角英数字を半角に変換
    text = unicodedata.normalize('NFKC', text)
    
    # 余分な空白を削除（ただし改行は保持）
    lines = text.split('\n')
    normalized_lines = [' '.join(line.split()) for line in lines]
    text = '\n'.join(normalized_lines)
    
    return text


# ===============================
# ViewSets
# ===============================

class MealRecordViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return MealRecord.objects.filter(
            user=self.request.user
        ).prefetch_related('items').order_by('-record_date', '-created_at')
    
    def get_serializer_class(self):
        if self.action == 'list':
            return MealRecordListSerializer
        return MealRecordSerializer
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class WeightRecordViewSet(viewsets.ModelViewSet):
    serializer_class = WeightRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WeightRecord.objects.filter(user=self.request.user).order_by('-record_date')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        weight_data = serializer.validated_data['weight']
        record_date = serializer.validated_data['record_date']
        
        obj, created = WeightService.register_weight(
            user=request.user,
            weight=weight_data,
            record_date=record_date
        )
        
        response_serializer = self.get_serializer(obj)
        status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(response_serializer.data, status=status_code)


class CustomFoodViewSet(viewsets.ModelViewSet):
    serializer_class = CustomFoodSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CustomFood.objects.filter(user=self.request.user).order_by('name')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'])
    def create_from_meal(self, request):
        try:
            custom_food = CustomFoodService.create_custom_food(request.user, request.data)
            return Response({
                'message': 'カスタム食品を作成しました',
                'food': {
                    'id': f'custom_{custom_food.id}',
                    'name': custom_food.name,
                    'type': 'custom'
                }
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=400)


class CustomMenuViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return CustomMenu.objects.filter(
            user=self.request.user
        ).prefetch_related('items').order_by('-updated_at')
    
    def get_serializer_class(self):
        if self.action == 'list':
            return CustomMenuListSerializer
        return CustomMenuSerializer
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def create_meal_from_menu(self, request, pk=None):
        custom_menu = self.get_object()
        try:
            meal_record = MealService.create_meal_from_menu(
                user=request.user,
                menu=custom_menu,
                data=request.data
            )
            serializer = MealRecordSerializer(meal_record)
            return Response({'message': '食事記録を作成しました', 'meal_record': serializer.data}, status=201)
        except ValueError as e:
            return Response({'error': str(e)}, status=400)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        query = request.query_params.get('q', '')
        if not query:
            return Response({'error': '検索キーワードを指定してください'}, status=400)
        menus = self.get_queryset().filter(name__icontains=query)
        serializer = self.get_serializer(menus, many=True)
        return Response(serializer.data)


# ===============================
# Generic Views
# ===============================

class MealTimingChoicesView(APIView):
    def get(self, request, *args, **kwargs):
        choices = MealRecord.MEAL_TIMING_CHOICES
        formatted_choices = [{"value": value, "label": label} for value, label in choices]
        return Response(formatted_choices)


class UserRegistrationView(generics.CreateAPIView):
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]


# ===============================
# API Functions
# ===============================

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def search_foods(request):
    query = request.GET.get('q', '')
    if not query:
        return Response({'error': '検索キーワードが必要です'}, status=400)
    if len(query) < 2:
        return Response({'foods': []})
    
    calculator = NutritionCalculatorService()
    results = calculator.search_foods(query)
    return Response({'foods': results})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def food_suggestions(request):
    query = request.GET.get('q', '')
    if not query or len(query) < 2:
        return Response({'suggestions': []})
    calculator = NutritionCalculatorService()
    suggestions = calculator.get_food_suggestions(query)
    return Response({'suggestions': suggestions})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def calculate_nutrition(request):
    food_id = request.data.get('food_id')
    amount = request.data.get('amount', 100)
    if not food_id:
        return Response({'error': 'food_idが必要です'}, status=400)
    try:
        calculator = NutritionCalculatorService()
        nutrition = calculator.calculate_nutrition_for_amount(food_id, float(amount))
        return Response({'nutrition': nutrition, 'amount': amount})
    except ValueError as e:
        return Response({'error': str(e)}, status=400)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def daily_nutrition_summary(request):
    target_date_str = request.GET.get('date')
    if target_date_str:
        try:
            target_date = date.fromisoformat(target_date_str)
        except ValueError:
            return Response({'error': '日付形式が正しくありません'}, status=400)
    else:
        target_date = date.today()
    
    calculator = NutritionCalculatorService()
    summary = calculator.get_daily_nutrition_summary(request.user, target_date)
    return Response({'date': target_date, 'nutrition_summary': summary})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_custom_food(request):
    try:
        custom_food = CustomFoodService.create_custom_food(request.user, request.data)
        return Response({
            'message': 'カスタム食品を作成しました',
            'food': {'id': f'custom_{custom_food.id}', 'name': custom_food.name, 'type': 'custom'}
        }, status=201)
    except Exception as e:
        return Response({'error': str(e)}, status=400)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def list_custom_foods(request):
    custom_foods = CustomFood.objects.filter(user=request.user).order_by('name')
    serializer = CustomFoodSerializer(custom_foods, many=True)
    return Response(serializer.data)


@api_view(['PUT'])
@permission_classes([permissions.IsAuthenticated])
def update_custom_food(request, food_id):
    try:
        custom_food = CustomFood.objects.get(id=food_id, user=request.user)
        serializer = CustomFoodSerializer(custom_food, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
    except CustomFood.DoesNotExist:
        return Response({'error': 'カスタム食品が見つかりません'}, status=404)


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def delete_custom_food(request, food_id):
    try:
        custom_food = CustomFood.objects.get(id=food_id, user=request.user)
        custom_food.delete()
        return Response({'message': 'カスタム食品を削除しました'}, status=204)
    except CustomFood.DoesNotExist:
        return Response({'error': 'カスタム食品が見つかりません'}, status=404)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def list_cafeteria_menus(request):
    category = request.GET.get('category')
    menus = CafeteriaMenu.objects.all()
    if category:
        menus = menus.filter(category=category)
    serializer = CafeteriaMenuSerializer(menus, many=True)
    return Response(serializer.data)


@csrf_exempt
@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return JsonResponse({'status': 'healthy', 'service': 'kilogram-api'})