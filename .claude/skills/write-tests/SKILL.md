---
name: write-tests
description: DishBoard でテストを書くときの進め方。TDD（RED-GREEN-REFACTOR）、既存の未テストコードに対する characterization test、モックの方針、バックエンド（pytest + pytest-django）とフロントエンド（Vitest + Testing Library）の規約。「テストを書いて」「テストが落ちる」「カバレッジを上げたい」といった依頼のときに使う。
---

# テストを書く

## 基本方針

**新機能は TDD で進める。**

1. **RED** — 期待する振る舞いのテストを先に書き、落ちることを確認する
2. **GREEN** — 最小の実装で通す
3. **REFACTOR** — テストが通ったまま整える

**既存コードに手を入れるときは characterization test を先に書く。**
現在の挙動をそのまま記述するテストを追加し、それが通る状態にしてから変更に入る。
「今どう動いているか」が固定されていないと、変更が壊したのか元から壊れていたのかが分からなくなる。

**テストを通すためだけにテストを緩めない。**
落ちたテストは、原因が「仕様変更に伴う期待値の変化」なのか「実装のバグ」なのかを切り分ける。
前者ならテストを、後者なら実装を直す。**判断がつかないときは緩めずに相談する。**

## バックエンド（pytest + pytest-django）

```bash
docker compose up -d db                              # ★ PostgreSQL 必須
cd backend && venv/Scripts/python.exe -m pytest -q   # Windows
# python -m pytest -q                                 # Linux/macOS
python -m pytest record_app/tests/test_ocr.py -q     # ファイル単位
```

SQLite では動かない（`django.contrib.postgres` と pg_trgm を使っているため）。
DB が起動していないと全テストが ERROR になる。

**配置**: `record_app/tests/test_<機能>.py`。共通フィクスチャは `conftest.py`。

**`conftest.py` での Django モデル import は安全**だが、**`__init__.py` での import は危険**
（pytest-django が settings を初期化する前に評価されうる）。

**既存フィクスチャを使う**（`conftest.py`）:
`user` / `other_user` / `token` / `authenticated_client` / `other_authenticated_client` /
`unauthenticated_client` / `standard_foods` / `custom_food` / `meal_record` /
`meal_record_with_items` / `weight_records` / `cafeteria_menus` / `custom_menu_with_items` / `other_custom_menu`

**API テストで必ず書くこと**:

- 未認証で 401
- **他ユーザーのデータが見えない/触れない**（`other_authenticated_client` を使う）
- 正常系のレスポンス構造
- バリデーションエラー（400）

**外部サービスは必ずモックする。** テストがネットワークに依存してはいけない。

OCR は SDK ではなく `_extract_lines` をモックする（Azure のレスポンス構造に依存させないため）:

```python
@patch.object(NutritionOCRProcessor, '_extract_lines')
def test_full_ocr_pipeline(self, mock_extract_lines):
    mock_extract_lines.return_value = [
        'エネルギー 350kcal', 'たんぱく質 20g', '脂質 12g', '炭水化物 40g',
    ]
    result = NutritionOCRProcessor().process_nutrition_label('/tmp/test_label.jpg')
    assert result['success']
```

スクレイピングも同様に、HTTP 取得部分をモックしてパース処理だけを検証する。

## フロントエンド（Vitest + React Testing Library）

```bash
cd frontend
npm run test:run          # 一度だけ
npm run test              # watch
npm run test:coverage     # カバレッジ
```

**配置**: 対象と同じ階層の `__tests__/`（`features/meals/api/__tests__/mealApi.test.ts`）。

**API クライアントのテスト**: `@/lib/axios` を丸ごとモックする。

```typescript
vi.mock("@/lib/axios", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
beforeEach(() => { vi.clearAllMocks(); });
```

**モックデータ**は `@/test/helpers` のファクトリ（`createMockMeal` 等）を使う。無ければ足す。
`src/test/setup.ts` が localStorage / matchMedia / ResizeObserver / IntersectionObserver を用意済み。

**要素の取得は `getByRole` を優先する。**

```typescript
screen.getByRole('button', { name: '保存' });   // ✅
screen.getByText('保存');                        // ❌ 複数一致で落ちる
```

**フックのテスト**は `renderHook` で。DOM に依存しないようフックを設計しておくとここが楽になる。

## テスト名

日本語で「何が起きるか」を書く。

```python
def test_他ユーザーの食事記録は取得できない(self, other_authenticated_client, meal_record):
```

```typescript
it("パラメータなしで食事記録一覧を取得", async () => {
```
