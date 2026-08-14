# Claude Code 一括実装プロンプト（DishBoard 移行・仕様書 v3 対応）

> **このファイルの使い方**
> 下の「===== ここからプロンプト本体 =====」以降を丸ごとコピーして Claude Code に貼り付けてください。実行前に、リポジトリのルートに `docs/dishboard-migration-spec-v3.md`（実装仕様書 v3）を配置しておくこと。プロンプトは仕様書を参照する形で書かれています。
>
> **推奨**: 複雑な書き換え（特に OCR プロセッサ）を含むため、Claude Code のモデルは Opus 系を推奨します（`/model` で切り替え）。
>
> **注意**: このプロンプトは「一括実装」用ですが、無条件に突き進むのではなく、**破壊的な不確実性がある箇所だけは停止して確認を求める**設計になっています。停止条件は本文に明記してあります。

---

===== ここからプロンプト本体 =====

あなたは DishBoard（Django + DRF + React のフルスタック栄養管理アプリ）のインフラ移行を実装するエンジニアです。AWS から GCP e2-micro への移行に伴う一連のコード変更を、このリポジトリに対して実施してください。変更の完全な仕様は `docs/dishboard-migration-spec-v3.md` にあります。**この仕様書を最初に通読してから作業を開始してください。**

## 実装の全体像

3 つの柱があります。
1. OCR を自前の EasyOCR/PyTorch から Azure AI Vision（Read API）へ外部化する
2. Celery / Redis を全廃し、週次スクレイピングを Django 管理コマンド化する（GitHub Actions から実行）
3. 単一 VM 集約に向けて Docker Compose 本番構成・nginx を再設計する

これらを一括で実装しますが、後述の「絶対的制約」と「停止条件」を厳守してください。

## 絶対的制約（違反禁止）

以下は例外なく守ること。仕様書に明記された変更のみを行い、「良かれと思った」追加変更を一切しないこと。

- **モデルスキーマを変更しない。新規マイグレーションを追加しない。** 本移行は DB 構造を一切変えない。
- **ライブラリのバージョンを更新しない。** 唯一の例外は、仕様で追加を指示された `azure-ai-vision-imageanalysis==1.0.0` の新規追加のみ。既存パッケージのバージョン番号は触らない。
- **フロントエンドの UI・コンポーネントを改変しない。TypeScript 化もしない。** フロントの変更は仕様書 §4・§5.3 に限定（API ベース URL 確認、Dockerfile の nginx.conf コピー削除のみ）。
- **`CafeteriaScraper`（`backend/record_app/business_logic/cafeteria_scraping.py`）のスクレイピング・パースロジックを変更しない。** このクラスはそのまま再利用する。入口を Celery タスクから管理コマンドに変えるだけ。
- **Azure のキー・エンドポイントをハードコードしない。** 必ず環境変数（`os.getenv`）から読む。
- **秘密情報を含むファイルをコミットしない。** `.env` は `.gitignore` 済みのはず。作成するのは `.env.production.example`（プレースホルダのみ）だけ。
- **「ついでのリファクタリング」「命名の統一」「コードスタイルの一括修正」を行わない。**
- **既存のテストのロジックを、テストを通すためだけに安易に緩めない。**

## 作業の進め方

一括実装ですが、以下の順序と作法で進めてください。

- **論理的な単位でコミットを分ける。** 一つの巨大コミットにせず、下記フェーズごとにコミットする（問題発生時に切り戻せるように）。コミットメッセージは日本語で簡潔に。
- **各ファイルは変更前に必ず現状を読む。** 憶測で書かない。
- **停止条件（後述）に該当したら、その時点で作業を止め、状況を報告して指示を仰ぐ。** それ以外は最後まで実装しきる。
- **各フェーズ完了時に、変更したファイルと要点を短く報告する。**

## フェーズ 0: 事前調査（実装前に必ず実行）

コードを変更する前に、以下を実行して結果を報告してください。この結果によって「安全に削除できるか」が決まります。

