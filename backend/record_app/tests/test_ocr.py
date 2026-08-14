from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token
from django.core.files.uploadedfile import SimpleUploadedFile

from record_app.business_logic.ocr_processor import (
    AzureVisionUnavailableError,
    NutritionOCRProcessor,
    OCRPostProcessor,
    NutritionExtractor,
    NutritionValidator,
)


# =============================================================================
# OCR後処理テスト
# =============================================================================

class OCRPostProcessorTests(TestCase):
    """OCR誤認識補正のテスト"""

    def test_correct_nutrient_names(self):
        """栄養素名の誤認識補正"""
        processor = OCRPostProcessor()

        self.assertIn('たんぱく質', processor.correct_text('たんぱく貿'))
        self.assertIn('脂質', processor.correct_text('脂貿'))
        self.assertIn('炭水化物', processor.correct_text('炭水イヒ物'))
        self.assertIn('エネルギー', processor.correct_text('工ネルギー'))

    def test_correct_unit_errors(self):
        """単位の誤認識補正"""
        processor = OCRPostProcessor()

        self.assertIn('g', processor.correct_text('10』'))
        self.assertIn('kcal', processor.correct_text('100kca1'))

    def test_extract_numeric_value(self):
        """数値抽出"""
        self.assertEqual(OCRPostProcessor.extract_numeric_value('49kcal'), 49.0)
        self.assertEqual(OCRPostProcessor.extract_numeric_value('3.3g'), 3.3)
        self.assertEqual(OCRPostProcessor.extract_numeric_value('100'), 100.0)

    def test_extract_numeric_value_none_for_no_number(self):
        """数値がない場合はNone"""
        self.assertIsNone(OCRPostProcessor.extract_numeric_value('テスト'))


# =============================================================================
# 栄養素抽出テスト
# =============================================================================

class NutritionExtractorTests(TestCase):
    """NutritionExtractorの単体テスト"""

    def test_extract_from_lines_basic(self):
        """基本的な栄養素行からの抽出"""
        extractor = NutritionExtractor()

        lines = [
            'エネルギー 250kcal',
            'たんぱく質 15.5g',
        ]

        result = extractor.extract_from_lines(lines)
        self.assertEqual(result['calories'], 250.0)
        self.assertEqual(result['protein'], 15.5)

    def test_extract_inline_format(self):
        """インライン形式（読点区切り）からの抽出"""
        extractor = NutritionExtractor()

        lines = ['熱量16kcal、たんぱく質1.6g、脂質0g']

        result = extractor.extract_from_lines(lines)
        self.assertEqual(result['calories'], 16.0)
        self.assertEqual(result['protein'], 1.6)
        self.assertEqual(result['fat'], 0.0)


# =============================================================================
# 整合性検証テスト
# =============================================================================

class NutritionValidatorTests(TestCase):
    """NutritionValidatorの単体テスト"""

    def test_valid_nutrition(self):
        """整合性のある栄養素データ"""
        nutrition = {
            'calories': 200,
            'protein': 10,
            'fat': 8,
            'carbohydrates': 20,
        }
        result = NutritionValidator.validate(nutrition)
        self.assertTrue(result['is_valid'])

    def test_energy_mismatch(self):
        """エネルギー計算式との乖離検出"""
        nutrition = {
            'calories': 1000,  # 計算値と大きく乖離
            'protein': 10,     # 40kcal
            'fat': 5,          # 45kcal
            'carbohydrates': 20,  # 80kcal

        }
        result = NutritionValidator.validate(nutrition)
        self.assertFalse(result['is_valid'])

        warning_types = [w['type'] for w in result['warnings']]
        self.assertIn('energy_mismatch', warning_types)

    def test_none_values_no_crash(self):
        """None値でもクラッシュしない"""
        nutrition = {
            'calories': None,
            'protein': None,
            'fat': None,
            'carbohydrates': None,
        }
        result = NutritionValidator.validate(nutrition)
        self.assertTrue(result['is_valid'])


# =============================================================================
# NutritionOCRProcessor テスト
# =============================================================================

