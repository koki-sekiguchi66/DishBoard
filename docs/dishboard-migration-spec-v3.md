# DishBoard インフラ移行 実装仕様書 v3（GCP + スケジューラ外部化版）

> **対象読者**: Claude Code（コード変更の実行者）
> **前提**: この仕様書に明記された変更のみを実施すること。仕様外の「気を利かせた」リファクタリング・依存追加・バージョン更新・UI変更を**行わないこと**。判断に迷う箇所は実装を止め、確認を求めること。
>
> **v2 からの差分**: 実行環境を Oracle ARM から **GCP e2-micro（x86）** に変更。**Celery / Redis を全廃**し、週次スクレイピングを **GitHub Actions（cron）→ Django 管理コマンド**方式に置き換え。これに伴い OCR 外部化（Azure Vision）の変更内容は v2 を踏襲しつつ、Celery 関連の扱いを更新。

---

## 0. このドキュメントの位置づけ

AWS 無料枠の期限切れに伴い、DishBoard を **GCP Compute Engine e2-micro（Always Free）** へ移行し、**月額ほぼ 0 円**で恒久運用する。設計判断の経緯は別紙『議事録』を参照。

本移行の 3 本柱:

1. **OCR の外部委託**: 自前 EasyOCR + PyTorch を削除し Azure AI Vision（Read API）へ。常駐メモリ約 1GB 削減。
2. **Celery / Redis の全廃**: OCR 非同期化が不要になり、残る定期処理（週次スクレイピング）は外部スケジューラに委譲。常駐プロセス 2 個 + Redis を削減し、e2-micro（1GB）に収める。
3. **スケジューラの外部化**: 週次スクレイピングを **GitHub Actions の cron** から Django 管理コマンド経由で実行。

### 0.1 なぜ Celery を捨てるのか（設計意図）

Celery は元来「重い OCR の非同期化」と「週次スクレイピングの定期実行」の 2 目的で導入された。OCR を Azure に外部化した結果、OCR は軽量な同期 API 呼び出しとなり非同期化が不要に。残るのは週 1 回のスクレイピングのみで、これは常駐 worker/beat + Redis を抱えるより外部 cron に委ねる方が、リソース・複雑性の両面で合理的。e2-micro の 1GB 制約下では特に効果が大きい（Celery 構成では逼迫、削除後は余裕）。

---

## 1. アーキテクチャ概要

### 1.1 移行後の全体構成

```
[研究室ユーザー 10〜20 名]
        │  HTTPS
        ▼
[DuckDNS: <sub>.duckdns.org]  ← 無料サブドメイン + Let's Encrypt
        │
        ▼
┌──────────────────────────────────────────────┐
│  GCP Compute Engine e2-micro (x86 / 1GB)      │
│  リージョン: us-west1 等の無料対象US地域        │
│  Docker Compose (本番)                         │
│                                               │
│   nginx (443/80)                              │
│    ├─ / , /assets     → フロント静的配信       │
│    └─ /api/ , /admin/ → Django へリバプロ       │
│         │                                     │
│   Django + Gunicorn (8000, 内部のみ)           │
│   PostgreSQL 16 + pg_trgm (コンテナ同居)       │
│   （Redis なし・Celery worker/beat なし）       │
└──────────────────────────────────────────────┘
        ▲                    │  HTTPS (OCR 時のみ)
        │                    ▼
[GitHub Actions]      [Azure AI Vision — Read API (F0, 5,000/月)]
  週次 cron
  → 認証付き管理エンドポイント/SSH で
    スクレイピング管理コマンドを実行
```

### 1.2 既存構成（AWS）からの主な変更点

| 領域 | 現状 (AWS) | 移行後 (GCP) |
|------|-----------|----------------|
| 実行環境 | EC2 (x86) | e2-micro (x86 / 1GB) |
| フロント配信 | S3 + CloudFront | VM 内 nginx（同一オリジン） |
| DB | RDS (外部) | コンテナ同居 (PostgreSQL 16) |
| Redis | あり（Celery broker） | **廃止** |
| Celery worker / beat | あり | **廃止** |
| 定期スクレイピング | Celery beat（週次） | **GitHub Actions cron → 管理コマンド** |
| OCR | EasyOCR + PyTorch（自前） | Azure AI Vision（外部 API） |
| 画像保存 | 一時ファイル→削除 | 一時ファイル→削除（永続化しない） |
| ドメイン/SSL | CloudFront 証明書 | DuckDNS + Let's Encrypt (certbot) |
| リバプロ | nginx（フロント側）/ 直公開（バック側） | nginx 単一（統合・不整合を解消） |