```bash
# (1) OCR 以外で opencv/sklearn/easyocr/pytesseract が使われていないか
grep -rn "import cv2\|from sklearn\|import sklearn\|import easyocr\|import pytesseract" backend/

# (2) Celery タスクが実際に呼び出されていないか（.delay / .apply_async）
grep -rn "process_nutrition_label_task\|update_cafeteria_menus_task" backend/

# (3) NutritionExtractor.extract_from_blocks の参照元
grep -rn "extract_from_blocks" backend/

# (4) django-celery-beat 由来の timezone_field の直接参照
grep -rn "timezone_field" backend/

# (5) __init__.py での celery アプリ読み込み
grep -rn "celery" backend/dishboard_project/__init__.py

# (6) Celery タスクのテストの有無
grep -rn "@shared_task\|@app.task\|update_cafeteria_menus_task\|process_nutrition_label_task" backend/record_app/tests/
```

**停止条件（フェーズ 0）**:
- (1) で **OCR プロセッサ以外のファイル**で cv2/sklearn/easyocr/pytesseract の使用が見つかった場合 → 削除するとそのコードが壊れるため、**停止して報告**。
- (2) で `.delay()` または `.apply_async()` による**実際の呼び出し**が見つかった場合 → 同期呼び出しへの置き換えが必要になり影響範囲が広がるため、**停止して報告**。（import されているだけ・定義されているだけなら停止不要、削除して進めてよい）

上記の停止条件に該当しなければ、そのままフェーズ 1 以降へ進んでください。

## フェーズ 1: OCR の Azure 化（仕様書 §3.1〜§3.2, §3.5, §3.6, §3.8, §3.9）

### 1-1. requirements.txt の OCR 依存を整理（§3.1）
`backend/requirements.txt` から以下を削除:
- `--extra-index-url https://download.pytorch.org/whl/cpu`
- `pytesseract==0.3.13`
- `opencv-python-headless==4.10.0.84`
- `easyocr>=1.7.0`
- `scikit-learn>=1.3.0`

追加:
- `azure-ai-vision-imageanalysis==1.0.0`

`Pillow`・`beautifulsoup4`・`bs4`・`requests` は残すこと。

### 1-2. NutritionExtractor に extract_from_lines を追加（§3.2.4）
`backend/record_app/business_logic/ocr_processor.py` の `NutritionExtractor` に、行文字列のリストを受け取る `extract_from_lines(lines: list[str])` を追加する。既存 `extract_from_blocks` の中身を流用し、`block.combined_text` の参照を各 `line` 文字列に置き換える。`_split_inline_text` / `_extract_from_text` はそのまま再利用。フェーズ 0 の (3) で `extract_from_blocks` の参照が `NutritionOCRProcessor` からのみだった場合は、`extract_from_blocks` を削除してよい（他から参照されていれば残す）。

### 1-3. NutritionOCRProcessor を Azure 版に書き換え（§3.2.2, §3.2.3）
同ファイルで以下を実施:
- **削除するクラス/要素**: `AdaptiveImagePreprocessor`、`SemanticBlockBuilder`、`TextBox`、`SemanticBlock`、`extract_text_with_positions`、EasyOCR の `reader` プロパティ、冒頭の `import cv2` / `import numpy as np` / `from sklearn.cluster import DBSCAN` / `from PIL import Image`（Image を他で使っていなければ）。
- **残すクラス（再利用）**: `OCRPostProcessor`、`NutritionExtractor`、`NutritionValidator`。これらは OCR エンジン非依存なので触らない（1-2 の追加を除く）。
- **`NutritionOCRProcessor` を Azure ベースに再実装**する。仕様書 §3.2.3 のコード骨子を正とすること。要点:
  - `__init__` は引数を取らない（`gpu` 引数を廃止）。
  - Azure クライアントは遅延初期化（`client` プロパティ内で `os.getenv("AZURE_VISION_ENDPOINT")` / `os.getenv("AZURE_VISION_KEY")` を読む。未設定なら `AzureVisionUnavailableError` を送出）。
  - `_extract_lines(image_path)` で Azure Read API を呼び、返却された各 line を bounding_polygon の座標で読み順（上→下・左→右）にソートして文字列リストを返す。
  - `process_nutrition_label(image_path)` は `_extract_lines` → `extract_from_lines` → `validate` の順で処理し、仕様書と同じ辞書構造（`success`, `nutrition`, `validation`, `detected_texts` / エラー時 `error`）を返す。
  - `AzureVisionUnavailableError` / `HttpResponseError` / その他例外をそれぞれ捕捉し、`success=False` で穏当に返す（クラッシュさせない）。
  - ファイル末尾に後方互換エイリアス `OCRProcessor = NutritionOCRProcessor` を残す。

