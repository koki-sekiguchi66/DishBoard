# 開発手順

[ドキュメント一覧](README.md) / [アーキテクチャ](architecture.md) / [運用手順](operations.md)

## 前提

基本の開発環境は Docker Engine と Compose v2 を使う。
ホストでテストを実行する場合は Python 3.12 系と Node.js 20 系を基準とし、
依存関係はリポジトリ内の requirements と npm の lockfile からインストールする。
SQLite へのフォールバック設定はあるが、pg_trgm のマイグレーションと検索があるため
アプリの起動・バックエンドテストには PostgreSQL が必要である。

## 環境設定

開発用の設定ファイルは `backend/.env`。リポジトリにコミットせず、次の変数をローカル環境用に設定する。
本番用のファイルをそのまま複製しない。ここでは名前と用途だけを示す。

| 変数 | 用途 |
|---|---|
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | 開発専用DBの名前・利用者・パスワード。テスト時はテストDB作成権限も必要 |
| `DB_HOST` / `DB_PORT` | Compose 内では `db` と `5432`。ホスト実行時は到達可能な接続先 |
| `DB_HOST_LOCAL` | ホスト名の自動判定より優先するDB接続先。通常のCompose内では指定しない |
| `SECRET_KEY` | Django の秘密鍵。開発設定には専用フォールバックがあるが、本番では独立した秘密値を設定する |
| `ALLOWED_HOSTS` | 開発時に使うホスト名。例: `localhost,127.0.0.1,backend` |
| `DEBUG` | 開発のデバッグ表示は `True`。本番には使わない |
| `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS` | 別オリジンの通信・認可画面を使う場合の許可元 |
| `AZURE_VISION_ENDPOINT` / `AZURE_VISION_KEY` | OCR 用。未設定では実際の OCR は利用できない |
| `GOOGLE_CLIENT_ID` | Google ログイン用。未設定では Google ログインは無効 |
| `MCP_RESOURCE_URL` / `OAUTH2_ISSUER_URL` | MCP の公開URLと認可サーバーの識別子。詳細は認証仕様 |

現在の DB 設定が読むのは `POSTGRES_*` と `DB_*`。
本番 Compose に `DATABASE_URL` の指定があっても、これだけでは DB を設定できない。

Django の設定切替は `DJANGO_ENV`、明示的な設定モジュール指定は `DJANGO_SETTINGS_MODULE` で行う。
MCP プロセスは `settings.mcp` を使い、環境別設定を読み込んだ後にログを標準出力へ切り替える。
正本は [settings](../backend/dishboard_project/settings)。

## Compose で起動する

以下はリポジトリ直下で実行する。`--env-file` は Compose の変数展開にも開発設定を渡すための指定であり、
特に frontend の `GOOGLE_CLIENT_ID` → `VITE_GOOGLE_CLIENT_ID` に必要になる。

```bash
docker compose --env-file backend/.env up -d --build db backend
docker compose --env-file backend/.env logs -f backend
```

backend のマイグレーション・標準食品投入が完了し、開発サーバーが起動したらログ表示を終了し、残りを起動する。
DB の healthy はスキーマ準備完了を意味しないので、初回の MCP 利用はこの後に行う。

```bash
docker compose --env-file backend/.env up -d --build mcp frontend
docker compose --env-file backend/.env ps
```

PWA は `http://localhost:5173`、API は `http://localhost:8000/api/`、MCP は
`http://localhost:8001/mcp`。MCP は認証付きであり、URLを開くだけでツールを利用できるわけではない。
クラウド上の MCP クライアントからローカルホストへは直接接続できない。

開発 Compose の backend は起動時に `migrate` と `load_standard_foods` を自動実行する。
本番は自動実行しない。[本番反映手順](operations.md)で明示的に実行する。

Vite の `/api` プロキシ先は Compose 内の `backend:8000`。
ホストで Vite だけを起動する場合はこの名前が解決できないため、API接続先とCORS設定を別途合わせる必要がある。
標準の起動経路には Compose を使う。

## 品質確認

起動済み開発コンテナでは次を実行できる。テストは本番DBへ向けない。

```bash
docker compose --env-file backend/.env exec backend python -m pytest -q
docker compose --env-file backend/.env exec frontend npx tsc --noEmit
docker compose --env-file backend/.env exec frontend npm run lint
docker compose --env-file backend/.env exec frontend npm run test:run
docker compose --env-file backend/.env exec frontend npm run build
```

ホストで実行する場合は `backend` で仮想環境を作り、`python -m pip install -r requirements.txt` を実行する。
Windows は `venv/Scripts/python.exe -m pytest -q`、仮想環境を有効化した Linux/macOS は
`python -m pytest -q`。PostgreSQL は引き続き必要である。
frontend は `npm ci` 後、上記の `npx`・`npm` コマンドを `frontend` ディレクトリで実行する。

| 検査 | 何を検証するか |
|---|---|
| pytest / pytest-django | API・所有者分離・トランザクション・計算・CSV取り込み・MCP |
| `tsc --noEmit` | TypeScript の型整合性 |
| ESLint | `.ts` / `.tsx` の未使用値・Hooks 等。型チェックの代替にはしない |
| Vitest / Testing Library | 入力・表示・状態遷移、API呼び出し |
| Vite build | 配布用 SPA と Service Worker の生成 |

テスト設定は [pytest.ini](../backend/pytest.ini)、[vite.config.js](../frontend/vite.config.js)、
[eslint.config.js](../frontend/eslint.config.js)。Google・OCR・学食サイトはテストでモックし、外部通信の成功を前提にしない。
型検査・ビルドの成功だけでは、MCP の実際の OAuth 接続や本番のプロキシ疎通を検証したことにはならない。

## 変更する場所を探す

| 変更したいもの | 起点 | 併せて確認するもの |
|---|---|---|
| Web の入出力 | `record_app/urls.py` → `views.py` → `serializers.py` | 所有者分離、一覧と詳細の違い |
| 栄養計算・食品検索 | `record_app/business_logic/` | 100g基準と実数値、Web/MCP双方のテスト |
| MCP ツール | `mcp_server/tools.py` と `server.py` | スコープ、description、副作用注釈、確認と再送 |
| データの保存形式 | `record_app/models.py` | マイグレーション、既存値の保持、切り戻し |
| 画面と入力 | `frontend/src/features/<機能>/` | feature の公開 `index.ts`、共通型、入力途中の状態 |
| 配信と設定 | Compose・Dockerfile・nginxテンプレート | `VITE_` はビルド時、環境変数はコンテナ作成時に確定 |

実装の規約と作業別手順は [CLAUDE.md](../CLAUDE.md)、
[backend/CLAUDE.md](../backend/CLAUDE.md)、[frontend/CLAUDE.md](../frontend/CLAUDE.md)を参照。
文書の更新先は [公開資料の索引](README.md)から選び、変更した判断は ADR に残す。