class NutritionLabelOCRTests(TestCase):
    """NutritionOCRProcessorの単体テスト"""

    def test_ocr_initialization(self):
        """OCRプロセッサの初期化（Azureクライアントの遅延生成確認）"""
        processor = NutritionOCRProcessor()
        self.assertIsNone(processor._client)

    def test_parse_nutrition_values(self):
        """栄養素パース（OCRPostProcessorの統合テスト）"""
        processor = OCRPostProcessor()

        self.assertEqual(processor.extract_numeric_value('100kcal'), 100.0)
        self.assertEqual(processor.extract_numeric_value('3.5g'), 3.5)
        self.assertEqual(processor.extract_numeric_value('0.8mg'), 0.8)

    @patch.object(NutritionOCRProcessor, '_extract_lines')
    def test_extract_nutrition_from_image(self, mock_extract_lines):
        """画像からの栄養素抽出（モック版）"""
        mock_extract_lines.return_value = [
            'エネルギー 250kcal',
            'たんぱく質 15g',
            '脂質 8g',
            '炭水化物 30g',
        ]

        processor = NutritionOCRProcessor()
        result = processor.process_nutrition_label('/tmp/test.jpg')

        self.assertTrue(result['success'])
        self.assertIsNotNone(result['nutrition'])

    @patch.object(NutritionOCRProcessor, '_extract_lines')
    def test_handle_invalid_image(self, mock_extract_lines):
        """無効な画像のハンドリング"""
        mock_extract_lines.side_effect = Exception("画像読み込みエラー")

        processor = NutritionOCRProcessor()
        result = processor.process_nutrition_label('/tmp/invalid.jpg')

        self.assertFalse(result['success'])
        self.assertIn('error', result)

    @patch.dict('os.environ', {'AZURE_VISION_ENDPOINT': '', 'AZURE_VISION_KEY': ''})
    def test_azure_not_configured_returns_failure(self):
        """Azure未設定時はクラッシュせず success=False を返す"""
        processor = NutritionOCRProcessor()

        with self.assertRaises(AzureVisionUnavailableError):
            processor.client

        result = processor.process_nutrition_label('/tmp/test.jpg')

        self.assertFalse(result['success'])
        self.assertIsNone(result['nutrition'])
        self.assertIn('error', result)


# =============================================================================
# OCR APIテスト
# =============================================================================

class OCRAPITests(APITestCase):
    """OCR APIエンドポイントのテスト"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='testpass123')
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        self.ocr_url = '/api/ocr/nutrition-label/'

    def test_upload_without_image_fails(self):
        """画像なしのリクエストは400エラー"""
        response = self.client.post(self.ocr_url, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('record_app.business_logic.ocr_processor.NutritionOCRProcessor')
    def test_upload_nutrition_label(self, mock_processor_cls):
        """栄養成分ラベルのアップロード"""
        mock_processor = MagicMock()
        mock_processor.process_nutrition_label.return_value = {
            'success': True,
            'nutrition': {
                'calories': 250.0,
                'protein': 15.0,
                'fat': 8.0,
                'carbohydrates': 30.0,
            },
            'validation': {'is_valid': True, 'warnings': []},
            'detected_texts': ['エネルギー', '250kcal'],
        }
        mock_processor_cls.return_value = mock_processor

        image_content = b'\x89PNG\r\n\x1a\n' + b'\x00' * 100
        image = SimpleUploadedFile(
            'test.png', image_content, content_type='image/png'
        )

        response = self.client.post(self.ocr_url, {'image': image}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])

    def test_upload_oversized_image_fails(self):
        """10MBを超える画像は400エラー"""
        large_content = b'\x89PNG\r\n\x1a\n' + b'\x00' * (11 * 1024 * 1024)
        image = SimpleUploadedFile(
            'large.png', large_content, content_type='image/png'
        )

        response = self.client.post(self.ocr_url, {'image': image}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_upload_invalid_file_type_fails(self):
        """非画像ファイルは400エラー"""
        text_file = SimpleUploadedFile(
            'test.txt', b'not an image', content_type='text/plain'
        )

        response = self.client.post(self.ocr_url, {'image': text_file}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# =============================================================================
# OCR統合テスト
# =============================================================================

class TestOCRIntegration(TestCase):
    """OCRパイプラインの統合テスト"""

    @patch.object(NutritionOCRProcessor, '_extract_lines')
    def test_full_ocr_pipeline(self, mock_extract_lines):
        """OCR処理パイプライン全体のテスト"""
        mock_extract_lines.return_value = [
            'エネルギー 350kcal',
            'たんぱく質 20g',
            '脂質 12g',
            '炭水化物 40g',
        ]

        processor = NutritionOCRProcessor()
        result = processor.process_nutrition_label('/tmp/test_label.jpg')

        self.assertTrue(result['success'])
        nutrition = result['nutrition']
        self.assertEqual(nutrition['calories'], 350.0)
        self.assertEqual(nutrition['protein'], 20.0)
        self.assertEqual(nutrition['fat'], 12.0)
        self.assertEqual(nutrition['carbohydrates'], 40.0)

    @patch.object(NutritionOCRProcessor, '_extract_lines')
    def test_ocr_with_empty_result(self, mock_extract_lines):
        """OCRがテキストを検出できない場合"""
        mock_extract_lines.return_value = []

        processor = NutritionOCRProcessor()
        result = processor.process_nutrition_label('/tmp/blank.jpg')

        self.assertFalse(result['success'])

    @patch.object(NutritionOCRProcessor, '_extract_lines')
    def test_ocr_without_nutrition_text(self, mock_extract_lines):
        """テキストは取れたが栄養素情報が含まれない場合"""
        mock_extract_lines.return_value = ['abc', '販売者 サンプル株式会社']

        processor = NutritionOCRProcessor()
        result = processor.process_nutrition_label('/tmp/blurry.jpg')

        self.assertFalse(result['success'])