### 1-4. settings に Azure 環境変数を追加（§3.6）
`backend/dishboard_project/settings/base.py` の末尾付近に追記:
```python
# Azure AI Vision (OCR)
AZURE_VISION_ENDPOINT = os.getenv('AZURE_VISION_ENDPOINT', '')
AZURE_VISION_KEY = os.getenv('AZURE_VISION_KEY', '')
```

### 1-5. views.py の OCR 呼び出し修正（§3.5）
`backend/record_app/views.py` の栄養ラベル OCR ビューで:
- `NutritionOCRProcessor(gpu=False)` を `NutritionOCRProcessor()` に変更（`gpu=False` 引数を除去）。
- OCR 処理後に一時ファイルを**必ず削除**する。`finally` 節で `if tmp_path and os.path.exists(tmp_path): os.remove(tmp_path)` を保証する（画像を永続化しない方針の担保）。既に削除処理がある場合も `finally` で確実に実行される形になっているか確認し、なっていなければ修正。
- EasyOCR 前提の `except ImportError` ブロックがあれば、文言を「OCR機能が利用できません」に一般化する（ブロック自体は残してよい）。

### 1-6. Dockerfile の OCR 依存削除 + Gunicorn worker 調整（§3.9, §3.7）
`backend/Dockerfile`:
- `base` ステージの `apt-get install` から `tesseract-ocr` / `tesseract-ocr-jpn` / `tesseract-ocr-eng` の行を削除。他のパッケージ（`postgresql-client` / `gcc` / `python3-dev` / `libpq-dev` / `curl` 等）は残す。ベースイメージ `python:3.12-slim` のタグは変更しない。
- production ステージの Gunicorn 起動コマンドで worker 数を調整する。現状 `--workers 3` 相当になっているはずなので `--workers 2` に変更（e2-micro の 1GB 向け。threads はそのまま）。実際の `CMD` を読んで該当箇所を特定してから変更すること。

### 1-7. OCR テストの修正（§3.8）
`backend/record_app/tests/test_ocr.py`:
- 初期化テストの `self.assertIsNone(processor._reader)` を `self.assertIsNone(processor._client)` に変更。`_gpu` 属性の assert があれば削除。
- EasyOCR の `reader` を PropertyMock していた箇所を、`@patch.object(NutritionOCRProcessor, "_extract_lines")` で行リストを返すモック方式に書き換える（Azure SDK のレスポンス構造を組み立てる必要がなくなる）。仕様書 §3.8 の例を参照。
- Azure 未設定時（環境変数が空）に `AzureVisionUnavailableError` 経由で `success=False` が返ることを確認するテストを 1 件追加。
- `NutritionValidator` / `OCRPostProcessor` の単体テストは変更しない。

**フェーズ 1 完了後コミット例**: `feat: OCRをEasyOCRからAzure AI Visionに移行`

## フェーズ 2: Celery 全廃 + スクレイピング管理コマンド化（仕様書 §3.3, §3.4）

**順序が重要**: 先に管理コマンドを作ってスクレイピングの入口を確保してから、Celery を削除する。