### 1.3 現状の構成上の問題（本移行で解消する）

現行 `docker-compose.production.yml` の不整合。移行時に是正すること。

- **バックエンドが nginx を経由せず直接公開**されている（`backend` が `ports: "80:8000"` 相当）。nginx 経由に変更。
- **nginx 設定ファイルが複数**存在し内容が食い違う。移行後は 1 つに統合。
- 本番 compose に**フロント nginx サービスが不在**で S3/CloudFront 前提。移行後は VM 内 nginx がフロントを配信。

### 1.4 e2-micro（1GB）メモリ設計

Celery/Redis 削除後の常駐メモリ概算:

```
Django + Gunicorn : ~200MB（後述の通り worker 数を絞る）
PostgreSQL 16     : ~150MB
nginx             : ~20MB
合計              : ~370MB（1GB に対し余裕）
```

ただし e2-micro は共有 vCPU で瞬間的な負荷に弱いため、**スワップを 2GB 設定**して安全余裕を確保する（VM セットアップ手順に含める。§7）。Gunicorn の worker 数は現行 `--workers 3 --threads 4` から **`--workers 2 --threads 4` 程度に抑える**ことを推奨（§3.7）。

---

## 2. データモデル設計

### 2.1 モデル変更

**モデルスキーマの変更は行わない。** `MealRecord`（スナップショット設計）、`CafeteriaMenu`、`CustomFood`、`CustomMenu`、`StandardFood` 等は現状維持。OCR 外部化・Celery 廃止はいずれもスキーマに影響しない。新規マイグレーションは**発生しない**。

### 2.2 データ移行（RDS → GCP 上 PostgreSQL）

既存データの物理移送のみ。手順は §7 を参照。`pg_trgm` 拡張の有効化マイグレーション（`0006` 相当）は移行先でも実行し、拡張が使えることを確認する。

---

## 3. バックエンド変更仕様

### 3.1 依存関係の変更 — `backend/requirements.txt`

**削除する行（OCR 自前パイプライン）:**

```
--extra-index-url https://download.pytorch.org/whl/cpu
pytesseract==0.3.13
opencv-python-headless==4.10.0.84
easyocr>=1.7.0
scikit-learn>=1.3.0
```

**削除する行（Celery / Redis 関連）:**

```
django-celery-beat==2.8.1
celery==5.4.0
redis==5.0.7
amqp==5.3.1
billiard==4.2.2
kombu==5.5.4
vine==5.1.0
click-didyoumean==0.3.1
click-plugins==1.1.1.2
click-repl==0.3.0
cron_descriptor==2.0.6
django-timezone-field==7.1
python-crontab==3.3.0
```

> **注意**: 上記 Celery 依存の削除は、**他所での import がないことを確認してから**行う。特に `django-timezone-field` は django-celery-beat の依存として入っていたものだが、念のため `grep -rn "timezone_field" backend/` で直接参照がないか確認。参照があれば該当行の削除を中止し確認を求める。`python-dateutil` `pytz` `tzdata` `six` 等は他でも使われる可能性があるため**削除しない**。

**追加する行:**

```
azure-ai-vision-imageanalysis==1.0.0
```

`Pillow`（`pillow==11.3.0`）は残す。`beautifulsoup4` / `bs4` / `requests` はスクレイピングで使うため**残す**。

### 3.2 OCR プロセッサの全面書き換え — `backend/record_app/business_logic/ocr_processor.py`

v2 と同一。「テキスト検出層だけを Azure に差し替え、栄養素抽出・補正・検証ロジックは再利用」。

#### 3.2.1 残すクラス（再利用）
- `OCRPostProcessor`（誤認識補正・`extract_numeric_value`）
- `NutritionExtractor`（`NUTRIENT_PATTERNS` 正規表現抽出、インライン分割）
- `NutritionValidator`（Atwater 係数検証・範囲検証）

これらは OCR エンジン非依存。

#### 3.2.2 削除するクラス / 要素
- `AdaptiveImagePreprocessor`（OpenCV 前処理）
- `SemanticBlockBuilder`（DBSCAN 空間クラスタリング）
- `TextBox` / `SemanticBlock`
- `extract_text_with_positions`（EasyOCR 呼び出し）
- `reader` プロパティ（EasyOCR 遅延ロード）
- 冒頭の `import cv2`, `import numpy as np`, `from sklearn.cluster import DBSCAN`, `from PIL import Image`（Image を他で使っていなければ）

#### 3.2.3 新実装の骨子

`NutritionOCRProcessor` を Azure ベースに再設計。**環境変数からキー/エンドポイントを読む。ハードコード禁止。**

