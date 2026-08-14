---
name: deploy
description: GCP e2-micro（Always Free）への DishBoard のデプロイ・初期構築手順。/deploy と明示的に指定されたときだけ使う。
disable-model-invocation: true
---

# デプロイ（GCP e2-micro）

**このスキルは副作用が大きい。コマンドを実行する前に、何をどのホストに対して行うかをユーザーに確認すること。**
本番の DB とドメインに触れる操作であり、失敗すると利用者（研究室10〜20名）に影響する。

対象: GCP Compute Engine e2-micro 上の Docker Compose（`docker-compose.production.yml`）。
詳細な背景と検証チェックリストは `docs/deployment.md` にある。

## A. 通常のデプロイ（コード更新の反映）

```bash
cd ~/dishboard
git pull
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml up -d

# マイグレーションがある場合のみ
docker compose -f docker-compose.production.yml exec backend python manage.py migrate

docker compose -f docker-compose.production.yml ps      # db(healthy) / backend / nginx が Up
docker compose -f docker-compose.production.yml logs --tail=100 backend
```

- `docs/` は `.gitignore` 済みなので `git pull` では VM に降りてこない
- フロントの `VITE_API_BASE_URL` はビルド時に埋め込まれる。値を変えたら **build からやり直す**

## B. 初期構築で必ず踏む2つの罠

### B-1. nginx と Let's Encrypt の「鶏と卵」問題 ★

nginx 設定に 443 の server ブロックがあると、証明書が無い状態では nginx が起動できない。
しかし nginx が起動しないと ACME チャレンジに応答できず、証明書が取得できない。

**回避手順**（設定をボリュームマウントで与えているのでイメージ再ビルドは不要）:

```bash
cd ~/dishboard

# 1. 本来の設定を退避
cp nginx/conf.d/dishboard.conf nginx/conf.d/dishboard.conf.full

# 2. 80番のみ・SSL 参照なしの最小設定に一時差し替え（<sub> は実際のサブドメインに置換）
cat > nginx/conf.d/dishboard.conf <<'EOF'
server {
    listen 80;
    server_name <sub>.duckdns.org;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 200 "temporary\n"; add_header Content-Type text/plain; }
}
EOF

# 3. nginx を起動して Up を確認
docker compose -f docker-compose.production.yml up -d nginx
docker compose -f docker-compose.production.yml ps

# 4. certbot で証明書を取得（ボリューム名は docker volume ls で確認する）
docker run --rm \
  -v dishboard_certbot_certs:/etc/letsencrypt \
  -v dishboard_certbot_www:/var/www/certbot \
  certbot/certbot certonly --webroot -w /var/www/certbot \
  -d <sub>.duckdns.org --email <your-email> --agree-tos --no-eff-email

# 5. 本来の設定に戻して再起動
mv nginx/conf.d/dishboard.conf.full nginx/conf.d/dishboard.conf
docker compose -f docker-compose.production.yml restart nginx
```

証明書は90日で失効する。cron で `certbot renew`（毎月1日・15日 3:00）を回すこと。

### B-2. GitHub Secrets `GCP_VM_HOST`

**ホスト名のみ**を入れる。`https://` やスラッシュ、ポート表記を含めない。
含めると `dial tcp: address tcp///<domain>: unknown port` で失敗する。

`GCP_SSH_PRIVATE_KEY` は **パスフレーズなし**の CI 専用鍵を使う（`appleboy/ssh-action` は対話入力できない）。

## C. GCP 無料枠を外れない条件 ★1つでも誤ると課金

| 項目 | 必須 |
|---|---|
| マシンタイプ | `e2-micro` のみ |
| リージョン | us-west1 / us-central1 / us-east1 のみ |
| ブートディスク | **標準永続ディスク**・**30GB 以内**（Balanced / SSD は課金） |
| ネットワークサービス階層 | **標準**（デフォルトはプレミアム。必ず変更する） |
| インスタンス数 | 1台のみ |

保険として GCP で **$1 の予算アラート**を設定しておく。
VM 作成画面の「月間予測」は無料枠を差し引く前の定価なので、$7 程度と表示されても正常。

## D. DB の新規構築（初回のみ）

```bash
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml up -d db
docker compose -f docker-compose.production.yml run --rm backend python manage.py migrate
docker compose -f docker-compose.production.yml run --rm backend \
  python manage.py load_standard_foods /app/data/standard_foods.csv
docker compose -f docker-compose.production.yml run --rm -it backend python manage.py createsuperuser

# 学食メニューの初回取得（起動時の自動取得は Celery 廃止時に削除済み）
docker compose -f docker-compose.production.yml exec backend python manage.py update_cafeteria_menus
```

pg_trgm が有効か確認する（無効だと食品のあいまい検索が動かない）:

```bash
docker compose -f docker-compose.production.yml exec db \
  psql -U <POSTGRES_USER> -d <POSTGRES_DB> \
  -c "SELECT extname FROM pg_extension WHERE extname='pg_trgm';"
```

## E. 運用

```bash
docker stats --no-stream     # メモリ・CPU
free -h                      # RAM とスワップ（2GB のスワップが必須）
df -h                        # ディスク（30GB を超えないこと）

# DB バックアップ（自動化は未実装。VM 外へ退避すること）
docker compose -f docker-compose.production.yml exec -T db \
  pg_dump -U <POSTGRES_USER> -d <POSTGRES_DB> -Fc > ~/dishboard_$(date +%Y%m%d).dump
```

問題が起きたら `docs/troubleshooting.md` を先に見る。