### 2-1. スクレイピング管理コマンドの新規作成（§3.4）
`backend/record_app/management/commands/update_cafeteria_menus.py` を新規作成する。既存の `CafeteriaScraper` を呼ぶだけ。**`CafeteriaScraper` の公開メソッドは `fetch_and_update_menus()` で、取得件数（int）を返す**（これはコードを読んで確認済みだが、念のため `tasks.py` の既存 Celery タスクが `CafeteriaScraper` に対して呼んでいるメソッドと一致することを確認してから実装すること）。

```python
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
            raise SystemExit(f"メニュー更新に失敗しました: {e}")
```

`management/commands/` には既に `load_standard_foods.py` があるはずなので、`__init__.py` 等の配置は既存構造に倣う（追加作成が必要か確認）。

### 2-2. Celery 本体の削除（§3.3.1, §3.3.2）
- **ファイル削除**: `backend/dishboard_project/celery.py`、`backend/record_app/tasks.py`。
- **`backend/dishboard_project/__init__.py` の修正**: フェーズ 0 の (5) で見つかった Celery アプリ読み込み（`from .celery import app as celery_app` / `__all__ = ('celery_app',)` 等）を削除する。
- **`backend/dishboard_project/settings/base.py` の修正**:
  - 冒頭の `from celery.schedules import crontab` を削除。
  - `CELERY_BROKER_URL` / `CELERY_RESULT_BACKEND` / `CELERY_ACCEPT_CONTENT` / `CELERY_TASK_SERIALIZER` / `CELERY_RESULT_SERIALIZER` / `CELERY_TIMEZONE` の各行を削除。
  - `CELERY_BEAT_SCHEDULE = { ... }` ブロックを削除。

### 2-3. requirements.txt から Celery/Redis 依存を削除（§3.1）
以下を削除:
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
**注意**: フェーズ 0 の (4) で `timezone_field` の直接参照が見つかっていた場合は `django-timezone-field==7.1` の削除を中止して報告。`python-dateutil` / `pytz` / `tzdata` / `six` は他でも使う可能性があるため削除しない。

### 2-4. Celery テストの整理（§3.8 後半）
フェーズ 0 の (6) の結果に応じて:
- スクレイピングを Celery タスク経由でテストしているものがあれば、`call_command('update_cafeteria_menus')` を使う形、または `CafeteriaScraper` を直接テストする形に書き換える。
- OCR タスク（`process_nutrition_label_task`）のテストがあれば削除（OCR の同期テストは `test_ocr.py` にあるため重複）。
- 判断に迷うテストがあれば、そのテスト名を挙げて報告し、指示を仰ぐ（**停止条件**）。

**フェーズ 2 完了後コミット例**: `refactor: Celery/Redisを廃止しスクレイピングを管理コマンド化`

## フェーズ 3: nginx 設定と Dockerfile（仕様書 §5.1, §5.3）

### 3-1. nginx 統合設定の作成（§5.1）
`nginx/conf.d/dishboard.conf` を仕様書 §5.1 の内容に置き換える（既存ファイルがあれば上書き）。要点:
- HTTP(80) は ACME チャレンジ用 location と HTTPS リダイレクト。
- HTTPS(443) で SSL 終端、フロント SPA 配信（`try_files ... /index.html`）、`/api/`・`/admin/`・`/static/` を backend にプロキシ、`/health` 用 location。
- `/static/` は whitenoise 委譲のため `alias` ではなく backend へ `proxy_pass`。
- `client_max_body_size 20M`（OCR 画像アップロード用）。
- `server_name` は `<sub>.duckdns.org` のままプレースホルダで置く（実値は運用時に差し替え）。
- `ssl_certificate` / `ssl_certificate_key` のパスは `/etc/letsencrypt/live/<sub>.duckdns.org/...` のプレースホルダで記載。

### 3-2. 旧 nginx 設定の削除（§5.1）
フロントイメージ用の旧設定 `nginx/nginx.conf`（`server_name localhost;` で始まるもの）を削除する。設定ファイルの二重管理を解消。

