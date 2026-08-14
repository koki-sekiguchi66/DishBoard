"""
栄養成分表示OCRプロセッサ（Azure AI Vision 版）

処理フロー:
1. Azure AI Vision Read API で画像からテキスト行を抽出（位置情報付き）
2. Azure が返す行を上→下・左→右にソートして結合
3. NutritionExtractor で栄養素を抽出（既存ロジック再利用）
4. OCRPostProcessor で誤認識補正（既存ロジック再利用）
5. NutritionValidator で整合性検証（既存ロジック再利用）
"""
import os
import re
from typing import List, Dict, Optional, Any
import logging

from azure.ai.vision.imageanalysis import ImageAnalysisClient
from azure.ai.vision.imageanalysis.models import VisualFeatures
from azure.core.credentials import AzureKeyCredential
from azure.core.exceptions import HttpResponseError

logger = logging.getLogger(__name__)


class AzureVisionUnavailableError(RuntimeError):
    """Azure Vision の設定不足・呼び出し失敗を表す明示的な例外"""


class OCRPostProcessor:
    """OCR で頻出する誤認識パターンを文脈に応じて補正するクラス。"""

    NUMERIC_CORRECTIONS = {
        'O': '0', 'o': '0', 'Q': '0', 'D': '0',
        'l': '1', 'I': '1', '|': '1', 'i': '1',
        'S': '5', 's': '5',
        'B': '8',
        'g': '9', 'q': '9',
        'Z': '2', 'z': '2',
        '。': '.',
        '、': '.',
        '．': '.',
        '，': ',',
    }

    UNIT_CORRECTIONS = {
        '』': 'g', '』g': 'g', 'ブ': 'g', '呂': 'g', '９': 'g',
        'ダ': 'g', 'グ': 'g', 'ク': 'g', 'り': 'g', '𝗀': 'g', 'ɡ': 'g', 'ｇ': 'g',
        'kcaI': 'kcal', 'kca1': 'kcal', 'КcaI': 'kcal', 'kcaL': 'kcal',
        'Kcal': 'kcal', 'KCal': 'kcal', 'KCAL': 'kcal', 'КcaL': 'kcal', 'kcaｌ': 'kcal',
        'mg': 'mg', 'Mg': 'mg', 'MG': 'mg', 'm9': 'mg', 'mq': 'mg', 'ｍｇ': 'mg',
        'μg': 'μg', 'ug': 'μg', 'mcg': 'μg', 'ΜG': 'μg', 'µg': 'μg',
    }

    NUTRIENT_NAME_CORRECTIONS = {
        'たんぱく貿': 'たんぱく質', 'タンパク貿': 'タンパク質', '蛋白貿': '蛋白質',
        'たん白質': 'たんぱく質', 'たん自質': 'たんぱく質', 'たんぱく買': 'たんぱく質',
        'タンパク買': 'タンパク質', 'たんはく質': 'たんぱく質',
        '脂貿': '脂質', '脂買': '脂質', '脂賀': '脂質',
        '糖貿': '糖質', '糖買': '糖質',
        '炭水イヒ物': '炭水化物', '炭水化勿': '炭水化物', '炭水イ匕物': '炭水化物',
        '炭水仁物': '炭水化物', '炭水亿物': '炭水化物',
        '食物線維': '食物繊維', '食物繊椎': '食物繊維', '食物せんい': '食物繊維', '食物線椎': '食物繊維',
        '工ネルギー': 'エネルギー', 'エネルギ一': 'エネルギー', 'カロリ一': 'カロリー',
        '熟量': '熱量', '然量': '熱量', '勲量': '熱量', '熱星': '熱量',
        'ナトリウ厶': 'ナトリウム', 'カルシウ厶': 'カルシウム', 'マグネシウ厶': 'マグネシウム',
        '食塩相当量': '食塩相当量', '食塩相当星': '食塩相当量', '食鹽相当量': '食塩相当量',
        '良眞相当一': '食塩相当量', '良塩相当量': '食塩相当量', '食温相当量': '食塩相当量',
    }

    # 2桁・3桁の数字が誤認識単位で終わる場合に小数点を挿入して g に変換
    # 例: "18』" → "1.8g", "53』" → "5.3g"
    NUMERIC_UNIT_PATTERNS = [
        (r'(\d)(\d)[』ブ呂ダグクり]$', r'\1.\2g'),
        (r'(\d)(\d)[』ブ呂ダグクり]([^a-zA-Z])', r'\1.\2g\3'),
        (r'(\d)(\d)(\d)[』ブ呂ダグクり]$', r'\1\2.\3g'),
        (r'(\d+)[』ブ呂ダグクり]$', r'\1g'),
        (r'(\d+)[』ブ呂ダグクり]([^a-zA-Z])', r'\1g\2'),
    ]

    @classmethod
    def correct_text(cls, text: str) -> str:
        result = text
        for wrong, correct in cls.NUTRIENT_NAME_CORRECTIONS.items():
            result = result.replace(wrong, correct)
        for wrong, correct in cls.UNIT_CORRECTIONS.items():
            result = result.replace(wrong, correct)
        for pattern, replacement in cls.NUMERIC_UNIT_PATTERNS:
            result = re.sub(pattern, replacement, result)
        return result

    @classmethod
    def correct_nutrient_text(cls, text: str) -> str:
        return cls.correct_text(text)

    @classmethod
    def correct_numeric_value(cls, text: str) -> str:
        result = []
        for char in text:
            if char in cls.NUMERIC_CORRECTIONS:
                result.append(cls.NUMERIC_CORRECTIONS[char])
            else:
                result.append(char)
        return ''.join(result)

    @classmethod
    def extract_numeric_value(cls, text: str) -> Optional[float]:
        corrected_text = cls.correct_text(text)

        patterns = [
            r'([0-9]+\.?[0-9]*)',
            r'([0-9OoQDlI|]+\.?[0-9OoQDlI|]*)',
        ]

        for pattern in patterns:
            matches = re.findall(pattern, corrected_text)

            for match in matches:
                corrected = cls.correct_numeric_value(match)
                corrected = corrected.replace(',', '').replace('。', '.').replace('、', '')

                try:
                    value = float(corrected)
                    if 0 <= value <= 10000:
                        return value
                except ValueError:
                    continue

        return None


