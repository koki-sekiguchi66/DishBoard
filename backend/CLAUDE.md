# backend（Django + DRF）

## 層構造と責務

```
record_app/
  models.py            モデル定義・インデックス・制約
  serializers.py       入出力の変換とバリデーション。ネストした items の作成/更新もここ
  views.py             HTTP の入出力と権限のみ。計算ロジックを書かない
  auth_views.py        セッション認証まわり（OAuth 認可画面用の Google ログイン）
  google_auth.py       Google ID トークンの検証とユーザー解決
  services.py          複数モデルにまたがる操作。@transaction.atomic で境界を明示
  business_logic/      HTTP を知らない純粋なドメイン処理
    nutrition_calculator.py   食品検索・栄養計算・日次サマリー
    food_search.py            MCP向けの食品名正規化と参考検索
    custom_food.py            Myアイテムの出典検証と1食分・100g換算
    nutrition_units.py        食塩相当量gからナトリウムmgへの変換
    ocr_processor.py          栄養成分表示ラベルの OCR（Azure AI Vision）
    cafeteria_scraping.py     学食サイトのスクレイピング（3食堂。ADR #31）
    cafeteria_advisor.py      残りの目標に合う学食メニューの提案（ADR #30）
  management/commands/ 外部スケジューラから叩く入口
```

- `business_logic/` から `request` / `Response` に触らない。引数と戻り値は素の Python 値
- `services.py` は「複数モデルを1トランザクションで操作する」ものだけ。単一モデルの CRUD は ViewSet で足りる
- **ViewSet は必ず `get_queryset()` で `filter(user=self.request.user)`**（ユーザー間のデータ分離）
- **`food_id` のように呼び出し元から渡る ID は、必ず user で絞ってから引く。**
  過去にこれを怠り、他ユーザーの Myアイテムの栄養値が引ける不具合を出している

## MCP 層（`mcp_server/`）

Claude からの3番目の入口。Django アプリではない（モデルを持たない）。

```
mcp_server/
  constants.py     上限値・スコープ名。マジックナンバーはすべてここ
  auth.py          アクセストークンの検証（DOT の AccessToken を直接参照）
  context.py       トークン → Django ユーザーの解決とスコープ検査
  validators.py    入力の検証
  formatters.py    モデル → ツール返り値の変換
  tools.py         ツール本体（参照・下書き・作成・編集・削除）
  server.py        FastMCP の組み立てとツール登録
  asgi.py          uvicorn のエントリポイント
```

- **MCP 層にドメインロジックを書かない。** 計算・検索・集計は `business_logic/` へ
- ツールは必ず `context.resolve_user()` でユーザーを解決し、以降のクエリをそのユーザーで絞る。
  **迂回すると他ユーザーのデータが見える**
- 他ユーザーのリソースを指定されたら `NotFoundError`（404 相当）。403 だと存在が漏れる
- ツールは FastMCP のデコレータを付けず素の関数にし、`server.py` の `add_tool()` で登録する
  （テストからトランスポートを起動せず直接呼べるようにするため）
- `django_setup.py` を import 時に呼ばない。呼ぶのは `asgi.py` だけ
- ツールの description は **Claude が読む唯一の仕様書**。単位・副作用の有無・日付形式を必ず書く
- 既存の `/api/` 向けメソッドを MCP のために書き換えない。必要なら別メソッドを足す

MyアイテムのMCP作成は署名付き下書きと本人確認を経由する。保存栄養値は常に100g基準を維持し、
`servings` は実重量に換算して明細へ保存する。食事作成の再送キーは `MealCreationRequest` に保持し、
記録削除後も消さない。処理は `MealService.create_idempotently()` のトランザクション境界を使う。

## 認証

3系統が並存する。**混同しないこと**（→ `docs-public/google-authentication.md`）。

