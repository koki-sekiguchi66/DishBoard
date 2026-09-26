# Web API の入口と契約

[ドキュメント一覧](README.md) / [データ設計](data-model.md) / [認証](google-authentication.md) / [MCP](mcp.md)

API は `/api/` 配下に配置する。ルーティングの正本は [record_app/urls.py](../backend/record_app/urls.py)、
入力・応答の定義は [serializers.py](../backend/record_app/serializers.py) と [views.py](../backend/record_app/views.py)。
この文書は入口と重要な差異を整理するもので、全フィールドを複製した OpenAPI 定義ではない。

## 認証と共通の扱い

PWA は `Authorization: Token <DRF_TOKEN>` を送る。MCP の OAuth Bearer token とは別のトークンである。
DRF はセッション認証も設定しており、セッションを使う変更リクエストでは CSRF 対策が適用される。
原則として認証必須だが、ユーザー登録・ログイン・Google ログイン・ヘルスチェックは匿名で利用できる。

個人データの所有者は認証した利用者から決め、リクエストの `user` で指定させない。
他人の個人リソースは利用者別 queryset の外にあるため、詳細取得・編集・削除では404になる。
日付は `YYYY-MM-DD`、栄養値は [共通単位](data-model.md)に従う。

エラー形式は一律ではない。serializer のフィールド別エラー、DRF の `detail`、
関数ビューの `error` などがある。OCR は HTTP 200 でも `success=false` を返す場合がある。

## リソース一覧

CRUD は一覧 GET・作成 POST と、`{id}/` に対する GET・PUT・PATCH・DELETE を指す。

| パス（`/api/` からの相対） | 操作 | 契約 |
|---|---|---|
| `meal-records/` | CRUD | 一覧は合計 kcal/PFC と明細件数。詳細は12栄養素と `items` を含む |
| `weights/` | CRUD | POST は同日なら上書き。新規201、更新200 |
| `foods/custom/` | CRUD | Myアイテム。栄養値は `*_per_100g` で送受信 |
| `foods/custom/create_from_meal/` | POST | 入力した分量の食品を100g基準へ換算して保存 |
| `custom-menus/` | CRUD | 明細から合計を計算して保存する Myメニュー |
| `custom-menus/search/` | GET | `q` で本人の Myメニューを検索 |
| `custom-menus/{id}/create_meal_from_menu/` | POST | 保存済みの明細と合計を `multiplier` 倍して食事へコピー |
| `meal-timings/` | GET | 食事タイミングの選択肢 |
| `goals/` | GET / PUT | 本人の kcal・PFC 目標。炭水化物のキーは `carbs` |
| `profile/` | GET | 本人のプロフィールと Google 連携状態 |

`/api/meals/` は食事記録の互換エイリアス。新しい呼び出しには `meal-records/` を使う。
食事一覧には MCP の `start_date`・`end_date` と同じ期間フィルタを実装していない。
一覧の応答はページネーション付き共通形式ではないため、独自に `results` を仮定しない。

## 検索・分析・画像入力

| パス（`/api/` からの相対） | 操作 | 入力と結果 |
|---|---|---|
| `foods/search/` | GET | `q` で標準食品を検索し `{foods: [...]}` を返す |
| `foods/suggestions/` | GET | `q` で候補名を取得し `{suggestions: [...]}` を返す |
| `foods/calculate/` | POST | `food_id` と `amount`（g、既定100）から栄養値を換算 |
| `nutrition/daily-summary/` | GET | `date`（省略時は当日）の12栄養素を集計 |
| `cafeteria/list/` | GET | `cafeteria`・`category` で学食を絞り込む |
| `cafeteria/suggestions/` | GET | `date`・`cafeteria` に対し目標の残りに近い最大5件を返す |
| `ocr/nutrition-label/` | POST | multipart の `image`。JPEG/PNG/WebP、10MB以下。確認用の栄養値と検証結果 |
| `health/` | GET | HTTP プロセスの応答確認。DB疎通・OCR・MCPの正常性までは検査しない |

`foods/calculate/` は標準食品の `standard_<id>` または Myアイテムの `custom_<id>` を受ける。
MCP の `item_type`・`item_id` 形式とは異なる。MCP の食品検索には横断検索・正規化・種別指定があり、
Web の `foods/search/` と同じ応答契約ではない。

## 認証の入口

`register/` と `login/` は POST、`logout/` は認証付き POST。
`auth/google/` は POST、`auth/google/link/` は認証付き POST / DELETE。
Google の credential や連携時のエラーは [認証仕様](google-authentication.md)を参照。
OAuth の `/o/`・`/.well-known/` と認可用 `/accounts/` は `/api/` の外に配置する。

## Web と MCP を混同しない

| 処理 | Web API | MCP |
|---|---|---|
| 食事作成 | 合計値と明細の栄養値を送信して保存 | 食品 ID と分量をサーバーで解決して保存 |
| Myアイテム作成 | 100g基準のフィールドを送信 | 署名付き下書き・本人の確認を経て作成 |
| 食事削除 | 認証付き DELETE | 書き込みスコープに加えて `confirmed=true` |
| 再送防止 | 共通の idempotency ヘッダーは実装していない | 食事作成の `idempotency_key` 引数で対応 |

新しいクライアントを実装するときは、既存 PWA の [feature 別 API](../frontend/src/features) と
[API テスト](../backend/record_app/tests)を参照する。MCP 固有の確認や再送防止が
Web API にも自動的に適用されるとは考えない。
