# DishBoard アーキテクチャ

食事と体重を記録して栄養管理を行う PWA（Progressive Web App: ブラウザからホーム画面にインストールでき、オフラインでも起動するウェブアプリ）。
大学の研究室メンバー10〜20名が日常的に使う実用ツールとして運用している。

このドキュメントは**システムの構成と、なぜその構成にしたか**を説明する。
個々の設計判断の詳細な検討経緯は [docs-public/decisions.md](docs-public/decisions.md) にまとめている。

---

## 1. 何をするアプリか

| 機能 | 概要 |
|---|---|
| 食事記録 | 標準食品・Myアイテム・学食メニューを組み合わせて1食分を登録する |
| 栄養の可視化 | PFC（タンパク質・脂質・炭水化物）と12種の栄養素を日次で集計・グラフ表示 |
| 体重記録 | 1日1件の体重を記録し推移をグラフ化 |
| 食品検索 | 文部科学省の食品標準成分表に対するあいまい検索 |
| OCR 入力 | 栄養成分表示ラベルをカメラで撮影し、数値を自動読み取り |
| 学食メニュー | 学食サイトから週次でメニューと栄養値を自動取得 |
| PWA | ホーム画面へのインストール、オフライン起動、Service Worker の更新通知 |

---

## 2. 技術スタック

| 層 | 採用技術 |
|---|---|
| バックエンド | Python 3.12 / Django 5.2 / Django REST Framework 3.16 |
| データベース | PostgreSQL 16（拡張 `pg_trgm` を使用） |
| フロントエンド | React 19 / TypeScript（`strict: true`）/ Vite 7 |
| UI | Tailwind CSS v4 / shadcn/ui（Radix UI ベース）/ lucide-react / recharts / sonner |
| PWA | vite-plugin-pwa（Workbox） |
| テスト | pytest + pytest-django（バックエンド）/ Vitest + React Testing Library（フロントエンド） |
| 実行環境 | Docker Compose（開発・本番とも）/ nginx |
| 外部サービス | Azure AI Vision（OCR）/ GitHub Actions（週次スクレイピング） |

**認証**は DRF のトークン認証。ステートレスなフロントエンドとの相性を優先し、
発行されたトークンを `localStorage` に保存して `Authorization: Token ...` ヘッダーで送る。

---

## 3. システム構成

```
                      ┌─────────────────────────────┐
   ブラウザ / PWA ───▶ │ nginx                       │
                      │  /       → SPA の静的ファイル │
                      │  /api/   → Django へプロキシ  │
                      └───────────┬─────────────────┘
                                  │
                      ┌───────────▼─────────────────┐
                      │ Django + DRF (gunicorn)     │
                      │  views → services →         │
                      │          business_logic     │
                      └───────┬──────────────┬──────┘
                              │              │
                   ┌──────────▼──────┐   ┌───▼─────────────────┐
                   │ PostgreSQL 16   │   │ Azure AI Vision     │
                   │ (+ pg_trgm)     │   │ (Read API / OCR)    │
                   └─────────────────┘   └─────────────────────┘
                              ▲
                   ┌──────────┴──────────────────────┐
                   │ GitHub Actions (週次 cron)       │
                   │  SSH → manage.py                │
                   │        update_cafeteria_menus   │
                   └─────────────────────────────────┘
```