### 3-3. フロント Dockerfile の調整（§5.3）
`frontend/Dockerfile` の production ステージから `COPY nginx.conf /etc/nginx/conf.d/default.conf` の行を削除する（nginx 設定は本番 compose のボリュームマウントで与えるため）。`COPY --from=builder /app/dist /usr/share/nginx/html` と権限設定（chown/chmod）は残す。

**フェーズ 3 完了後コミット例**: `refactor: nginx設定を統合し単一オリジン構成に変更`

## フェーズ 4: 本番 Docker Compose と環境変数テンプレート（仕様書 §5.2, §5.4）

### 4-1. 本番 compose の再設計（§5.2）
`docker-compose.production.yml` を仕様書 §5.2 の構成に再設計する。現行との差分:
- **`redis` サービスを削除。**
- **`celery` / `celery-beat` サービスを削除。**
- **`nginx` サービスを新設**（`frontend` の Dockerfile の `production` ステージをビルド、`args: VITE_API_URL: /api`、80/443 公開、`./nginx/conf.d` と certbot 用ボリューム `certbot_certs`・`certbot_www` をマウント、`depends_on: [backend]`）。
- **`backend` の `ports` を削除し `expose: ["8000"]`** に（外部非公開）。`environment` に `AZURE_VISION_ENDPOINT` / `AZURE_VISION_KEY` を追加。`REDIS_URL` / `CELERY_*` は記載しない。
- **`volumes` に `certbot_certs`・`certbot_www` を追加。** `postgres_data` / `static_files` / `media_files` は維持。
- `db` サービスと既存の `env_file` / `restart: always` / `networks` / healthcheck は踏襲。

仕様書 §5.2 に具体的な YAML 骨子があるので、それを正とする。既存 compose の値（コンテナ名・ボリューム名・ネットワーク名）はできる限り踏襲し、むやみに変えない。

### 4-2. 環境変数テンプレートの作成（§5.4）
`.env.production.example` を新規作成する。仕様書 §5.4 の雛形に従い、**実値は入れずプレースホルダのみ**。含める変数: `SECRET_KEY` / `DJANGO_ENV` / `DEBUG` / `ALLOWED_HOSTS` / `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS` / `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` / `DB_HOST` / `DB_PORT` / `AZURE_VISION_ENDPOINT` / `AZURE_VISION_KEY`。`REDIS_URL` / `CELERY_*` は含めない。スケジューラは SSH 方式（後述フェーズ 5）を採るため、HTTP トリガー用トークンは含めない。

**フェーズ 4 完了後コミット例**: `refactor: 本番Compose構成をGCP単一VM向けに再設計`

## フェーズ 5: GitHub Actions ワークフロー（仕様書 §6.1）

`.github/workflows/scrape-cafeteria.yml` を新規作成する。**SSH 方式（方式 A）**を採用（VM に SSH してコンテナ内で管理コマンドを実行）。仕様書 §6.1 の YAML を正とする。要点:
- `on.schedule.cron: "0 23 * * 0"`（日曜 23:00 UTC = 月曜 8:00 JST。元の Celery beat スケジュール「月曜 8:00」を踏襲）。
- `workflow_dispatch: {}` で手動実行も可能に。
- `appleboy/ssh-action` を使い、Secrets（`GCP_VM_HOST` / `GCP_VM_USER` / `GCP_SSH_PRIVATE_KEY`）で接続。
- 実行スクリプト: `cd ~/dishboard` → `docker compose -f docker-compose.production.yml exec -T backend python manage.py update_cafeteria_menus`。

Secrets 自体の登録は利用者が GitHub 上で行うため、コードには含めない（ワークフロー内では `${{ secrets.XXX }}` で参照するのみ）。

**フェーズ 5 完了後コミット例**: `feat: 週次スクレイピングをGitHub Actions cronで実行`

## フェーズ 6: README 追記（仕様書 §7, §8）

