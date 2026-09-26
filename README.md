# DishBoard

食事と体重を記録して栄養管理を行う PWA。
研究室のメンバー10〜20名が日常的に使う実用ツールとして運用している。
Django + DRF + PostgreSQL / React + TypeScript / Docker Compose で構成する。
Web 画面に加え、OAuth で認可した MCP クライアントから食品検索・食事記録を操作できる。

## 主な機能

- 標準食品・Myアイテム・3食堂の学食メニューを使った食事記録
- 12栄養素の集計、栄養目標との比較、体重推移の表示
- 栄養成分表示の OCR 読み取りと、確認・修正後の登録
- 再利用可能な Myメニュー、出典と1食分重量を持つ Myアイテム
- PWA のインストール・キャッシュからの起動・更新通知
- MCP の食品検索、食事の参照・作成・編集・確認付き削除、再送キーによる重複防止

PWA のオフライン起動は、食事のオフライン保存・自動同期を保証するものではない。

## 技術を理解する

公開資料の入口は **[docs-public/README.md](docs-public/README.md)**。

| 読みたいこと | 文書 |
|---|---|
| システム構成と処理の流れ | [アーキテクチャ](docs-public/architecture.md) |
| 保存形式・単位・データの整合性 | [データ設計](docs-public/data-model.md) |
| Web API と MCP の契約 | [Web API](docs-public/api.md) / [MCP](docs-public/mcp.md) |
| 認証と Google 連携 | [認証仕様](docs-public/google-authentication.md) |
| なぜこの設計にしたか | [設計判断の記録（ADR）](docs-public/decisions.md) |

## 開発と運用

[開発手順](docs-public/development.md)に従って開発用環境変数を準備し、リポジトリ直下で起動する。

```bash
docker compose --env-file backend/.env up -d --build db backend
```

backend のマイグレーション・食品投入が完了した後、残りを起動する。

```bash
docker compose --env-file backend/.env up -d --build mcp frontend
```

PWA は `http://localhost:5173`。設定項目・テストは [開発手順](docs-public/development.md)、
既存環境への反映とバックアップは [運用手順](docs-public/operations.md)を参照。
main への push だけで本番へ自動反映される構成ではない。

作業規約は [CLAUDE.md](CLAUDE.md)、AI エージェント共通入口は [AGENTS.md](AGENTS.md)。
初期の開発記録は [history.md](docs-public/history.md)、UI の検討資料は
[ui-design-proposal.md](docs-public/ui-design-proposal.md) に保存している。