| 経路 | 認証方式 |
|---|---|
| React PWA → `/api/` | DRF Token |
| OAuth 認可画面（django-oauth-toolkit） | Django セッション |
| Claude → `/mcp` | DOT が発行した OAuth access token |

- Google の identity は**メールではなく `subject`** で識別する。メール一致で自動連携しない（ADR #27）
- credential / token / 健康情報（体重・食事内容・OCR 結果）を**ログへ出さない**

## 壊してはいけない設計

**栄養データのスナップショット** — `MealRecordItem` / `CustomMenuItem` は栄養値を記録時点の
実数値で保存する。`StandardFood` への FK を張らず `item_type` + `item_id` + `item_name` で
参照元だけ残す。食品DBが更新されても過去の記録が変わってはいけないため。
**「正規化されていない」として直さないこと。意図的な非正規化である。**

**集計の事前計算** — `CustomMenu.total_*` のように集計値はカラムに持ち、書き込み時に
`calculate_totals()`（`aggregate()` で1クエリ）で更新する。Python のループで足し込まない。
読み取りのたびに集計する設計にしない。

**食品検索の閾値** — pg_trgm のトリグラム類似度（`TrigramSimilarity`）。閾値 0.08 は
意図的に緩い。ここは「足切り」であって「ランキング」ではなく、精度は後段のキーワード
部分一致で担保している。**閾値だけを見て厳しくしない。**
拡張の有効化はマイグレーション `0006_enable_pg_trgm`。

## クエリ

- 明細を伴う取得は `prefetch_related('items')`。一覧で明細が不要なら
  `annotate(Count('items'))` で件数だけ取る（`MealRecordViewSet.get_queryset()` が例）
- 新しいクエリパターンを足したら、複合インデックスが必要か検討する

## テスト

pytest + pytest-django（`pytest.ini` で `DJANGO_SETTINGS_MODULE=...settings.development`）。

- **PostgreSQL が必須**（`docker compose up -d db`）。SQLite では pg_trgm が動かない
- ファイルは `record_app/tests/test_<機能>.py`、共通フィクスチャは `conftest.py`
- `conftest.py` での Django モデル import は安全。**`__init__.py` での import は危険**
  （pytest-django が settings を初期化する前に評価されうる）
- 外部サービス（Azure Vision / Google tokeninfo / スクレイピング先）は**必ずモックする**
- OCR は `NutritionOCRProcessor._extract_lines` を `patch.object` でモックする
  （Azure SDK のレスポンス構造に依存させないため）

## 管理コマンド

| コマンド | 用途 |
|---|---|
| `load_standard_foods <csv>` | 食品標準成分表 CSV の投入（`update_or_create` で冪等） |
| `update_cafeteria_menus` | 学食メニューの更新。GitHub Actions cron から SSH 経由で実行 |

成分表はCSVの成分識別子で列を解決する。固定の列番号・スキップ行数へ戻さない。
学食マスタの `sodium` は食塩相当量g、MCP・Web APIが返す `sodium` はナトリウムmg。
変換は `nutrition_units.py` を使い、過去のスナップショットを自動で書き換えない。
検索・削除・再投入の仕様は `docs-public/mcp.md` を参照。

## 設定

`settings/` は `base.py` を `development.py` / `production.py` / `mcp.py` が継承（`DJANGO_ENV` で切替）。
`resolve_db_host()` はホスト名 `db` が解決できなければ `localhost` にフォールバックする
（Docker 経由でもホスト直実行でも同じ設定で動かすため）。

## docstring とコメント

クラスと主要メソッドに日本語の docstring を付ける。**1行を基本**とし、
非自明な前提があるときだけ数行に伸ばす。

```python
class MealRecordItem(models.Model):
    """食事記録の明細行。栄養素は記録時点のスナップショットとして保持する。"""
```

行コメントは1〜2行に留める。背景・代替案・トレードオフはコードに書かず、
ADR に書いて `（ADR #1）` と参照する。
