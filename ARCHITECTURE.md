# DishBoard アーキテクチャ

公開する技術資料を `docs-public/` に集約した。現在の構成と処理の流れは
**[アーキテクチャ](docs-public/architecture.md)** を参照。

| 内容 | 文書 |
|---|---|
| モデルの関係、栄養値、更新・削除 | [データ設計](docs-public/data-model.md) |
| HTTP の入口と Web / MCP の違い | [Web API](docs-public/api.md) / [MCP](docs-public/mcp.md) |
| 認証・認可・Google 連携 | [認証仕様](docs-public/google-authentication.md) |
| 代替案と採用理由 | [設計判断の記録](docs-public/decisions.md) |
| 起動・テスト・反映 | [開発手順](docs-public/development.md) / [運用手順](docs-public/operations.md) |

このファイルは旧リンクの入口として残す。本文の更新先は `docs-public/architecture.md`。
過去の ADR にある本ファイルの節番号は当時の構成を指す。
