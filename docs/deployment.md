# DishBoard デプロイ手順（GCP e2-micro）

AWS から GCP Compute Engine e2-micro（Always Free）へ移行した後の構築・デプロイ手順。
構成の設計意図は `docs/dishboard-migration-spec-v3.md` を参照。

## 構成概要

```
[ユーザー] → HTTPS → [DuckDNS: <sub>.duckdns.org]
                          │
        ┌─────────────────▼──────────────────┐
        │ GCP e2-micro (x86 / 1GB)           │
        │  nginx (80/443)                    │
        │   ├─ / , /assets → フロント静的配信 │
        │   └─ /api/ /admin/ /static/ → Django│
        │  Django + Gunicorn (8000, 内部のみ) │
        │  PostgreSQL 16（コンテナ同居）      │
        └────────────────────────────────────┘
                 ▲                  │ HTTPS（OCR時のみ）
                 │                  ▼
         [GitHub Actions]   [Azure AI Vision - Read API]
           週次 cron → SSH
```

Redis / Celery worker / Celery beat は使用しない。定期スクレイピングは GitHub Actions から
Django 管理コマンド `update_cafeteria_menus` を実行する。

## 1. VM の作成

- マシンタイプ: **e2-micro**
- リージョン: **us-west1** など Always Free 対象の US リージョン
- OS: Ubuntu
- ブートディスク: **標準永続ディスク**（30GB まで無料枠）
- ネットワークサービス階層: **Standard**（Premium は課金対象）
- 外部 IP: 付与する
- ファイアウォール: VPC ファイアウォールで **80 / 443 / 22** を許可

## 2. スワップ 2GB の設定

1GB RAM の安全余裕を確保する（e2-micro は共有 vCPU のため瞬間的な負荷に弱い）。

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h   # Swap 行が 2.0Gi になっていることを確認
```

## 3. Docker / Docker Compose のインストール

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER   # 再ログインして反映
docker compose version
```

## 4. リポジトリ配置と環境変数

```bash
git clone <このリポジトリのURL> ~/dishboard
cd ~/dishboard
cp .env.production.example .env
# .env を編集して実値を設定（SECRET_KEY / POSTGRES_* / ALLOWED_HOSTS /
# CORS_ALLOWED_ORIGINS / CSRF_TRUSTED_ORIGINS / AZURE_VISION_* ）
```

`.env` はコミットしないこと（`.gitignore` 済み）。

`nginx/conf.d/dishboard.conf` の `<sub>.duckdns.org` プレースホルダを、
取得した DuckDNS サブドメインに置換する（`server_name` と証明書パスの計 4 箇所）。

## 5. DuckDNS + Let's Encrypt (HTTPS)

1. [DuckDNS](https://www.duckdns.org/) でサブドメインを取得し、VM の外部 IP を登録。
2. IP 更新用 cron を VM に設定（DuckDNS の Install ページの手順に従う）。
3. certbot で HTTP-01 チャレンジによる証明書を取得する。nginx コンテナは
   `certbot_certs`（`/etc/letsencrypt`）と `certbot_www`（`/var/www/certbot`）を
   読み取り専用でマウントするので、同名の Docker ボリュームに証明書を配置する。
4. 更新は certbot の自動更新に任せ、更新後に nginx をリロードする。

## 6. ビルドと新規 DB 構築

**本移行ではデータ移行を行わない。** GCP 側で DB を新規構築する。

```bash
cd ~/dishboard
docker compose -f docker-compose.production.yml build

# DB のみ起動
docker compose -f docker-compose.production.yml up -d db

# マイグレーション（pg_trgm 拡張の有効化を含む）
docker compose -f docker-compose.production.yml run --rm backend python manage.py migrate

# 標準食品データの投入
docker compose -f docker-compose.production.yml run --rm backend \
  python manage.py load_standard_foods /app/data/standard_foods.csv

# 管理ユーザーの作成
docker compose -f docker-compose.production.yml run --rm -it backend \
  python manage.py createsuperuser

# 全サービス起動
docker compose -f docker-compose.production.yml up -d
```

pg_trgm が有効か確認:

```bash
docker compose -f docker-compose.production.yml exec db \
  psql -U <POSTGRES_USER> -d <POSTGRES_DB> -c \
  "SELECT extname FROM pg_extension WHERE extname='pg_trgm';"
```

## 7. 食堂メニューの初回取得

`ready()` での自動取得は廃止したため、初回は手動で管理コマンドを実行する。

```bash
docker compose -f docker-compose.production.yml exec backend \
  python manage.py update_cafeteria_menus
```

## 8. GitHub Actions（週次スクレイピング）

ワークフロー: `.github/workflows/scrape-cafeteria.yml`
スケジュール: `0 23 * * 0`（日曜 23:00 UTC = 月曜 8:00 JST）

GitHub リポジトリの Settings → Secrets and variables → Actions に以下を登録する。

| Secret | 内容 |
|--------|------|
| `GCP_VM_HOST` | VM の外部 IP または DuckDNS ドメイン |
| `GCP_VM_USER` | SSH ユーザー名 |
| `GCP_SSH_PRIVATE_KEY` | VM の `~/.ssh/authorized_keys` に登録した公開鍵に対応する秘密鍵 |

登録後、`workflow_dispatch`（Actions タブの Run workflow）で手動実行して動作確認する。

スケジューラが動かない緊急時は §7 のコマンドを VM 上で直接実行する。

## 9. Azure AI Vision（OCR）

Azure ポータルで Computer Vision リソース（**F0** 無料枠: 5,000 トランザクション/月）を作成し、
エンドポイントとキーを `.env` の `AZURE_VISION_ENDPOINT` / `AZURE_VISION_KEY` に設定する。
未設定でもアプリはクラッシュせず、OCR が `success=False` で穏当に失敗する。

## 10. 検証チェックリスト

### インフラ
- [ ] `docker compose -f docker-compose.production.yml ps` で db / backend / nginx が healthy
- [ ] redis / celery / celery-beat コンテナが**存在しない**
- [ ] `https://<sub>.duckdns.org/` でフロント表示（証明書エラーなし）
- [ ] `https://<sub>.duckdns.org/api/health/` が 200
- [ ] HTTP が HTTPS にリダイレクトされる
- [ ] `free -h` でスワップが有効

### 認証・基本機能
- [ ] 新規登録 → ログイン → トークン取得
- [ ] 食事記録の作成・一覧・削除
- [ ] 体重記録の作成・一覧
- [ ] 食品検索（トリグラム類似）が結果を返す
- [ ] My Items / My Menus の作成・利用

### OCR（Azure Vision）
- [ ] 栄養成分表示画像をアップロードして栄養素が抽出される
- [ ] 抽出後、サーバ上に一時画像ファイルが残っていない
- [ ] Azure 未設定時（キー空）に `success=False` で穏当なエラーになる
- [ ] Azure ポータルで Read API のトランザクション数が想定内

### スクレイピング
- [ ] VM 上で `manage.py update_cafeteria_menus` が成功し `CafeteriaMenu` が更新される
- [ ] GitHub Actions を手動トリガーして SSH 経由の実行が成功する
- [ ] 食堂メニュー一覧に反映される

### テスト
- [ ] `docker compose -f docker-compose.production.yml exec backend pytest` が全件パス