`README.md`（または `docs/deployment.md` を新規作成）に、GCP 構築・デプロイ手順の要約を追記する。コードではなくドキュメント。含める内容:
- GCP e2-micro（us-west1、Ubuntu、外部 IP、標準永続ディスク、ネットワーク層 Standard）作成の要点
- スワップ 2GB 設定
- Docker/Compose インストール
- DuckDNS + Let's Encrypt(certbot) の HTTPS 設定
- 新規 DB 構築フロー（migrate → load_standard_foods → createsuperuser。**データ移行は行わない**旨を明記）
- GitHub Actions Secrets（`GCP_VM_HOST` / `GCP_VM_USER` / `GCP_SSH_PRIVATE_KEY`）の登録
- 検証チェックリスト（仕様書 §9 相当）

既存 README の構成を壊さず、デプロイ手順セクションを追加する形にする。

**フェーズ 6 完了後コミット例**: `docs: GCP移行のデプロイ手順をREADMEに追記`

## 実装後の検証

全フェーズ完了後、以下を実施して結果を報告してください。

1. **テストスイート実行**（あなたの環境で可能な方法で。docker compose またはローカル venv）:
   ```bash
   # 例（コンテナ利用時）
   docker compose exec backend pytest -q
   ```
   OCR テスト・スクレイピング関連テストを含め全件パスすることを確認。落ちたテストがあれば、原因が「Azure 移行/Celery 削除に伴う期待値変更」か「実装バグ」かを切り分けて報告し、前者ならテスト側を仕様に沿って修正、後者なら実装を修正。判断に迷えば報告。
2. **compose 構文チェック**:
   ```bash
   docker compose -f docker-compose.production.yml config
   ```
   構文エラーが出ないこと。
3. **残存参照チェック**（消し忘れ検出）:
   ```bash
   grep -rn "celery\|Celery\|CELERY\|easyocr\|EasyOCR\|import cv2\|from sklearn" backend/ --include=*.py
   ```
   ヒットが「意図的に残したもの（あれば）」以外に無いことを確認。想定外のヒットがあれば報告。

## 停止条件（まとめ）

以下に該当したら、その時点で作業を止めて状況を報告し、指示を仰いでください（無断で進めない）。

- フェーズ 0 (1): OCR プロセッサ**以外**で cv2/sklearn/easyocr/pytesseract が使われている。
- フェーズ 0 (2): Celery タスクが `.delay()` / `.apply_async()` で**実際に呼び出されている**。
- フェーズ 0 (4): `timezone_field` が直接参照されている（該当依存の削除可否）。
- フェーズ 2-1: `CafeteriaScraper` の公開メソッド名が `fetch_and_update_menus` と異なる、または既存 Celery タスクが別メソッドを呼んでいる。
- フェーズ 2-4: 扱いに迷う Celery 関連テストがある。
- 検証: テスト失敗の原因が実装バグかテスト期待値変更か判断できない。
- その他、仕様書の内容と実際のコードが食い違い、独断での判断が破壊的変更につながりうる場合。

## 最終報告

全て完了したら、以下を報告してください。
- 各フェーズで変更/新規作成/削除したファイルの一覧
- フェーズ 0 の grep 結果の要約
- テスト実行結果（パス/フェイル数）
- 停止・確認が必要だった箇所（あれば）
- 仕様書に照らして「仕様外の変更が混入していないか」の自己点検結果

===== ここまでプロンプト本体 =====

---

## 補足: 実装完了後の流れ（利用者向けメモ）

Claude Code での実装が完了したら、以下の順で本番反映します。

1. ローカルで全フェーズ完了・テストパスを確認
2. `git push` で GitHub に反映
3. GCP VM 上で `cd dishboard && git pull`（既に clone 済みのため pull で最新化）
4. `.env` を実値で作成（`.env.production.example` を元に）
5. `docker compose -f docker-compose.production.yml build`
6. DB 新規構築: `migrate` → `load_standard_foods` → `createsuperuser`
7. `docker compose -f docker-compose.production.yml up -d`
8. DuckDNS + certbot で HTTPS 設定
9. GitHub Secrets 登録 + Actions 手動実行でスクレイピング動作確認

デプロイ手順の詳細は GCP セットアップ手順書（`setup-gcp-guide.md`）を参照。