```python
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
import logging
from typing import Any, Optional

from azure.ai.vision.imageanalysis import ImageAnalysisClient
from azure.ai.vision.imageanalysis.models import VisualFeatures
from azure.core.credentials import AzureKeyCredential
from azure.core.exceptions import HttpResponseError

logger = logging.getLogger(__name__)


class AzureVisionUnavailableError(RuntimeError):
    """Azure Vision の設定不足・呼び出し失敗を表す明示的な例外"""


class NutritionOCRProcessor:
    def __init__(self) -> None:
        self._client: Optional[ImageAnalysisClient] = None
        self.extractor = NutritionExtractor()
        self.validator = NutritionValidator()
        logger.info("NutritionOCRProcessor initialized (Azure Vision backend)")

    @property
    def client(self) -> ImageAnalysisClient:
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

    def _extract_lines(self, image_path: str) -> list[str]:
        """Azure Read API で画像からテキスト行を抽出し、読み順にソートして返す"""
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
                poly = line.bounding_polygon  # list of {x, y}
                top_y = min(p.y for p in poly)
                left_x = min(p.x for p in poly)
                lines.append((top_y, left_x, line.text))

        lines.sort(key=lambda t: (round(t[0] / 20), t[1]))  # 行方向を優先
        return [text for _, _, text in lines]

    def process_nutrition_label(self, image_path: str) -> dict[str, Any]:
        try:
            lines = self._extract_lines(image_path)
            if not lines:
                return {
                    "success": False,
                    "error": "テキストを検出できませんでした。画像が不鮮明な可能性があります。",
                    "nutrition": None,
                }

            nutrition = self.extractor.extract_from_lines(lines)
            validation = self.validator.validate(nutrition)

            has_basic = any([
                nutrition.get("calories"),
                nutrition.get("protein"),
                nutrition.get("fat"),
                nutrition.get("carbohydrates"),
            ])
            if not has_basic:
                return {
                    "success": False,
                    "error": "栄養素情報を検出できませんでした。栄養成分表示が明確に写っているか確認してください。",
                    "nutrition": nutrition,
                    "detected_texts": lines[:10],
                }

            nutrition_cleaned = {k: (v if v is not None else 0.0) for k, v in nutrition.items()}
            return {
                "success": True,
                "nutrition": nutrition_cleaned,
                "validation": validation,
                "detected_texts": lines[:10],
            }

        except AzureVisionUnavailableError as e:
            logger.error(f"Azure Vision 未設定: {e}")
            return {"success": False, "error": "OCR機能が一時的に利用できません", "nutrition": None}
        except HttpResponseError as e:
            logger.exception("Azure Vision API エラー")
            return {"success": False, "error": f"OCR処理に失敗しました: {e.message}", "nutrition": None}
        except Exception as e:
            logger.exception("OCR processing error")
            return {"success": False, "error": f"処理中にエラーが発生しました: {e}", "nutrition": None}


# 後方互換エイリアス
OCRProcessor = NutritionOCRProcessor
```

#### 3.2.4 `NutritionExtractor` への入力インターフェース調整

`extract_from_lines(lines: list[str])` を追加。既存 `extract_from_blocks` の中身を流用し、`block.combined_text` を各 `line` 文字列に置換。`_split_inline_text` / `_extract_from_text` はそのまま再利用。削除前に他からの参照を `grep` で確認。

### 3.3 Celery の全廃

#### 3.3.1 削除するファイル
- `backend/dishboard_project/celery.py`（Celery アプリ定義）
- `backend/record_app/tasks.py`（`update_cafeteria_menus_task` と `process_nutrition_label_task`。**中身のスクレイピング呼び出しロジックは §3.4 の管理コマンドへ移設**するので、移設完了後に削除）

#### 3.3.2 修正するファイル
- `backend/dishboard_project/__init__.py`: Celery アプリを読み込む記述（`from .celery import app as celery_app` / `__all__ = ('celery_app',)` 等）があれば**削除**。`grep -rn "celery" backend/dishboard_project/__init__.py` で確認。
- `backend/dishboard_project/settings/base.py`:
  - 冒頭の `from celery.schedules import crontab` を削除
  - `CELERY_BROKER_URL` / `CELERY_RESULT_BACKEND` / `CELERY_ACCEPT_CONTENT` / `CELERY_TASK_SERIALIZER` / `CELERY_RESULT_SERIALIZER` / `CELERY_TIMEZONE` の各行を削除
  - `CELERY_BEAT_SCHEDULE = { ... }` ブロックを削除
  - Azure 環境変数を追加（§3.6）

