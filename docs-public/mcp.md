# MCPの食品検索・栄養値・食事記録

[ドキュメント一覧](README.md) / [データ設計](data-model.md) / [Web APIとの違い](api.md)

認証とOAuthスコープは [google-authentication.md](google-authentication.md) を参照。
MCPの入出力定義は `backend/mcp_server/server.py` のツール説明と入力モデルが正本となる。

## ツール一覧

| ツール | スコープ | 用途・副作用 |
|---|---|---|
| `search_foods` | `meals:read` | 食品の横断検索。保存しない |
| `get_daily_nutrition` / `get_nutrition_trend` | `meals:read` | 日次・期間の集計。期間の体重データは `weight:read` がある場合のみ |
| `list_meal_records` / `get_meal_record` | `meals:read` | 本人の食事一覧・詳細 |
| `suggest_cafeteria_menus` | `meals:read` | 栄養目標の残りに近い学食の提案 |
| `draft_meal` | `meals:read` | 食品と分量を解決して確認用の下書きを返す |
| `draft_custom_food` | `meals:read` | 出典付きMyアイテムの署名付き下書き。保存しない |
| `create_custom_food` | `meals:write` | 指定した栄養値または署名付き下書きから食品を保存 |
| `create_meal_record` / `update_meal_record` | `meals:write` | 食事の作成・編集。食事作成は再送キーに対応 |
| `delete_meal_record` | `meals:write` | 利用者が指定した本人の食事と明細を削除 |

体重の書き込みツールや汎用SQL実行ツールは公開していない。
登録一覧と副作用注釈は [server.py](../backend/mcp_server/server.py)、
入力スキーマは [tools.py](../backend/mcp_server/tools.py)を参照。

## 栄養値と成分表

