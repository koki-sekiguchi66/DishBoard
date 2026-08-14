# backend（Django + DRF）

## 層構造と責務

```
record_app/
  models.py            モデル定義・インデックス・制約
  serializers.py       入出力の変換とバリデーション。ネストした items の作成/更新もここ
  views.py             HTTP の入出力と権限のみ。計算ロジックを書かない
  services.py          複数モデルにまたがる操作。@transaction.atomic で境界を明示
  business_logic/      HTTP を知らない純粋なドメイン処理
    nutrition_calculator.py   食品検索・栄養計算・日次サマリー
    ocr_processor.py          栄養成分表示ラベルの OCR（Azure AI Vision）
    cafeteria_scraping.py     学食サイトのスクレイピング
  management/commands/ 外部スケジューラから叩く入口
```

- `business_logic/` から `request` / `Response` に触らない。引数と戻り値は素の Python 値
- `services.py` は「複数モデルを1トランザクションで操作する」ものだけ。単一モデルの CRUD は ViewSet で足りる
- ViewSet は必ず `get_queryset()` で `filter(user=self.request.user)` する（ユーザー間のデータ分離）

## 栄養データのスナップショット設計 ★壊さないこと

`MealRecordItem` / `CustomMenuItem` は、栄養値を**記録時点の実数値としてそのまま保存**する。
`StandardFood` への FK は張らず、`item_type` + `item_id` + `item_name` で参照元を記録するだけに留める。

食品DBが更新されても、過去の記録の栄養値が変わってはいけないため。
**この設計を「正規化されていない」として直さないこと。**意図的な非正規化である。

## 集計は事前計算する

`CustomMenu` の `total_*` フィールドのように、集計値はカラムに持って書き込み時に更新する。
更新は `calculate_totals()`（`aggregate()` で1クエリ）を呼び、Python のループで足し込まない。
読み取りのたびに集計クエリを走らせる設計にしないこと。

## 食品検索

PostgreSQL の pg_trgm によるトリグラム類似度検索（`TrigramSimilarity`）。
`StandardFood.name` に `GinIndex(opclasses=['gin_trgm_ops'])` が張ってある。
拡張の有効化はマイグレーション `0006_enable_pg_trgm` で行っている。

類似度の閾値（0.08）は意図的に緩い。ここは「足切り」であって「ランキング」ではなく、
精度は後段のキーワード部分一致で担保している。閾値だけを見て厳しくしないこと。

## クエリ

- 明細を伴う取得は `prefetch_related('items')`。一覧で明細が不要なら `annotate(Count('items'))` で件数だけ取る（`MealRecordViewSet.get_queryset()` が例）
- 新しいクエリパターンを追加したら、対応する複合インデックスが必要か検討する

## テスト

pytest + pytest-django。設定は `pytest.ini`（`DJANGO_SETTINGS_MODULE=dishboard_project.settings.development`）。

- **PostgreSQL が必須**。`docker compose up -d db` してから実行する。SQLite では `django.contrib.postgres` と pg_trgm が動かない
- ファイルは `record_app/tests/test_<機能>.py`、共通フィクスチャは `conftest.py`
- `conftest.py` での Django モデル import は安全。**`__init__.py` での import は危険**（pytest-django が settings を初期化する前に評価されうる）
- 外部サービス（Azure Vision / スクレイピング対象サイト）は必ずモックする
- OCR は `NutritionOCRProcessor._extract_lines` を `patch.object` でモックし、テキスト行のリストを返させる（Azure SDK のレスポンス構造に依存させない）

## 管理コマンド

| コマンド | 用途 |
|---|---|
| `load_standard_foods <csv>` | 文科省食品標準成分表 CSV の投入（`update_or_create` で冪等） |
| `update_cafeteria_menus` | 学食メニューのスクレイピング更新。GitHub Actions cron から SSH 経由で実行される |

## 設定

`settings/` は `base.py` を `development.py` / `production.py` が継承。切替は環境変数 `DJANGO_ENV`。
`resolve_db_host()` により、ホスト名 `db` が解決できなければ `localhost` にフォールバックする
（Docker 経由でもホスト直実行でも同じ設定で動かすため）。

## docstring

クラスと主要メソッドに日本語で付ける。「何をするか」に加え、非自明な前提を書く。

```python
class MealRecordItem(models.Model):
    """食事記録の明細行。栄養素は記録時点のスナップショットとして保持する。"""
```