> **注意**: `process_nutrition_label_task`（OCR 非同期タスク）は現状 `views.py` から使われていない可能性が高い。念のため `grep -rn "process_nutrition_label_task\|update_cafeteria_menus_task" backend/` で `.delay()` / `.apply_async()` 呼び出しがないか確認。もし呼び出しが見つかった場合は、その呼び出し元も同期呼び出し（§3.4 の管理コマンド or 直接 processor 呼び出し）に置き換える必要があるため、削除を止めて報告すること。

### 3.4 スクレイピング管理コマンドの新規作成（★重要）

GitHub Actions から実行するため、スクレイピングを **Django 管理コマンド化**する。現状スクレイピングロジックは `CafeteriaScraper`（`business_logic/cafeteria_scraping.py`）にあり、これは**そのまま再利用**する（変更しない）。呼び出す入口を Celery タスクから管理コマンドに変えるだけ。

**新規作成**: `backend/record_app/management/commands/update_cafeteria_menus.py`

```python
"""
食堂メニューを外部スケジューラ（GitHub Actions 等）から更新するための管理コマンド。

使い方:
    python manage.py update_cafeteria_menus

Celery beat の代替。CafeteriaScraper のロジックはそのまま利用する。
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
```

> `management/commands/` ディレクトリには既に `load_standard_foods.py` があるため、`__init__.py` 等の配置は既存に倣えばよい（追加の `__init__.py` 作成は不要なはず。無ければ既存構造を確認）。

### 3.5 ビュー — `backend/record_app/views.py`

v2 と同一:
- `NutritionOCRProcessor(gpu=False)` → `NutritionOCRProcessor()` に修正（引数削除）。
- OCR 後に一時ファイルを `finally` で必ず削除する保証を入れる（画像を永続化しない方針の担保）。`finally: if tmp_path and os.path.exists(tmp_path): os.remove(tmp_path)`。
- `except ImportError` ブロックの文言を「OCR機能が利用できません」に一般化（残してよい）。

### 3.6 設定 — `backend/dishboard_project/settings/base.py`

§3.3.2 の Celery 設定削除に加え、Azure 認証情報を追記:

```python
# Azure AI Vision (OCR)
AZURE_VISION_ENDPOINT = os.getenv('AZURE_VISION_ENDPOINT', '')
AZURE_VISION_KEY = os.getenv('AZURE_VISION_KEY', '')
```

### 3.7 Gunicorn worker 数の調整

e2-micro（1GB）向けに、本番 Dockerfile の Gunicorn 起動オプションを調整。現行 `--workers 3 --threads 4` を **`--workers 2 --threads 4`** にする（メモリ節約）。該当は `backend/Dockerfile` の production ステージ末尾 `CMD [...]`。

> worker 数はメモリと相談。2 worker × 4 threads で研究室 10〜20 名は十分。もし起動後にメモリ逼迫が見られたら 1 worker まで下げる余地あり（その判断は稼働後）。

### 3.8 テスト修正 — `backend/record_app/tests/test_ocr.py`

v2 と同一。EasyOCR モックを Azure モックに差し替え:
- 初期化テスト: `self.assertIsNone(processor._reader)` → `self.assertIsNone(processor._client)`。`_gpu` の assert は削除。
- `reader` を PropertyMock していた箇所: `_extract_lines` を `patch.object` でモックし任意の行リストを返す方式へ。
- Azure 未設定時に `AzureVisionUnavailableError` 経由で `success=False` が返るテストを 1 件追加。
- `NutritionValidator` / `OCRPostProcessor` の単体テストは変更不要。

**Celery 関連テストの扱い**: もし Celery タスクをテストしているファイル（`test_tasks.py` 等）があれば、`grep -rn "update_cafeteria_menus_task\|process_nutrition_label_task\|@shared_task" backend/record_app/tests/` で確認。存在する場合:
- スクレイピングのテストは、タスク経由ではなく**管理コマンド or `CafeteriaScraper` 直接**を対象にするよう書き換え（`call_command('update_cafeteria_menus')` を使う形）。
- OCR タスクのテストは削除（同期呼び出しの OCR テストが `test_ocr.py` にあるため重複）。
- 判断に迷う場合は報告すること。

### 3.9 Dockerfile — `backend/Dockerfile`

`base` ステージの `apt-get install` から **tesseract 関連を削除**:

```dockerfile
# 削除する行:
    tesseract-ocr \
    tesseract-ocr-jpn \
    tesseract-ocr-eng \
```

`postgresql-client` / `gcc` / `python3-dev` / `libpq-dev` / `curl` は残す（`postgresql-client` は将来のバックアップ運用や migrate 補助に有用、`curl` は healthcheck で使用）。ベースイメージ `python:3.12-slim` はそのまま（x86 で問題なし）。