`sodium` はナトリウムmg。PFCと食物繊維はg、ビタミンAはµg、その他の微量栄養素はmg、
エネルギーはkcalで返す。学食マスタだけは取得元の食塩相当量gを保存し、MCP・Web APIで
返す際に `食塩相当量 × 1000 / 2.54` で変換する。OCRも食塩相当量の読み取り時に変換する。
換算式の根拠は [消費者庁の説明資料](https://www.caa.go.jp/policies/policy/consumer_safety/food_safety/risk_commu_2015_003/pdf/150721shiryou_3.pdf)。

標準食品の取り込みはCSVの「成分識別子」行から対象列を特定する。
`CHOCDF-`（炭水化物）、`FIB-`（食物繊維）、`NA`、`CA`、`FE`、`VITA_RAE`、
`THIA`、`RIBF`、`VITC` を使い、列順やヘッダーの行数には依存しない。
括弧付き推定値・脚注記号を処理し、微量・欠測表記は従来どおり0にする。
欠測と測定された0は区別できない。識別子の欠落・重複、不正な値・行は全体をロールバックする。

同梱CSVは2,538件。精白米めし・オートミール・低脂肪加工乳・まさば・鶏むね肉の固定値と、
全件の取り込み、列入れ替え、再投入でのID維持を回帰テストで確認する。
鶏むね皮なし生のB2は同梱CSVでは親どり0.10mg、若どり0.11mgであり、食品番号を区別する。
P×4 + F×9 + C×4とエネルギー値が全食品で±20%に収まることや、B2が一律1mg以下であることは
取り込み条件にしない。食品による成分・エネルギー換算方法の差を不正値と誤認するため。

### マスタを再投入する

対象環境への反映が承認された際に、バックアップ後、バックエンドの環境で実行する。

```bash
python manage.py load_standard_foods data/standard_foods.csv
```

食品番号で更新するため既存IDを維持する。新しい先頭食品も追加する。開発Composeでは
バックエンド起動時にも同じコマンドを実行する。**pushだけでは稼働中DBは更新されない。**

既存の食事・Myメニューはスナップショットなので自動再計算しない。過去に保存された値には
旧マスタの列ずれや混在した塩分単位が残る可能性がある。元の入力単位を後から確定できない値を
一括変換せず、利用者が出典を確認して修正する。単位を誤って登録したMyアイテムも同様。

## 食品検索

`search_foods(query, item_types?, cafeteria?)` は最大20件を返す。

| 引数・結果 | 意味 |
|---|---|
| `item_types` | `standard` / `custom` / `cafeteria` の配列。省略時は全種別 |
| `cafeteria` | `rune` / `hokubu` / `chuo`。学食の候補だけを指定食堂に絞る |
| `nutrition_basis` | `per_100g` は100g当たり、`per_serving` は1食当たり |
| `cafeterias` | 同じメニューID・名前・栄養値を持つ学食の提供食堂と、食堂別の `item_id` |
| `suggestions` | 一致が無い場合の参考検索。`exact_match=false` は別食品であることを示す |

全角・半角、ひらがな・カタカナ、区切り記号と代表的な漢字表記を吸収する。
たとえば「鯖」「サバ」「ｻﾊﾞ」は「さば」に一致し、「低脂肪牛乳」は「加工乳 低脂肪」で探す。
標準食品は既存のpg_trgm候補を優先し、正規化した名前で候補を補う。結果は種別ごとに交互に返し、
ひとつのソースが全枠を占めないようにする。Myアイテムは必ず利用者本人のものに限る。

市販商品・調理品を原材料の栄養値で置き換えない。「サラダチキン」が無い場合の
「若どり むね 皮なし」や、「鯖寿司」が無い場合の「しめさば」は参考検索だけである。
未収録の市販商品の栄養値を推測して登録する機能や、JANコードの外部DB連携は含まない。

## 食事の参照・削除

参照・分析・下書きツールには `readOnlyHint=true`、`destructiveHint=false` を付ける。
作成・編集・削除は `readOnlyHint=false`。OAuthの `meals:read` / `meals:write` 検査は従来どおり行う。
これらはクライアントへのヒントであり、クライアント独自の承認要求をサーバーから解除するものではない。

`delete_meal_record(meal_record_id)` は利用者から対象が明確な削除依頼を受けた場合に呼ぶ。
対象が曖昧な場合だけ確認する。任意の `confirmed=false` はキャンセル扱いで、書き込まない。
本人の記録と明細を完全削除する。取り消しはできない。
他人のIDと存在しないIDはどちらも「見つからない」として扱い、存在を漏らさない。

`update_meal_record` は引き続き明細の全置換であり、更新時の食品マスタから全明細の栄養を再計算する。
食品マスタ更新だけでは過去の記録は変わらないが、利用者が記録を更新すれば値は変わり得る。

## Myアイテムの作成と1食分の指定

明確な登録依頼と商品の栄養表示があれば `create_custom_food(food=...)` で直接作成できる。
`draft_custom_food(food)` は事前相談用の任意ツールで、DBへ保存せず署名付き `draft_token` を返す。
`create_custom_food(draft_token=...)` も利用できる。`food` と `draft_token` は一方だけを指定する。
下書きは本人だけが利用でき、30分で失効する。`confirmed` は任意で、false はキャンセル扱い。

| 入力 | 意味 |
|---|---|
| `name` | 100文字以内の名前。同一利用者の同名食品は上書きしない |
| `nutrition_basis` | `per_100g` または `per_serving` |
| `serving_size_g` | 任意の1食分実重量。不明なら省略またはnull。指定時は0より大きく10,000g以下 |
| `nutrition` | 指定した基準当たりの12栄養素。kcal・PFCは必須、微量栄養素は省略時0 |
| `source` | `url`（URL付きの表示）または `manual`（利用者がラベルから手入力）を必ず指定 |
| `source_url` | `source=url` のとき必須。HTTP(S)のみ。`manual` のときは空欄 |

URLの内容はサーバーが取得・検証するものではない。公式表示やラベルで確認できた値を渡す。
AIの推定値を混ぜない。検証済み・未検証のフラグは設けず、出典だけを保持する。
微量栄養素の省略は測定された0と区別できないため、必要な項目は出典で確認する。

`*_per_100g` カラムは100g当たりを保持する。1食28gで117kcalを登録した場合、
内部では `117 × 100 / 28` kcal/100gへ換算する。MCP検索は登録時の基準で栄養値を返し、
Web APIの `*_per_100g` は100g基準、編集画面は選択した基準で入力する。
重量不明の `per_serving` 食品は `nutrition_per_serving` に1食分の値を保持し、
`*_per_100g` をnullにする。Web一覧から追加すると1食分として選択できる。

`draft_meal` / `create_meal_record` / `update_meal_record` の明細には、`amount_grams` または
`servings` の一方を指定する。`servings` は1食分の栄養値または重量を持つMyアイテム専用で、0より大きく100以下。
たとえば28gの食品を `servings=2` とすると56g・234kcalを記録する。換算後も重量上限10,000gを適用し、
保存する `amount_grams` は実重量となる。重量不明の場合は `amount_grams` 入力を拒否し、
記録には `amount_grams=null` と食数を保存する。学食は従来の1食固定、標準食品は重量指定を使う。

例: `create_custom_food(food={"name":"サンドイッチ","nutrition_basis":"per_serving","source":"manual",
"nutrition":{"calories":250,"protein":10,"fat":12,"carbohydrates":26}})` で登録し、
返されたIDを `servings=1.5` で記録すると375kcalとなる。グラム値は推定しない。

## Claudeアプリでの確認負荷

明確な依頼に対する食事・食品の作成は直接実行し、下書きと会話上の再確認を必須にしない。
検索・作成済みの食品IDは再利用し、不要な検索も省く。OAuthの権限検査・所有者の分離・書き込み頻度制限は維持する。

Claude側で選択できる場合、**Customize → Connectors → DishBoard → Tool permissions** から
日常的に使うツールを **Always allow** に設定すると、ツール呼び出しごとの承認を減らせる。
組織の制限が優先される場合や、クライアントが別途確認を求める場合があり、サーバーから強制できない。
読み取り専用の注釈で書き込みを偽装することはしない。
参照: [Claude公式のコネクター設定](https://support.claude.com/en/articles/11176164-use-connectors-to-extend-claude-s-capabilities)、
[MCP公式のツール注釈](https://blog.modelcontextprotocol.io/posts/2026-03-16-tool-annotations/)。

## 食事作成の再送

`create_meal_record` に `idempotency_key`（UUID文字列）を付けることを推奨する。
同じ操作の再送では、同じキー・日付・タイミング・名前・明細を渡す。
利用者単位のDBロックと `(user, key)` の一意制約により、同時実行でも食事を1件だけ作成する。
キー、入力のハッシュ、記録への参照を食事と同じトランザクションで保存し、途中失敗は全体を戻す。

同じキーで入力を変更するとエラー。同じ入力の再送は元の記録の現在の状態を返し、食品マスタを
再参照・再計算しない。元の記録を編集した場合は編集後の値を返す。削除した場合はキーを残して
再作成を拒否する。新しい食事には新しいUUIDを使う。キーは利用者の削除まで期限なく保持する。
キーを省略した呼び出しは従来どおり毎回作成する。成功が不明な場合は一覧で確認する。

## DB変更の反映

`0015_optional_serving_weight` が重量不明の食品・明細と食数に対応し、検証フラグを削除する。
既存食品の栄養値・出典・重量と、既存の食事スナップショットは変更しない。依存ライブラリの追加は不要。
旧アプリは削除されたカラムを参照するため、通常の無停止更新やアプリだけの切り戻しはできない。
停止を含む手順を [運用文書](operations.md#0015の反映重量不明の1食分対応) に記載する。
