---
name: add-frontend-feature
description: DishBoard のフロントエンドに新機能を追加する手順。src/features/ 配下のディレクトリ構成、API クライアントの書き方、カスタムフックの切り出し基準、型の置き場所、テストの配置。「画面を追加して」「〜機能をフロントに作って」「新しい feature を作って」といった依頼のときに使う。
---

# フロントエンド機能の追加

## 0. 先に確認すること

- バックエンドに必要なエンドポイントがあるか（`backend/record_app/urls.py`）。無ければ `add-api-endpoint` Skill が先
- 既存の feature を1つ読む。`src/features/meals/` が最も構成が揃っている

## 1. ディレクトリを作る

```
src/features/<name>/
  api/<name>Api.ts          apiClient を叩く関数群
  api/__tests__/<name>Api.test.ts
  components/*.tsx
  components/index.ts       default export を名前付きで再エクスポート
  components/__tests__/*.test.tsx
  hooks/use<Xxx>.ts         状態遷移・計算
  hooks/__tests__/use<Xxx>.test.ts
  types.ts                  この feature 内でしか使わない型（無ければ作らない）
  index.ts                  バレルエクスポート
```

`index.ts` は `export * from './components';` と `export * from './api/<name>Api';` を並べるだけ。

**feature 外からは `index.ts` 経由でしか import させない。**

## 2. 型をどこに置くか

| 型 | 置き場所 |
|---|---|
| API のレスポンス/リクエスト、複数 feature で使う | `src/types/<domain>.ts` に定義し `src/types/index.ts` から再エクスポート |
| その feature の中だけで完結する UI 状態 | `src/features/<name>/types.ts` |
| コンポーネントの props | そのコンポーネントファイル内 |

**コンポーネント内で API の型をローカル定義しない。** import は `import type { X } from "@/types";`。

## 3. API クライアント

```typescript
import { apiClient } from "@/lib/axios";
import type { Xxx, CreateXxxRequest } from "@/types";

export const xxxApi = {
  getXxxs: async (): Promise<Xxx[]> => {
    const response = await apiClient.get("/xxx/");
    return response.data;
  },
  createXxx: async (data: CreateXxxRequest): Promise<Xxx> => {
    const response = await apiClient.post("/xxx/", data);
    return response.data;
  },
};

export default xxxApi;
```

- `axios` を直接 import しない。必ず `@/lib/axios` の `apiClient`
- 戻り値の型を必ず書く。`any` は禁止、不明なら `unknown`
- URL は末尾スラッシュ付き（DRF の router に合わせる）

## 4. カスタムフックに切り出す基準

以下のどれかに当てはまるならフックへ出す。単純な表示だけならコンポーネントに置いてよい。

- 複数の `useState` が連動して1つの状態機械になっている
- API 呼び出し + ローディング + エラー処理を抱えている
- 同じロジックを2つ以上のコンポーネントが使う

`useMenuBuilder` が手本。返り値の型（`interface XxxReturn`）を明示的に定義してから実装する。

## 5. コンポーネント

- `@/components/ui/*`（shadcn/ui）のプリミティブを使う。独自ボタン・カードを作らない
- 色はテーマ変数経由。`index.css` に無い色が必要なら変数を足す
- トーストは `import { toast } from "sonner";`
- **日付整形に `toISOString()` を使わない**（UTC ズレ）。`getFullYear()` / `getMonth()` / `getDate()` で組む
- 再レンダリングのコストが実際にある箇所だけ `useMemo` / `useCallback`

## 6. テスト（先に書く）

対象と同じ階層の `__tests__/` に置く。

API のテストは `@/lib/axios` を丸ごとモックする:

```typescript
vi.mock("@/lib/axios", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
```

モックデータは `@/test/helpers` のファクトリ（`createMockMeal` 等）を使う。無ければ足す。

コンポーネントのテストでは **`getByText` ではなく `getByRole`** で要素を取る。

## 7. 確認

```bash
cd frontend
npx tsc --noEmit        # ★ 実質的な品質ゲート
npm run test:run
```

npm パッケージを追加した場合は `docker compose rm -v -f frontend && docker compose up -d --build frontend`
（`-v` を忘れると anonymous volume が残って反映されない）。