§3.7 の Gunicorn worker 数変更もここで行う。

---

## 4. フロントエンド変更仕様

v2 と同一。

### 4.1 方針
VM 内 nginx で**同一オリジン配信**（分離しない）。フロント側の実装変更は最小。

### 4.2 API ベース URL
本番は相対パス `/api` を使う（CORS 完全回避）。`frontend/src/lib/axios.ts` の baseURL が `VITE_API_URL` 未指定時に `/api` へフォールバックするか確認。ならなければ本番ビルドで `VITE_API_URL=/api` を渡す（§5.2）。

### 4.3 OCR 関連フロントコード
`frontend/src/features/ocr/api/ocrApi.js` はレスポンス構造（`success`, `nutrition`, `validation`, `detected_texts`）不変のため**変更不要**。TypeScript 化はスコープ外（この 1 ファイルの拡張子変更もしない）。タイムアウト `60000` も維持。

---

## 5. インフラ構成ファイル

### 5.1 nginx 設定の統合 — `nginx/conf.d/dishboard.conf`

既存の複数ファイルを統合し、フロント静的配信とバックエンドリバプロを 1 つに。`/static/` は **whitenoise 委譲**のため backend へプロキシ（`alias` で直接配信しない）。`server_name` は実際の DuckDNS サブドメインに置換。

```nginx
upstream backend {
    server backend:8000;
}

server {
    listen 80;
    server_name <sub>.duckdns.org;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name <sub>.duckdns.org;

    ssl_certificate     /etc/letsencrypt/live/<sub>.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/<sub>.duckdns.org/privkey.pem;

    client_max_body_size 20M;   # OCR 画像アップロード用

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # フロント（SPA）
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Django API
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Django 静的ファイル: whitenoise 委譲のため backend へプロキシ
    location /static/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Django 管理サイト
    location /admin/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

> 旧 `nginx/nginx.conf`（フロントイメージ用）は削除。設定の二重管理を解消。

### 5.2 本番 Docker Compose の再設計 — `docker-compose.production.yml`

現行の問題（backend 直公開・フロント nginx 不在・Celery/Redis 存在）を解消。**nginx を公開エントリポイント**にし、**redis / celery / celery-beat サービスを削除**する。

要点:
1. **`redis` サービスを削除**。
2. **`celery` / `celery-beat` サービスを削除**。
3. **`nginx` サービスを新設**（フロントビルド成果物 + §5.1 設定を配信）。443/80 公開。
4. **`backend` の `ports` を削除**（`expose: ["8000"]`）。
5. Azure 環境変数を `backend` に追加。REDIS_URL / CELERY_* は削除。
6. certbot 用ボリューム（`certbot_certs`, `certbot_www`）を追加し nginx と共有。

構成イメージ（キー項目。既存の `env_file`, `restart: always`, `networks`, healthcheck は踏襲）:

```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: dishboard-db-prod
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: always
    networks:
      - dishboard_network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
      target: production
    container_name: dishboard-backend-prod
    expose: ["8000"]          # ports は使わない（外部非公開）
    env_file:
      - .env
    environment:
      - DJANGO_SETTINGS_MODULE=dishboard_project.settings
      - DJANGO_ENV=production
      - DEBUG=0
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
      - SECRET_KEY=${SECRET_KEY}
      - AZURE_VISION_ENDPOINT=${AZURE_VISION_ENDPOINT}
      - AZURE_VISION_KEY=${AZURE_VISION_KEY}
      # REDIS_URL / CELERY_* は記載しない
    volumes:
      - static_files:/app/staticfiles
      - media_files:/app/media
    depends_on:
      db: { condition: service_healthy }
    restart: always
    networks:
      - dishboard_network

  nginx:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: production
      args:
        VITE_API_URL: /api
    image: dishboard-nginx-prod
    container_name: dishboard-nginx-prod
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - certbot_certs:/etc/letsencrypt:ro
      - certbot_www:/var/www/certbot:ro
    depends_on:
      - backend
    restart: always
    networks:
      - dishboard_network

volumes:
  postgres_data:
  static_files:
  media_files:
  certbot_certs:
  certbot_www:

networks:
  dishboard_network:
    driver: bridge
