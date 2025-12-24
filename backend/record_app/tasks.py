# KiloGram/record_app/tasks.py
from celery import shared_task
from .business_logic.cafeteria_scraping import CafeteriaScraper
from .business_logic.ocr_processor import NutritionOCRProcessor
from pathlib import Path
import os
import logging

logger = logging.getLogger(__name__)


@shared_task
def update_cafeteria_menus_task():
    """食堂メニューを自動で更新"""
    try:
        scraper = CafeteriaScraper()
        count = scraper.fetch_and_update_menus()
        return f"メニューを更新しました。{count}件のメニューを取得しました。"
    except Exception as e:
        return f"メニューの更新に失敗しました: {str(e)}"


@shared_task
def process_nutrition_label_task(image_path):
    """
    栄養成分表示のOCR処理を非同期実行
    
    設計原則:
    - 重い処理をバックグラウンドで実行
    - 一時ファイルの適切な管理
    - エラーハンドリングとロギング
    
    Args:
        image_path: 処理する画像のパス
        
    Returns:
        dict: OCR処理結果
    """
    try:
        logger.info(f"Starting OCR processing for: {image_path}")
        
        # ファイル存在確認
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image file not found: {image_path}")
        
        # OCR処理
        processor = NutritionOCRProcessor()
        result = processor.process_nutrition_label(image_path)
        
        # 一時ファイルの削除
        try:
            os.remove(image_path)
            logger.info(f"Temporary file deleted: {image_path}")
        except Exception as e:
            logger.warning(f"Failed to delete temporary file: {str(e)}")
        
        logger.info(f"OCR processing completed: success={result['success']}")
        return result
        
    except Exception as e:
        logger.error(f"OCR task error: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'nutrition': None
        }