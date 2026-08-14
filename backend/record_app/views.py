import os
import logging
import tempfile
from pathlib import Path
from datetime import date

from django.db.models import Count
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, viewsets, generics, permissions
from rest_framework.decorators import api_view, action, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .models import MealRecord, WeightRecord, CustomFood, CafeteriaMenu, CustomMenu
from .serializers import (
    MealRecordSerializer, MealRecordListSerializer,
    UserRegistrationSerializer, UserProfileSerializer, WeightRecordSerializer,
    CustomFoodSerializer, CafeteriaMenuSerializer,
    CustomMenuSerializer, CustomMenuListSerializer
)
from .business_logic.nutrition_calculator import NutritionCalculatorService
from .services import MealService, WeightService, CustomFoodService

logger = logging.getLogger(__name__)


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
@permission_classes([permissions.IsAuthenticated])
def process_nutrition_label(request):
    """栄養成分表示画像を受け取り Azure AI Vision で栄養素を抽出して返す。"""
    logger.info("=== OCR処理開始（意味ブロックアプローチ）===")
    logger.info(f"User: {request.user}")
    logger.info(f"FILES: {list(request.FILES.keys())}")

    if 'image' not in request.FILES:
        logger.warning("画像ファイルが送信されていません")
        return Response(
            {'error': '画像ファイルが必要です', 'success': False},
            status=status.HTTP_400_BAD_REQUEST
        )

    image_file = request.FILES['image']

    max_size = 10 * 1024 * 1024  # 10MB
    if image_file.size > max_size:
        logger.warning(f"ファイルサイズが制限を超えています: {image_file.size} bytes")
        return Response(
            {'error': 'ファイルサイズは10MB以下にしてください', 'success': False},
            status=status.HTTP_400_BAD_REQUEST
        )

    allowed_types = ['image/jpeg', 'image/png', 'image/webp']
    if image_file.content_type not in allowed_types:
        logger.warning(f"サポートされていないファイル形式: {image_file.content_type}")
        return Response(
            {'error': 'サポートされている形式: JPEG, PNG, WebP', 'success': False},
            status=status.HTTP_400_BAD_REQUEST
        )

    tmp_path = None

    try:
        suffix = Path(image_file.name).suffix or '.jpg'
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            for chunk in image_file.chunks():
                tmp.write(chunk)
            tmp_path = tmp.name

        logger.info(f"一時ファイル作成: {tmp_path}")

        from .business_logic.ocr_processor import NutritionOCRProcessor
        processor = NutritionOCRProcessor()
        result = processor.process_nutrition_label(tmp_path)

        logger.info(f"OCR処理完了: success={result.get('success')}")

        if result.get('success'):
            logger.info(f"抽出された栄養成分: {result.get('nutrition')}")

            debug_mode = os.getenv('DEBUG', 'False').lower() == 'true'

            response_data = {
                'success': True,
                'nutrition': result['nutrition'],
                'validation': result.get('validation', {}),
            }

            if debug_mode:
                response_data['detected_texts'] = result.get('detected_texts', [])

            return Response(response_data, status=status.HTTP_200_OK)
        else:
            logger.warning(f"OCR処理失敗: {result.get('error')}")
            return Response({
                'success': False,
                'error': result.get('error', 'OCR処理に失敗しました'),
                'nutrition': result.get('nutrition'),
                'detected_texts': result.get('detected_texts', [])
            }, status=status.HTTP_200_OK)

    except ImportError as e:
        logger.error(f"OCRライブラリのインポートエラー: {str(e)}")
        return Response(
            {
                'error': 'OCR機能が利用できません。システム管理者に連絡してください。',
                'success': False
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    except Exception as e:
        logger.exception("OCR処理中に予期しないエラーが発生しました")
        return Response(
            {'error': f'OCR処理に失敗しました: {str(e)}', 'success': False},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
                logger.info(f"一時ファイル削除: {tmp_path}")
            except Exception as e:
                logger.warning(f"一時ファイル削除失敗: {str(e)}")


class MealRecordViewSet(viewsets.ModelViewSet):
    """食事記録の CRUD ViewSet。"""
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = MealRecord.objects.filter(user=self.request.user)

        if self.action == 'list':
            # list では items の中身は不要。件数だけ annotation で取得し N+1 を回避
            qs = qs.annotate(items_count=Count('items'))
        else:
            qs = qs.prefetch_related('items')

        return qs.order_by('-record_date', '-created_at')

    def get_serializer_class(self):
        if self.action == 'list':
            return MealRecordListSerializer
        return MealRecordSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class WeightRecordViewSet(viewsets.ModelViewSet):
    """体重記録の CRUD ViewSet。"""
    serializer_class = WeightRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WeightRecord.objects.filter(user=self.request.user).order_by('-record_date')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        weight_data = serializer.validated_data['weight']
        record_date = serializer.validated_data.get('record_date', date.today())

        obj, created = WeightService.register_weight(
            user=request.user,
            weight=weight_data,
            record_date=record_date
        )

        response_serializer = self.get_serializer(obj)
        status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK

        return Response(response_serializer.data, status=status_code)


class CustomFoodViewSet(viewsets.ModelViewSet):
    """Myアイテムの CRUD ViewSet。"""
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
                'message': 'Myアイテムを作成しました',
                'food': {
                    'id': f'custom_{custom_food.id}',
                    'name': custom_food.name,
                    'type': 'custom'
                }
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({'error': str(e)}, status=400)


class CustomMenuViewSet(viewsets.ModelViewSet):
    """Myメニューの CRUD ViewSet。"""
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
        """Myメニューから食事記録を作成。"""
        custom_menu = self.get_object()
        try:
            meal_record = MealService.create_meal_from_menu(
                user=request.user,
                menu=custom_menu,
                data=request.data
            )
            serializer = MealRecordSerializer(meal_record)

            return Response({
                'message': '食事記録を作成しました',
                'meal_record': serializer.data
            }, status=201)

        except ValueError as e:
            return Response({'error': str(e)}, status=400)

    @action(detail=False, methods=['get'])
    def search(self, request):
        """Myメニューを検索。"""
        query = request.query_params.get('q', '')
        if not query:
            return Response({'error': '検索キーワードを指定してください'}, status=400)

        menus = self.get_queryset().filter(name__icontains=query)
        serializer = self.get_serializer(menus, many=True)
        return Response(serializer.data)


class MealTimingChoicesView(APIView):
    """食事タイミングの選択肢を返す。"""
    def get(self, request, *args, **kwargs):
        choices = MealRecord.MEAL_TIMING_CHOICES
        formatted_choices = [{"value": value, "label": label} for value, label in choices]
        return Response(formatted_choices)


class UserRegistrationView(generics.CreateAPIView):
    """ユーザー登録。"""
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]


class UserProfileView(generics.RetrieveAPIView):
    """ユーザープロフィール取得。"""
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class LogoutView(APIView):
    """トークン削除によるログアウト。"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        request.user.auth_token.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def search_foods(request):
    """データベースから食品を検索。"""
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
    """食品名のサジェストを取得。"""
    query = request.GET.get('q', '')
    if not query or len(query) < 2:
        return Response({'suggestions': []})

    calculator = NutritionCalculatorService()
    suggestions = calculator.get_food_suggestions(query)
    return Response({'suggestions': suggestions})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def calculate_nutrition(request):
    """指定量の栄養素を計算。"""
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
    """指定日の栄養素サマリーを取得。"""
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
    """カスタム食品を作成。"""
    try:
        custom_food = CustomFoodService.create_custom_food(request.user, request.data)
        return Response({
            'message': 'カスタム食品を作成しました',
            'food': {
                'id': f'custom_{custom_food.id}',
                'name': custom_food.name,
                'type': 'custom'
            }
        }, status=201)
    except Exception as e:
        return Response({'error': str(e)}, status=400)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def list_custom_foods(request):
    """ユーザーのカスタム食品一覧を取得。"""
    custom_foods = CustomFood.objects.filter(user=request.user).order_by('name')
    serializer = CustomFoodSerializer(custom_foods, many=True)
    return Response(serializer.data)


@api_view(['PUT'])
@permission_classes([permissions.IsAuthenticated])
def update_custom_food(request, food_id):
    """カスタム食品を更新。"""
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
    """カスタム食品を削除。"""
    try:
        custom_food = CustomFood.objects.get(id=food_id, user=request.user)
        custom_food.delete()
        return Response({'message': 'カスタム食品を削除しました'}, status=204)
    except CustomFood.DoesNotExist:
        return Response({'error': 'カスタム食品が見つかりません'}, status=404)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def list_cafeteria_menus(request):
    """食堂メニュー一覧を取得。"""
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
    """本番環境用ヘルスチェックエンドポイント。"""
    return JsonResponse({'status': 'healthy', 'service': 'kilogram-api'})