```

> **Django static（whitenoise 委譲）**: nginx は Vite 成果物のみ配信。`/static/` は whitenoise が処理するため backend へプロキシするだけ。`static_files` ボリュームは backend の collectstatic 出力先として維持するが、nginx にはマウント不要。

### 5.3 フロント Dockerfile の調整 — `frontend/Dockerfile`

production ステージから `COPY nginx.conf /etc/nginx/conf.d/default.conf` を削除（nginx 設定は compose マウントで与える）。Vite 成果物のコピー（`COPY --from=builder /app/dist /usr/share/nginx/html`）と権限設定は残す。

### 5.4 環境変数テンプレート — `.env.production.example`（新規作成）

```bash
# Django
SECRET_KEY=__CHANGE_ME__
DJANGO_ENV=production
DEBUG=0
ALLOWED_HOSTS=<sub>.duckdns.org
CORS_ALLOWED_ORIGINS=https://<sub>.duckdns.org
CSRF_TRUSTED_ORIGINS=https://<sub>.duckdns.org

# PostgreSQL（コンテナ同居）
POSTGRES_DB=dishboard
POSTGRES_USER=__CHANGE_ME__
POSTGRES_PASSWORD=__CHANGE_ME__
DB_HOST=db
DB_PORT=5432

# Azure AI Vision (OCR)
AZURE_VISION_ENDPOINT=https://<your-resource>.cognitiveservices.azure.com/
AZURE_VISION_KEY=__CHANGE_ME__

# スクレイピング管理コマンドを保護する共有シークレット（§6 の方式Bを採る場合のみ）
SCRAPE_TRIGGER_TOKEN=__CHANGE_ME__
```

> 同一オリジンのため CORS は実質不要だが、`/admin/` 等のため自ドメインを 1 つ入れておく（ワイルドカード禁止）。`REDIS_URL` / `CELERY_*` は記載しない。

---

## 6. スクレイピングの定期実行（GitHub Actions）

週次スクレイピングを GitHub Actions の cron で駆動する。VM 上の管理コマンド `python manage.py update_cafeteria_menus`（§3.4）を実行させる。実行経路は 2 方式あり、**方式 A（SSH）を推奨**。

### 6.1 方式 A: SSH 経由でコマンド実行（推奨）

GitHub Actions から VM に SSH し、コンテナ内で管理コマンドを叩く。追加のエンドポイント実装が不要で最もシンプル・安全。

**必要な準備（コード変更ではなくリポジトリ/VM 設定）:**
- GitHub リポジトリの Secrets に以下を登録:
  - `GCP_VM_HOST`: VM の Public IP（または DuckDNS ドメイン）
  - `GCP_VM_USER`: SSH ユーザー名
  - `GCP_SSH_PRIVATE_KEY`: VM に登録した公開鍵に対応する秘密鍵
- VM 側で該当公開鍵を `~/.ssh/authorized_keys` に追加。

**新規作成**: `.github/workflows/scrape-cafeteria.yml`

```yaml
name: Weekly Cafeteria Menu Scrape

on:
  schedule:
    # 毎週月曜 08:00 JST = 日曜 23:00 UTC（cron は UTC。DST なし）
    - cron: "0 23 * * 0"
  workflow_dispatch: {}   # 手動実行も可能にする

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - name: Run scraping command over SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.GCP_VM_HOST }}
          username: ${{ secrets.GCP_VM_USER }}
          key: ${{ secrets.GCP_SSH_PRIVATE_KEY }}
          command_timeout: 10m
          script: |
            cd ~/dishboard
            docker compose -f docker-compose.production.yml exec -T backend \
              python manage.py update_cafeteria_menus