class NutritionExtractor:
    """テキスト行から栄養素情報を抽出する。"""

    NUTRIENT_PATTERNS = {
        'calories': [
            r'(?:エネルギー|熱量|カロリー)[:\s：]*([0-9OoQDlI|.,]+)\s*(?:kcal|キロカロリー|㎉)',
            r'(?:エネルギー|熱量|カロリー)[:\s：]*([0-9OoQDlI|.,]+)',
            r'([0-9OoQDlI|.,]+)\s*(?:kcal|キロカロリー|㎉)',
        ],
        'protein': [
            r'(?:たんぱく質|タンパク質|蛋白質|たん白質)[:\s：]*([0-9OoQDlI|.,]+)\s*g',
            r'(?:たんぱく質|タンパク質|蛋白質|たん白質)[:\s：]*([0-9OoQDlI|.,]+)',
        ],
        'fat': [
            r'脂質[:\s：]*([0-9OoQDlI|.,]+)\s*g',
            r'脂質[:\s：]*([0-9OoQDlI|.,]+)',
        ],
        'carbohydrates': [
            r'炭水化物[:\s：]*([0-9OoQDlI|.,]+)\s*g',
            r'炭水化物[:\s：]*([0-9OoQDlI|.,]+)',
        ],
        'sugar': [
            r'(?:糖質|糖類)[:\s：]*([0-9OoQDlI|.,]+)\s*g',
            r'(?:糖質|糖類)[:\s：]*([0-9OoQDlI|.,]+)',
        ],
        'dietary_fiber': [
            r'食物繊維[:\s：]*([0-9OoQDlI|.,]+)\s*g',
            r'食物繊維[:\s：]*([0-9OoQDlI|.,]+)',
        ],
        'sodium': [
            r'食塩相当量[:\s：]*([0-9OoQDlI|.,]+)\s*g',
            r'ナトリウム[:\s：]*([0-9OoQDlI|.,]+)\s*mg',
            r'Na[:\s：]*([0-9OoQDlI|.,]+)\s*mg',
        ],
        'calcium': [
            r'カルシウム[:\s：]*([0-9OoQDlI|.,]+)\s*mg',
            r'Ca[:\s：]*([0-9OoQDlI|.,]+)\s*mg',
        ],
        'iron': [
            r'鉄[:\s：]*([0-9OoQDlI|.,]+)\s*mg',
            r'Fe[:\s：]*([0-9OoQDlI|.,]+)\s*mg',
        ],
        'vitamin_a': [
            r'ビタミン[AＡ][:\s：]*([0-9OoQDlI|.,]+)\s*(?:μg|mcg|ug)',
        ],
        'vitamin_b1': [
            r'ビタミン[BＢ][1１][:\s：]*([0-9OoQDlI|.,]+)\s*mg',
        ],
        'vitamin_b2': [
            r'ビタミン[BＢ][2２][:\s：]*([0-9OoQDlI|.,]+)\s*mg',
        ],
        'vitamin_c': [
            r'ビタミン[CＣ][:\s：]*([0-9OoQDlI|.,]+)\s*mg',
        ],
    }

    def __init__(self):
        self.post_processor = OCRPostProcessor()

    def extract_from_lines(
        self,
        lines: List[str]
    ) -> Dict[str, Optional[float]]:
        """同じ栄養素が複数行で検出された場合は最初の値を採用する。"""
        nutrition: Dict[str, Optional[float]] = {
            'calories': None, 'protein': None, 'fat': None, 'carbohydrates': None,
            'sugar': None, 'dietary_fiber': None, 'sodium': None, 'calcium': None,
            'iron': None, 'vitamin_a': None, 'vitamin_b1': None,
            'vitamin_b2': None, 'vitamin_c': None,
        }

        for line in lines:
            text = self.post_processor.correct_text(line)
            logger.debug(f"Processing line: '{line}' -> '{text}'")

            sub_texts = self._split_inline_text(text)

            for sub_text in sub_texts:
                self._extract_from_text(sub_text, nutrition)

        return nutrition

    def _split_inline_text(self, text: str) -> List[str]:
        """「熱量16kcal、たんぱく質1.6g、脂質0g」のようなインライン形式を読点・カンマで分割する。"""
        parts = re.split(r'[、，,]', text)
        return [p.strip() for p in parts if p.strip()]

    def _extract_from_text(
        self,
        text: str,
        nutrition: Dict[str, Optional[float]]
    ) -> None:
        for nutrient, patterns in self.NUTRIENT_PATTERNS.items():
            if nutrition[nutrient] is not None:
                continue

            for pattern in patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    value_text = match.group(1)
                    value = self.post_processor.extract_numeric_value(value_text)

                    if value is not None:
                        nutrition[nutrient] = value
                        logger.debug(f"Extracted {nutrient}: {value} from '{text}'")
                        break


