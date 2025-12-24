import os
from django.apps import AppConfig

class RecordAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'record_app'

    def ready(self):
        """
        初回起動時に食堂メニューが存在しない場合、非同期で取得処理を開始する
        runserver時のみ実行
        """
        if os.environ.get('RUN_MAIN'):
            from .models import CafeteriaMenu
            from .tasks import update_cafeteria_menus_task
            
            if not CafeteriaMenu.objects.exists():
                print("食堂メニュー取得処理を開始します。")
                update_cafeteria_menus_task.delay()