```

> **時刻の注意**: GitHub Actions の cron は UTC。元の「月曜 8:00 JST」を UTC 換算すると日曜 23:00 UTC（`0 23 * * 0`）。日本は DST がないため固定でよい。GitHub Actions の schedule は数分の遅延やスキップが起こり得るが、週次メニュー更新の用途では許容範囲。

### 6.2 方式 B: 認証付き HTTP エンドポイント（代替）

VM に SSH を開けたくない場合の代替。Django に「共有トークンで保護した管理エンドポイント」を実装し、GitHub Actions が `curl` で叩く。**追加実装が必要**なため、方式 A が使えない場合のみ採用。採用する場合は別途、認可付き APIView の実装仕様を起こす（本仕様では骨子のみ）。

> **推奨**: まず方式 A（SSH）で実装する。方式 B は SSH がポリシー上使えない等の事情がある場合のみ。**どちらを採るか不明な場合は方式 A で進め、確認を求めること。**

### 6.3 手動フォールバック

スケジューラが動かない緊急時は、VM 上で直接:
```bash
docker compose -f docker-compose.production.yml exec backend python manage.py update_cafeteria_menus
```

---

## 7. HTTPS / ドメイン / VM セットアップ（サーバ手順・コード変更外）

> コードではなくサーバ構築手順。別紙『GCP セットアップ手順書』に詳細。ここでは要点のみ。

1. **GCP e2-micro 作成**（us-west1 等の無料対象リージョン、Ubuntu、外部 IP 付与）。
2. **スワップ 2GB 設定**（1GB RAM の安全余裕）:
   ```bash
   sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
   sudo mkswap /swapfile && sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```
3. **Docker / Compose インストール**（x86 版）。
4. **ファイアウォール**: GCP の VPC ファイアウォールで 80/443/22 を許可（GCP はコンソールで設定。Oracle と違い OS 内 iptables のデフォルト遮断は通常なし）。
5. **DuckDNS**: サブドメイン取得、VM の外部 IP を登録、IP 更新 cron 設定。
6. **certbot（Let's Encrypt）**: HTTP-01 チャレンジで証明書取得、`certbot_certs` / `certbot_www` ボリューム共有、自動更新設定。

---

## 8. 移行手順（並行構築 + 一括切替）

> 新環境を並行構築 → 動作確認 → 一括切替。ダウンタイム許容。旧 AWS 環境は切替確認まで残す。

1. **AWS 側**: RDS から論理バックアップ取得
   ```bash
   pg_dump -h <RDSエンドポイント> -U <user> -d <dbname> -Fc -f dishboard_$(date +%Y%m%d).dump
   ```
2. **GCP VM**: §7 のセットアップ後、リポジトリを clone、`.env` を作成、`docker compose -f docker-compose.production.yml build`。
3. **データ移行**:
   ```bash
   docker compose -f docker-compose.production.yml up -d db
   docker compose -f docker-compose.production.yml exec -T db \
     pg_restore -U <user> -d <dbname> --no-owner < dishboard_YYYYMMDD.dump
   docker compose -f docker-compose.production.yml run --rm backend python manage.py migrate
   ```
4. **pg_trgm 確認**:
   ```bash
   docker compose -f docker-compose.production.yml exec db \
     psql -U <user> -d <dbname> -c "SELECT extname FROM pg_extension WHERE extname='pg_trgm';"
   ```
5. **標準食品データ投入**（初回のみ。移行データに含まれていれば不要。含まれていなければ）:
   ```bash
   docker compose -f docker-compose.production.yml exec backend \
     python manage.py load_standard_foods /app/data/standard_foods.csv
   ```
6. **全サービス起動**: `docker compose -f docker-compose.production.yml up -d`
7. **§9 の検証**を実施。
8. **GitHub Actions Secrets 登録**（§6.1）とワークフロー配置。手動実行（`workflow_dispatch`）で動作確認。
9. 合格後、DuckDNS を GCP VM に向ける（DNS 切替）。
10. 数日確認後、AWS リソース削除。

### 8.1 ロールバック
切替後に致命的問題が出たら、DuckDNS を旧 AWS 環境に戻す（旧環境は §8-10 まで削除しない）。

---

## 9. 動作検証チェックリスト

### 9.1 インフラ
- [ ] `docker compose ps` で全サービス（nginx, backend, db）が healthy。**redis/celery/celery-beat が存在しないこと**を確認
- [ ] `https://<sub>.duckdns.org/` でフロント表示（証明書エラーなし）
- [ ] `https://<sub>.duckdns.org/api/health/` が 200
- [ ] HTTP が HTTPS にリダイレクト
- [ ] `free -h` でスワップが有効

### 9.2 認証・基本機能
- [ ] 新規登録 → ログイン → トークン取得
- [ ] 食事記録の作成・一覧・削除
- [ ] 体重記録の作成・一覧
- [ ] 食品検索（トリグラム類似）が結果を返す
- [ ] My Items / My Menus の作成・利用

### 9.3 OCR（Azure Vision）
- [ ] 栄養成分表示画像をアップロード → 栄養素が抽出される
- [ ] 抽出後、サーバ上に一時画像ファイルが残っていない
- [ ] Azure 未設定時（キー空）に `success=False` で穏当なエラー（クラッシュしない）
- [ ] Azure ポータルで Read API のトランザクション数が想定内

### 9.4 スクレイピング（GitHub Actions）
- [ ] VM 上で手動実行 `docker compose ... exec backend python manage.py update_cafeteria_menus` が成功し `CafeteriaMenu` が更新される
- [ ] GitHub Actions を `workflow_dispatch` で手動トリガーし、SSH 経由でコマンドが成功する
- [ ] 実行後、食堂メニュー一覧に反映
- [ ] ワークフローの cron 設定が `0 23 * * 0`（月曜 8:00 JST 相当）

