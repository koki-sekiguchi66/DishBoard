# 運用と更新

[ドキュメント一覧](README.md) / [開発手順](development.md) / [認証](google-authentication.md)

対象は既存の Linux VM 上の Docker Compose 構成である。以下は実行手順であり、
現在の本番反映状況を示すものではない。初回の HTTPS・証明書・VM 構築は
[デプロイ手順書](../.claude/skills/deploy/SKILL.md)を参照する。

## 本番の構成と設定

本番 Compose は `db`・`backend`・`mcp`・`nginx` の4サービス。
ホストへ公開するのは nginx の80/443番で、PostgreSQL とアプリへの接続は内部ネットワークを使う。
PostgreSQL・静的ファイル・メディア・証明書には名前付きボリュームを使う。

設定ファイルはリポジトリ直下の `.env`。開発用の `backend/.env` とは読み込み先が異なる。
DB 接続の `POSTGRES_*`、Django の秘密鍵、公開ホスト・CORS・CSRF、外部サービスの設定に加え、
`DISHBOARD_DOMAIN`・`DISHBOARD_AUTH_DOMAIN` を nginx テンプレートへ渡す。
認可用ホストも `ALLOWED_HOSTS` と `CSRF_TRUSTED_ORIGINS` に含める。
設定値そのものをリポジトリや公開ログへ貼らない。

frontend の `VITE_` 変数はビルド時に埋め込まれるため、変更後は `nginx` イメージの再ビルドが必要。
backend / mcp の環境変数の変更はコンテナ再作成が必要で、`restart` だけでは更新されない。
nginx の設定変更は生成先でなく [テンプレート](../nginx/templates/dishboard.conf.template)へ行う。

## 更新前に確認するもの

反映するコミットがリモートにあり、作業ツリーに意図しない変更がないことを確認する。
DB変更の内容、マスタ再投入の必要性、旧コードと追加スキーマの互換性を確認してから実行する。
本番データを変更する操作は対象環境への実行許可が前提となる。

DBバックアップは更新前に取得し、VM外にも退避する。メディアや証明書のボリュームはDB dumpに含まれない。
必要な復旧対象に応じて別に保全する。`docker compose down -v` は永続ボリュームを削除するため、更新手順に使わない。

## 通常更新のコマンド

本番 VM の Bash で、作業ディレクトリを合わせて実行する。
`set -eu` をサブシェル内に置き、途中のコマンドが失敗した場合は後続を実行しない。

```bash
(
set -eu
cd ~/dishboard

umask 077
backup_file="$HOME/dishboard_$(date +%Y%m%d_%H%M%S).dump"
docker compose -f docker-compose.production.yml exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$backup_file"
test -s "$backup_file"
docker compose -f docker-compose.production.yml exec -T db pg_restore --list < "$backup_file" > /dev/null
echo "バックアップ: $backup_file"

git pull --ff-only origin main
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml run --rm backend python manage.py migrate --noinput

# 食品データ・取り込み処理を更新するリリースでは実行する
docker compose -f docker-compose.production.yml run --rm backend python manage.py load_standard_foods /app/data/standard_foods.csv

docker compose -f docker-compose.production.yml up -d
docker compose -f docker-compose.production.yml restart nginx
docker compose -f docker-compose.production.yml ps
docker compose -f docker-compose.production.yml exec -T backend python manage.py showmigrations record_app
docker compose -f docker-compose.production.yml logs --tail=100 backend mcp nginx
)
```

`pg_restore --list` はアーカイブの目録が読めることの確認であり、別DBへの復元検証の代替ではない。
バックアップの復元は稼働DBへ直接試さず、独立した環境で検証する。

本番の backend は Gunicorn を起動するだけで、`migrate` と食品投入は自動実行しない。
追加カラムを読む新コードを起動する前にマイグレーションを適用する。
この順序は追加スキーマと旧コードが互換である変更に適用でき、削除・改名などでは別の移行計画が必要になる。
backend / mcp を再作成した後は、nginx が接続先を解決し直すよう再起動する。

## 反映確認

| 確認 | 判断する内容 |
|---|---|
| `git rev-parse HEAD` | 意図したコミットになっているか |
| `showmigrations record_app` | 対象マイグレーションが `[X]` か。Myアイテムと再送対応は0013・0014 |
| 食品投入の結果 | 現在の同梱CSVなら2,538件。食品番号で更新され、既存IDが維持される |
| Web のログイン・食品検索・本人の記録表示 | 認証、API、DB、ブラウザの配布資産が連携するか |
| MCP の認可・食品検索 | 認可オリジンと `/mcp` の双方が正常か。追加ツールはクライアントの一覧も確認 |
| PWA の更新通知 | 開いている端末に新しい Service Worker が適用されたか |

`/api/health/` の成功だけでは DB や MCP の機能まで正常とは判断できない。
また、backend のイメージにある HTTP ヘルスチェックは8000番向けなので、同じビルド定義を使う
mcp の健康状態表示だけで `/mcp` の正常性を判断しない。MCP は実際の認証付き呼び出しで確認する。

## 定期処理と切り戻し

[学食更新 workflow](../.github/workflows/scrape-cafeteria.yml)は毎週月曜08:00 JSTに管理コマンドを実行する。
GitHub Actions はメニュー更新用であり、main への push を自動デプロイする workflow ではない。
取得件数と各食堂の内容を確認する。全体で0件の場合は既存マスタを保持するが、
部分的な取得失敗や入替途中の失敗まで自動復旧する構成ではない。

Google連携（0010）・Myアイテム（0013）・再送防止（0014）の切り戻しは、追加スキーマを残してアプリを戻す方針を取る。
Google連携情報・食品の出典・再送キーを失う逆マイグレーションを安易に実行しない。
DB復元が必要な場合は、バックアップ後に追加された記録が失われる影響も含めて判断する。

標準食品の再投入は、過去の食事・Myメニューの保存済み栄養値を補正しない。
既存値の確認方法と更新範囲は [MCP・食品データ仕様](mcp.md)を参照。