class NutritionValidator:
    """
    栄養素間の整合性を検証する。
    エネルギー計算式（Atwater 係数）・炭水化物内訳・値の範囲を確認する。
    """

    @staticmethod
    def validate(nutrition: Dict[str, Optional[float]]) -> Dict[str, Any]:
        warnings = []

        calories = nutrition.get('calories')
        protein = nutrition.get('protein')
        fat = nutrition.get('fat')
        carbs = nutrition.get('carbohydrates')

        calculated_calories = None
        if protein is not None and fat is not None and carbs is not None:
            # Atwater 係数: たんぱく質×4, 脂質×9, 炭水化物×4
            calculated_calories = protein * 4 + fat * 9 + carbs * 4

            if calories is not None and calculated_calories > 0:
                ratio = calories / calculated_calories

                if ratio < 0.8 or ratio > 1.2:
                    warnings.append({
                        'type': 'energy_mismatch',
                        'message': f'カロリー値に不整合の可能性があります。'
                                   f'表示: {calories}kcal, 計算値: {calculated_calories:.0f}kcal',
                        'ratio': ratio
                    })

        sugar = nutrition.get('sugar')
        fiber = nutrition.get('dietary_fiber')

        if carbs is not None and sugar is not None and fiber is not None:
            expected_carbs = sugar + fiber
            if abs(carbs - expected_carbs) > 1.0:
                warnings.append({
                    'type': 'carbs_mismatch',
                    'message': f'炭水化物の内訳に不整合の可能性があります。'
                               f'炭水化物: {carbs}g, 糖質+食物繊維: {expected_carbs}g'
                })

        range_checks = {
            'calories': (0, 900),
            'protein': (0, 100),
            'fat': (0, 100),
            'carbohydrates': (0, 100),
        }

        for nutrient, (min_val, max_val) in range_checks.items():
            value = nutrition.get(nutrient)
            if value is not None and (value < min_val or value > max_val):
                warnings.append({
                    'type': 'range_error',
                    'message': f'{nutrient}の値が異常です: {value}'
                })

        return {
            'is_valid': len(warnings) == 0,
            'warnings': warnings,
            'calculated_calories': calculated_calories
        }