### 9.5 テスト
- [ ] `docker compose exec backend pytest` が全件パス（OCR テスト修正・Celery テスト整理後）
- [ ] Celery 依存の削除後も既存テストがグリーン

---

## 10. 実装タスク分解（依存順）

| # | タスク | 対象 | 依存 | 目安行数 |
|---|-------|------|------|---------|
| T1 | requirements から OCR/Celery/Redis 依存を削除、Azure SDK 追加 | `requirements.txt` | なし | ~20 |
| T2 | 削除対象ライブラリの他所参照チェック（grep 各種） | 調査 | T1 | - |
| T3 | `NutritionExtractor` に `extract_from_lines` 追加 | `ocr_processor.py` | なし | ~30 |
| T4 | `NutritionOCRProcessor` を Azure 版に書き換え、不要クラス削除 | `ocr_processor.py` | T3 | ~120 |
| T5 | スクレイピング管理コマンドを新規作成 | `management/commands/update_cafeteria_menus.py` | なし | ~30 |
| T6 | Celery 全廃（celery.py 削除、tasks.py 削除、__init__.py 修正、settings の CELERY_* 削除） | 複数 | T5 | ~40 |
| T7 | settings に Azure 環境変数追加 | `settings/base.py` | T6 | ~3 |
| T8 | views.py の `gpu=False` 除去・一時ファイル削除保証・文言修正 | `views.py` | T4 | ~15 |
| T9 | OCR テストを Azure モック方式に修正 + 未設定時テスト追加 | `tests/test_ocr.py` | T4 | ~80 |
| T10 | Celery テストの整理（あれば管理コマンド方式へ書換 or 削除） | `tests/` | T5,T6 | ~40 |
| T11 | Dockerfile: tesseract 削除 + Gunicorn worker 数調整 | `backend/Dockerfile` | T1 | ~10 |
| T12 | nginx 設定を統合、旧 nginx.conf 削除 | `nginx/conf.d/dishboard.conf` | なし | ~70 |
| T13 | フロント Dockerfile 調整（COPY nginx.conf 削除） | `frontend/Dockerfile` | T12 | ~10 |
| T14 | 本番 compose 再設計（redis/celery 削除・nginx 新設・backend 非公開・Azure 環境変数） | `docker-compose.production.yml` | T11,T12,T13 | ~70 |
| T15 | `.env.production.example` 作成 | 新規 | T14 | ~25 |
| T16 | GitHub Actions ワークフロー作成 | `.github/workflows/scrape-cafeteria.yml` | T5 | ~30 |
| T17 | README に GCP/DuckDNS/certbot/Actions 構築手順を追記 | `README.md` | 全て | ~60 |

> **T4・T14 は 100 行超の可能性**。超える場合はさらに分割（T4→「不要クラス削除」「Azure クライアント」「process 本体」）。

---

## 11. 禁止事項（Claude Code 向け・厳守）

- モデルスキーマの変更、新規マイグレーションの追加
- ライブラリのバージョンアップ（Azure SDK の新規追加を除く。既存パッケージのバージョンは触らない）
- フロントの TypeScript 化・UI コンポーネントの改変
- `CafeteriaScraper`（スクレイピングロジック本体）の変更（入口を管理コマンドに変えるだけ。パースロジックには触らない）
- Azure のキー・エンドポイントのハードコード
- 「ついでの」リファクタリング全般
- 仕様中で「確認を求めること」と記した箇所（削除ライブラリの参照確認、OCR/スクレイピングタスクの呼び出し元確認、Celery テストの扱い、スケジューラ方式 A/B の選択）を、確認なしに独断で進めること

---

## 12. 補足事項（サーバ構築時に確定・コード変更に影響しない）

- Django static は **whitenoise 委譲で確定**（§5.2）。
- RDS 実データ量は移行実施時に実測（スコープ外）。
- **DuckDNS サブドメイン名**は `.env` と nginx 設定で実値を与える（コード上は `<sub>` プレースホルダ）。
- **GCP リージョン**は us-west1 等の無料対象 US リージョンから選択（コードに影響なし）。
- **egress 監視**: 稼働後に GCP 課金ダッシュボードで下り通信量を確認。月 1GB 無料枠に近づくようなら、将来 Cloudflare（要独自ドメイン）導入を検討。当面は不要。
- **将来の Oracle 移行**: 本構成はクラウド非依存（Docker Compose + 同居 DB）のため、将来 Oracle ARM が確保できれば移行は容易（DB ダンプ + VM 上ビルド + DNS 切替）。GitHub Actions スケジューラは実行環境に依存しないため移行の影響を受けない。