**フロントとバックエンドを同一オリジンで配信している**のが構成上の要点である。
nginx が `/` で SPA を、`/api/` で Django をプロキシするため、ブラウザから見れば単一のオリジンになる。
開発環境でも Vite の `server.proxy` が `/api` を Django コンテナへ転送し、同じ条件を再現している
（→ [decisions.md #10](docs-public/decisions.md)）。

非同期ワーカー（Celery 等）は使っていない。定期実行が必要な処理は Django の管理コマンドとして実装し、
外部スケジューラ（GitHub Actions）から呼び出す（→ [decisions.md #9](docs-public/decisions.md)）。

---

## 4. ディレクトリ構成

```
├── ARCHITECTURE.md            このファイル
├── docs-public/               設計判断の詳細（ADR）
├── CLAUDE.md                  AI 支援開発（Claude Code）向けのプロジェクト規約
├── .claude/                   同上（Skills / Hooks）
│
├── backend/
│   ├── dishboard_project/
│   │   └── settings/          base.py を development.py / production.py が継承
│   ├── record_app/
│   │   ├── models.py          モデル定義・インデックス・制約
│   │   ├── serializers.py     入出力の変換とバリデーション
│   │   ├── views.py           HTTP の入出力と権限のみ
│   │   ├── services.py        複数モデルにまたがる操作（トランザクション境界）
│   │   ├── business_logic/    HTTP を知らない純粋なドメイン処理
│   │   │   ├── nutrition_calculator.py   食品検索・栄養計算・日次集計
│   │   │   ├── ocr_processor.py          栄養成分表示の OCR パイプライン
│   │   │   └── cafeteria_scraping.py     学食サイトのスクレイピング
│   │   ├── management/commands/          外部スケジューラから叩く入口
│   │   └── tests/                        pytest（機能別ファイル + conftest.py）
│   └── data/standard_foods.csv           食品標準成分表
│
├── frontend/
│   └── src/
│       ├── features/<name>/   機能単位（api / components / hooks / types.ts / index.ts）
│       ├── components/ui/     shadcn/ui のプリミティブ
│       ├── components/layout/ AppShell / Header / Sidebar
│       ├── components/inputs/ feature をまたぐ入力部品（MeasureField ほか）
│       ├── types/             feature をまたぐ共通型
│       ├── lib/axios.ts       認証トークンを付与する axios インスタンス
│       └── test/              Vitest のセットアップとモックファクトリ
│
├── nginx/conf.d/              本番の同一オリジン配信設定
├── docker-compose.yml         開発用（db / backend / frontend）
├── docker-compose.production.yml  本番用（db / backend / nginx）
└── .github/workflows/         週次スクレイピング
```

### バックエンドの層構造

```
views.py          HTTP 入出力・認証・権限のみ。計算ロジックを書かない
   ↓
services.py       複数モデルにまたがる操作。@transaction.atomic で境界を明示
   ↓
business_logic/   HTTP を知らない純粋なドメイン処理。引数と戻り値は素の Python 値
   ↓
models.py         永続化とデータ整合性（インデックス・制約）
```

この分離により、OCR・スクレイピング・栄養計算といったドメイン処理を
HTTP リクエストなしで単体テストできる（→ [decisions.md #6](docs-public/decisions.md)）。

### フロントエンドの構成

技術レイヤー（components / hooks / api）ではなく**機能（feature）で縦に切っている**。
1つの機能に関わるファイルが1ディレクトリにまとまるため、変更の影響範囲が読みやすい。

feature 間の参照は各 feature の `index.ts`（バレルエクスポート）経由に限定している。
内部構造を変えても feature 外へ影響が波及しないようにするため
（→ [decisions.md #11](docs-public/decisions.md)）。

---

## 5. データモデル

```
User (Django 標準)
 ├─ MealRecord ──────< MealRecordItem      食事記録と、その明細
 ├─ WeightRecord                            体重記録（1ユーザー1日1件）
 ├─ CustomFood                              ユーザー独自の食品（Myアイテム）
 └─ CustomMenu ──────< CustomMenuItem      再利用可能なメニューテンプレート

StandardFood      文科省 食品標準成分表（全ユーザー共通・読み取り専用）
CafeteriaMenu     学食メニュー（スクレイピングで週次更新）
```

### 設計上の要点

**1. 栄養値は「記録時点のスナップショット」として保存する**

`MealRecordItem` と `CustomMenuItem` は、参照元の食品への外部キーを張らず、
栄養値そのものを実数値としてコピー保存する。参照元は
`item_type`（standard / custom / cafeteria）+ `item_id` + `item_name` で記録するに留める。

食品データベースが更新されたり、Myアイテムが編集・削除されたりしても、
**過去の記録の栄養値が変わってはいけない**ため。健康記録は「その時点で何を食べたか」の
履歴であり、後から書き換わると記録としての意味を失う。
意図的な非正規化であり、正規化されていないことを理由に直してはいけない
（→ [decisions.md #1](docs-public/decisions.md)）。

**2. 集計値は書き込み時に計算してカラムに持つ**

`CustomMenu` は明細の合計を `total_calories` などのカラムに保持し、
`calculate_totals()`（`aggregate()` で1クエリ）で更新する。
読み取りのたびに集計クエリを走らせない（→ [decisions.md #2](docs-public/decisions.md)）。

**3. ユーザー間のデータ分離は ViewSet の `get_queryset()` で担保する**

すべての ViewSet が `filter(user=self.request.user)` を通してからクエリを組み立てる。
テストでも「他ユーザーのデータが見えない/触れない」ことを常に検証している。

**4. インデックスはクエリパターンに対応させる**

`(user, record_date)` のような複合インデックスを、実際の絞り込み条件に合わせて定義している。
食品名の検索には `pg_trgm` の GIN インデックスを使う（→ [decisions.md #3](docs-public/decisions.md)）。

**5. 体重は1ユーザー1日1件**

`UniqueConstraint(fields=['user', 'record_date'])` をデータベース側の制約として持ち、
登録は `update_or_create()` で「同じ日に再登録したら上書き」として扱う。
同じ日に複数の体重が並ぶと推移グラフの意味が壊れるため。

---

## 6. 主要な処理フロー

### 6-1. 食事を記録する

```
ユーザーが食品を検索・選択し分量を入力
   → useMenuBuilder（フック）が明細を組み立て、合計栄養素をその場で計算
   → POST /api/meal-records/  （明細をネストして1リクエストで送る）
   → MealRecordSerializer.create() が @transaction.atomic の中で
      MealRecord を作成し、明細を bulk_create でまとめて挿入
```

明細の更新は「全削除 → 作り直し」で行う。差分更新に比べて実装が単純で、
1食あたりの明細数が高々数件のため性能上の問題にならない。

### 6-2. 栄養成分表示を OCR で読み取る

```
カメラ撮影 → 読み取り範囲をトリミングし 1200x900px 以上に拡大
   → POST /api/ocr/nutrition-label/（画像は一時ファイルに保存）
   → Azure AI Vision Read API がテキスト行を位置情報つきで返す
   → 行を「上→下・左→右」に並べ直す
   → 正規表現で栄養素を抽出し、OCR の誤認識を補正
   → Atwater 係数（P×4 + F×9 + C×4）でカロリーの整合性を検証し警告を返す
   → 一時ファイルは finally で必ず削除
```

OCR の結果は**確定値ではなく入力の下書き**として扱い、ユーザーが確認・修正してから保存する
（→ [decisions.md #4](docs-public/decisions.md)）。

### 6-3. 学食メニューを週次で更新する

```
GitHub Actions（cron）→ SSH → python manage.py update_cafeteria_menus
   → CafeteriaScraper が学食サイトをカテゴリ別に巡回
      （リクエスト間に待機を入れ、相手サーバーに負荷をかけない）
   → 既存の CafeteriaMenu を全削除し bulk_create で入れ替え
   → 失敗時は非ゼロ終了し、GitHub Actions 側で失敗として検知される
```

---

## 7. フロントエンドの設計

### 状態管理

グローバルな状態管理ライブラリ（Redux / Zustand など）と React Router は導入していない。

- **ページ切り替え**: `AppShell` の `useState` による出し分け。記録特化アプリであり、
  URL の永続化やブラウザ履歴が要件になっていない（→ [decisions.md #12](docs-public/decisions.md)）
- **サーバーデータ**: 各 feature のカスタムフック（`useDashboardData` など）が
  取得・保持・更新を担う
- **設定値**: `useGoalSettings` / `useTheme` が `localStorage` に永続化する。
  Context は使わず props で伝搬している（→ [decisions.md #13](docs-public/decisions.md)）

### ロジックの置き場所

状態遷移や計算はカスタムフックへ切り出し、コンポーネントは表示に集中させている。
フックは DOM に依存しないため、`renderHook` で単体テストできる
（`useMenuBuilder` / `useGoalSettings` / `useTheme` が該当）。

### テーマ

`index.css` の `:root` にダークテーマの CSS 変数を定義し、`:root.light` で上書きする方式。
テーマの選択は `localStorage` に保存し、**`index.html` のインラインスクリプトが
React のマウント前にクラスを付与する**ことで、初回描画時のちらつきを防いでいる。

---

## 8. 品質の担保

| 対象 | 手段 |
|---|---|
| バックエンド | pytest 175 テスト。API ごとに「未認証で 401」「他ユーザーのデータが見えない」を必ず検証 |
| フロントエンド | Vitest + React Testing Library。テストは対象と同階層の `__tests__/` に配置 |
| 型 | TypeScript `strict: true` / `allowJs: false`。`any` と `@ts-expect-error` を使わない |
| 外部依存 | Azure Vision とスクレイピング対象サイトはテスト内で必ずモックし、ネットワークに依存させない |

OCR のテストは Azure SDK ではなく `NutritionOCRProcessor._extract_lines` をモックする。
SDK のレスポンス構造を組み立てる必要がなく、テストが SDK の内部構造に依存しない
（→ [decisions.md #5](docs-public/decisions.md)）。

バックエンドのテストは PostgreSQL が必須である。`django.contrib.postgres` と `pg_trgm` を
使っているため SQLite では代替できない。

---

## 9. 運用上の制約

本番は GCP Compute Engine の `e2-micro`（Always Free 枠 / メモリ 1GB）1台の上で
Docker Compose を動かしている（構築手順は `.claude/skills/deploy/SKILL.md`）。
この制約が設計に影響している。

- 常駐プロセスを増やさない（Celery ワーカーやメッセージブローカーを置かない）
- 重い処理は外部サービス（Azure AI Vision）と外部スケジューラ（GitHub Actions）に逃がす
- 静的ファイルは CDN を使わず nginx から直接配信する

「一般的なベストプラクティス」よりも、**このアプリの実際の利用規模（10〜20名）と
実行環境に照らして意味があるか**を優先している。