class NutritionOCRProcessor:
    """栄養成分表示画像からの情報抽出パイプライン全体を管理するクラス。"""

    def __init__(self) -> None:
        self._client: Optional[ImageAnalysisClient] = None
        self.extractor = NutritionExtractor()
        self.validator = NutritionValidator()

        logger.info("NutritionOCRProcessor initialized (Azure Vision backend)")

    @property
    def client(self) -> ImageAnalysisClient:
        """Azure クライアントの遅延初期化。認証情報は環境変数から読む。"""
        if self._client is None:
            endpoint = os.getenv("AZURE_VISION_ENDPOINT")
            key = os.getenv("AZURE_VISION_KEY")
            if not endpoint or not key:
                raise AzureVisionUnavailableError(
                    "AZURE_VISION_ENDPOINT / AZURE_VISION_KEY が未設定です"
                )
            self._client = ImageAnalysisClient(
                endpoint=endpoint,
                credential=AzureKeyCredential(key),
            )
        return self._client

    def _extract_lines(self, image_path: str) -> List[str]:
        """Azure Read API で画像からテキスト行を抽出し、読み順にソートして返す。"""
        with open(image_path, "rb") as f:
            image_data = f.read()

        result = self.client.analyze(
            image_data=image_data,
            visual_features=[VisualFeatures.READ],
        )

        if result.read is None or not result.read.blocks:
            return []

        lines = []
        for block in result.read.blocks:
            for line in block.lines:
                poly = line.bounding_polygon  # [{x, y}, ...]
                top_y = min(p.y for p in poly)
                left_x = min(p.x for p in poly)
                lines.append((top_y, left_x, line.text))

        # 同一行とみなす縦方向の許容幅で丸めてから左→右に並べる
        lines.sort(key=lambda t: (round(t[0] / 20), t[1]))

        logger.info(f"Azure Vision detected {len(lines)} lines")
        return [text for _, _, text in lines]

    def process_nutrition_label(self, image_path: str) -> Dict[str, Any]:
        try:
            lines = self._extract_lines(image_path)

            if not lines:
                return {
                    'success': False,
                    'error': 'テキストを検出できませんでした。画像が不鮮明な可能性があります。',
                    'nutrition': None
                }

            nutrition = self.extractor.extract_from_lines(lines)
            validation = self.validator.validate(nutrition)

            has_basic_nutrition = any([
                nutrition.get('calories'),
                nutrition.get('protein'),
                nutrition.get('fat'),
                nutrition.get('carbohydrates')
            ])

            if not has_basic_nutrition:
                return {
                    'success': False,
                    'error': '栄養素情報を検出できませんでした。'
                             '栄養成分表示が明確に写っているか確認してください。',
                    'nutrition': nutrition,
                    'detected_texts': lines[:10]
                }

            nutrition_cleaned = {
                k: v if v is not None else 0.0
                for k, v in nutrition.items()
            }

            return {
                'success': True,
                'nutrition': nutrition_cleaned,
                'validation': validation,
                'detected_texts': lines[:10]
            }

        except AzureVisionUnavailableError as e:
            logger.error(f"Azure Vision 未設定: {e}")
            return {
                'success': False,
                'error': 'OCR機能が一時的に利用できません',
                'nutrition': None
            }

        except HttpResponseError as e:
            logger.exception("Azure Vision API エラー")
            return {
                'success': False,
                'error': f'OCR処理に失敗しました: {e.message}',
                'nutrition': None
            }

        except Exception as e:
            logger.exception(f"OCR processing error: {str(e)}")
            return {
                'success': False,
                'error': f'処理中にエラーが発生しました: {str(e)}',
                'nutrition': None
            }


OCRProcessor = NutritionOCRProcessor  # 後方互換エイリアス
