import re
import cv2
import numpy as np
from PIL import Image
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Optional, Any
from sklearn.cluster import DBSCAN
import logging

logger = logging.getLogger(__name__)


@dataclass
class TextBox:
    """EasyOCR の検出結果を構造化したデータクラス。center_x/y は DBSCAN の距離計算に使用。"""
    text: str
    bbox: List[List[int]]  # [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
    confidence: float
    center_x: float = field(init=False)
    center_y: float = field(init=False)
    width: float = field(init=False)
    height: float = field(init=False)

    def __post_init__(self):
        xs = [point[0] for point in self.bbox]
        ys = [point[1] for point in self.bbox]
        self.center_x = sum(xs) / 4
        self.center_y = sum(ys) / 4
        self.width = max(xs) - min(xs)
        self.height = max(ys) - min(ys)


@dataclass
class SemanticBlock:
    """空間的に近接するテキストボックスのグループ。行・テーブル構造に依存せず栄養素情報を抽出する。"""
    text_boxes: List[TextBox]
    combined_text: str = field(init=False)
    top_left_x: float = field(init=False)
    top_left_y: float = field(init=False)

    def __post_init__(self):
        sorted_boxes = sorted(
            self.text_boxes,
            key=lambda b: (b.center_y // 20, b.center_x)
        )
        self.combined_text = ' '.join(box.text for box in sorted_boxes)
        self.top_left_x = min(box.bbox[0][0] for box in self.text_boxes)
        self.top_left_y = min(box.bbox[0][1] for box in self.text_boxes)


class OCRPostProcessor:
    """EasyOCR で頻出する誤認識パターンを文脈に応じて補正するクラス。"""

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


class AdaptiveImagePreprocessor:
    """
    画像の特性を自動判定して最適な前処理を適用する。
    画像拡大はフロントエンドで実施済みのためバックエンドでは行わない。
    """

    @staticmethod
    def sharpen_image(image: np.ndarray) -> np.ndarray:
        kernel = np.array([
            [-1, -1, -1],
            [-1,  9, -1],
            [-1, -1, -1]
        ])
        sharpened = cv2.filter2D(image, -1, kernel)
        return cv2.addWeighted(image, 0.3, sharpened, 0.7, 0)

    @staticmethod
    def detect_inverted_colors(image: np.ndarray) -> bool:
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        return np.mean(gray) < 100

    @staticmethod
    def detect_red_background(image: np.ndarray) -> bool:
        if len(image.shape) != 3:
            return False

        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        lower_red1 = np.array([0, 50, 50])
        upper_red1 = np.array([10, 255, 255])
        lower_red2 = np.array([170, 50, 50])
        upper_red2 = np.array([180, 255, 255])

        mask1 = cv2.inRange(hsv, lower_red1, upper_red1)
        mask2 = cv2.inRange(hsv, lower_red2, upper_red2)
        red_mask = mask1 + mask2

        red_ratio = np.sum(red_mask > 0) / (image.shape[0] * image.shape[1])
        return red_ratio > 0.25

    @staticmethod
    def correct_skew(image: np.ndarray) -> np.ndarray:
        """Hough 変換で直線を検出し、支配的な角度から傾きを補正する。"""
        edges = cv2.Canny(image, 50, 150, apertureSize=3)
        lines = cv2.HoughLinesP(
            edges, 1, np.pi/180,
            threshold=100,
            minLineLength=50,
            maxLineGap=10
        )

        if lines is None or len(lines) == 0:
            return image

        angles = []
        for line in lines:
            x1, y1, x2, y2 = line[0]
            if x2 - x1 != 0:
                angle = np.arctan2(y2 - y1, x2 - x1) * 180 / np.pi
                if abs(angle) < 45:
                    angles.append(angle)

        if not angles:
            return image

        median_angle = np.median(angles)

        if abs(median_angle) < 0.5:
            return image

        h, w = image.shape[:2]
        center = (w // 2, h // 2)
        rotation_matrix = cv2.getRotationMatrix2D(center, median_angle, 1.0)
        rotated = cv2.warpAffine(
            image, rotation_matrix, (w, h),
            flags=cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_REPLICATE
        )

        logger.info(f"Skew corrected: {median_angle:.2f} degrees")
        return rotated

    @classmethod
    def preprocess(cls, image_path: str) -> np.ndarray:
        img = cv2.imread(str(image_path))
        if img is None:
            raise ValueError(f"Failed to load image: {image_path}")

        logger.info(f"Image loaded: {img.shape} (upscaling skipped - done in frontend)")

        if cls.detect_red_background(img):
            logger.info("Red background detected - applying special processing")
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            gray = cv2.bitwise_not(gray)
        elif cls.detect_inverted_colors(img):
            logger.info("Inverted colors detected - applying inversion")
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            gray = cv2.bitwise_not(gray)
        else:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        gray = cls.correct_skew(gray)
        gray = cls.sharpen_image(gray)
        denoised = cv2.bilateralFilter(gray, 9, 75, 75)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(denoised)

        logger.info(f"Adaptive preprocessing completed. Output size: {enhanced.shape}")
        return enhanced


class SemanticBlockBuilder:
    """
    DBSCAN を使ってテキストボックスを空間的にクラスタリングし意味ブロックを形成する。
    DBSCAN は事前のクラスタ数指定が不要なため、不規則なレイアウトに適している。
    """

    def __init__(self, eps_ratio: float = 0.05):
        self.eps_ratio = eps_ratio

    def build_blocks(
        self,
        text_boxes: List[TextBox],
        image_height: int
    ) -> List[SemanticBlock]:
        if not text_boxes:
            return []

        eps = image_height * self.eps_ratio

        centers = np.array([
            [box.center_x, box.center_y] for box in text_boxes
        ])

        clustering = DBSCAN(eps=eps, min_samples=1).fit(centers)
        labels = clustering.labels_

        clusters: Dict[int, List[TextBox]] = {}
        for box, label in zip(text_boxes, labels):
            if label not in clusters:
                clusters[label] = []
            clusters[label].append(box)

        blocks = [SemanticBlock(boxes) for boxes in clusters.values()]

        row_height = image_height * 0.1
        blocks.sort(key=lambda b: (
            int(b.top_left_y / row_height),
            b.top_left_x
        ))

        logger.info(f"Built {len(blocks)} semantic blocks from {len(text_boxes)} text boxes")
        return blocks


class NutritionExtractor:
    """意味ブロックから栄養素情報を抽出する。"""

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

    def extract_from_blocks(
        self,
        blocks: List[SemanticBlock]
    ) -> Dict[str, Optional[float]]:
        """同じ栄養素が複数ブロックで検出された場合は最初の値を採用する。"""
        nutrition: Dict[str, Optional[float]] = {
            'calories': None, 'protein': None, 'fat': None, 'carbohydrates': None,
            'sugar': None, 'dietary_fiber': None, 'sodium': None, 'calcium': None,
            'iron': None, 'vitamin_a': None, 'vitamin_b1': None,
            'vitamin_b2': None, 'vitamin_c': None,
        }

        for block in blocks:
            text = self.post_processor.correct_text(block.combined_text)
            logger.debug(f"Processing block: '{block.combined_text}' -> '{text}'")

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

    def __init__(self, gpu: bool = False):
        self._reader = None  # 遅延初期化
        self._gpu = gpu
        self.preprocessor = AdaptiveImagePreprocessor()
        self.block_builder = SemanticBlockBuilder()
        self.extractor = NutritionExtractor()
        self.validator = NutritionValidator()

        logger.info("NutritionOCRProcessor initialized (lazy loading enabled)")

    @property
    def reader(self):
        """EasyOCR Reader の遅延初期化。起動コストが高いため初回アクセス時に生成する。"""
        if self._reader is None:
            import easyocr
            logger.info("Initializing EasyOCR reader (this may take a moment)...")
            self._reader = easyocr.Reader(
                ['ja', 'en'],
                gpu=self._gpu,
                verbose=False
            )
            logger.info("EasyOCR reader initialized")
        return self._reader

    def extract_text_with_positions(
        self,
        image: np.ndarray
    ) -> Tuple[List[TextBox], int]:
        results = self.reader.readtext(
            image,
            detail=1,
            paragraph=False,
            min_size=10,
            text_threshold=0.5,
            low_text=0.3,
            contrast_ths=0.3,
            adjust_contrast=0.7,
        )

        logger.info(f"EasyOCR raw results count: {len(results)}")
        for i, (bbox, text, confidence) in enumerate(results):
            logger.info(f"  [{i}] conf={confidence:.3f} text='{text}'")

        text_boxes = []
        for bbox, text, confidence in results:
            if confidence < 0.1:
                logger.debug(f"Skipped low confidence: '{text}' ({confidence:.3f})")
                continue
            if not text.strip():
                continue

            text_boxes.append(TextBox(
                text=text.strip(),
                bbox=bbox,
                confidence=confidence
            ))

        logger.info(f"Detected {len(text_boxes)} text boxes (after filtering)")
        return text_boxes, image.shape[0]

    def process_nutrition_label(self, image_path: str) -> Dict[str, Any]:
        try:
            preprocessed = self.preprocessor.preprocess(image_path)
            text_boxes, image_height = self.extract_text_with_positions(preprocessed)

            if not text_boxes:
                return {
                    'success': False,
                    'error': 'テキストを検出できませんでした。画像が不鮮明な可能性があります。',
                    'nutrition': None
                }

            blocks = self.block_builder.build_blocks(text_boxes, image_height)
            nutrition = self.extractor.extract_from_blocks(blocks)
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
                    'detected_texts': [box.text for box in text_boxes[:10]]
                }

            nutrition_cleaned = {
                k: v if v is not None else 0.0
                for k, v in nutrition.items()
            }

            return {
                'success': True,
                'nutrition': nutrition_cleaned,
                'validation': validation,
                'detected_texts': [box.text for box in text_boxes[:10]]
            }

        except Exception as e:
            logger.exception(f"OCR processing error: {str(e)}")
            return {
                'success': False,
                'error': f'処理中にエラーが発生しました: {str(e)}',
                'nutrition': None
            }


OCRProcessor = NutritionOCRProcessor  # 後方互換エイリアス
