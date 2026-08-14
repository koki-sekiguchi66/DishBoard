# DishBoard

食事と体重を記録して栄養管理を行う PWA（Django 5.2 + DRF + React 19 + PostgreSQL 16）。

このプロジェクトは3つの役割を同時に担う。判断に迷ったらこの優先順で考える。

1. **実用ツール** — 研究室のメンバー10〜20名が実際に使う。壊すと利用者に影響する
2. **ポートフォリオ** — SIer 就活で「なぜこの設計か」を説明する材料。判断の理由が残っていること自体が価値
3. **学習教材** — 自分が理解できない実装を残さない

## ディレクトリ

- `backend/` — Django / DRF。層構造とデータ設計の規約は `backend/CLAUDE.md`
- `frontend/` — React + TypeScript + Vite。features 構成と規約は `frontend/CLAUDE.md`
- `nginx/conf.d/` — 本番の同一オリジン配信設定（開発では使わない）
- `.github/workflows/` — 週次の学食スクレイピング（cron → SSH → 管理コマンド）

## コマンド

```bash
# 開発環境（db + backend + frontend）
docker compose up -d
docker compose logs -f backend

# バックエンドのテスト（PostgreSQL 必須。SQLite では動かない）
docker compose up -d db
cd backend && venv/Scripts/python.exe -m pytest -q     # Windows
# cd backend && python -m pytest -q                     # Linux/macOS

# フロントエンド
cd frontend
npm run test:run        # テスト（watch は npm run test）
npm run lint            # ESLint
npx tsc --noEmit        # 型チェック
npm run build           # ビルド
```

`backend` コンテナは起動時に `migrate` と `load_standard_foods` を自動実行する。

## 絶対的な制約

- リファクタリングの依頼時以外、**既存アーキテクチャを許可なく変更しない**
- **ライブラリのバージョンを勝手に更新しない**（追加・削除も事前確認）
- **DB スキーマ変更・新規マイグレーション追加は必ず事前確認**
- **`@ts-expect-error` / `any` を使わない**。型エラーは正当な修正で解決する
- マジックナンバーは定数化する
- コメントは「何を」ではなく「なぜ」を書く
- **仕様外の「ついでの」リファクタリング・命名統一をしない**。変更範囲は最小に保つ
- `.env` / `.env.*` の中身を読まない・書かない・コミットしない
- `docker-compose.production.yml` と `nginx/conf.d/` は本番構成。触る前に必ず確認を取る

## 作業の進め方

- コードを書く前に、対象ファイルの現状を読む
- 破壊的変更につながりうる判断は、推測で進めず確認を求める
- テストは通すためだけに緩めない。落ちた原因が「仕様変更」か「実装のバグ」かを切り分ける
- 大きな変更は論理的単位でコミットを分ける（切り戻せる粒度に）
- 「動けばよい」で済ませない。ただし、こだわりが**このアプリの実態**（研究室10〜20名 / 1GB VM / PWA）に照らして意味があるかは常に問う

## 言語とコミット

- 対話・コミットメッセージ・docstring・コメントは**日本語**
- コード（識別子）は英語
- コミットは Conventional Commits 風 + 日本語1行要約: `feat(settings): 目標値の編集に対応`
  - type: `feat` / `fix` / `refactor` / `docs` / `chore` / `test`
  - **`Co-Authored-By` は付けない**

## 参照

- 手順が必要な作業には Skill がある: `add-api-endpoint` / `add-frontend-feature` / `write-tests` / `deploy`（`/deploy` と明示したときのみ）
- 設計判断の経緯・デプロイ詳細・トラブル事例は `docs/`（Git 管理外。`git add` しない）
