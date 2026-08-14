"""
食堂メニューを外部スケジューラ（GitHub Actions 等）から更新するための管理コマンド。
Celery beat の代替。CafeteriaScraper のロジックはそのまま利用する。

使い方:
    python manage.py update_cafeteria_menus
"""
import logging
from django.core.management.base import BaseCommand

from record_app.business_logic.cafeteria_scraping import CafeteriaScraper

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "食堂ウェブサイトから最新メニューをスクレイピングして DB を更新する"

    def handle(self, *args, **options):
        try:
            scraper = CafeteriaScraper()
            count = scraper.fetch_and_update_menus()
            self.stdout.write(
                self.style.SUCCESS(f"メニューを更新しました。{count}件取得。")
            )
        except Exception as e:
            logger.exception("食堂メニュー更新エラー")
            # 非ゼロ終了で GitHub Actions 側に失敗を伝える
            raise SystemExit(f"メニュー更新に失敗しました: {e}")
