# frontend（React + TypeScript + Vite）

## ディレクトリ構成

```
src/
  features/<name>/     機能単位。api/ components/ hooks/ types.ts index.ts
  components/ui/       shadcn/ui のプリミティブ。ここに独自コンポーネントを増やさない
  components/layout/   AppShell / Header / Sidebar
  types/               feature をまたぐ共通型（index.ts で再エクスポート）
  lib/                 axios インスタンス（apiClient）と汎用ユーティリティ
  test/                Vitest のセットアップとヘルパー
```

新機能は `src/features/<name>/` に作り、上記の構成に揃える。

**feature 間の参照は `index.ts`（バレルエクスポート）経由に限る。**

```typescript
import { EditCustomFoodModal } from '@/features/customFoods';        // ✅
import X from '@/features/customFoods/components/EditCustomFoodModal'; // ❌
```

内部構造を変えたときに feature 外へ影響を波及させないため。

**型の置き場所**: 複数 feature から参照される型は `src/types/` に集約する（`src/types/index.ts` から再エクスポート）。
その feature の中でしか使わない型だけ `features/<name>/types.ts` に置く。コンポーネント内でローカル定義しない。

パスエイリアス: `@/` `@features/` `@components/` `@lib/`（`tsconfig.json` と `vite.config.js` の両方に定義。片方だけ足しても動かない）。

## TypeScript

- `strict: true` / `allowJs: false`。`src/` 配下に `.js` / `.jsx` は存在しない
- **`@ts-expect-error` と `any` は使用禁止**。型が不明な外部データは `unknown` で受けて絞り込む
- 型チェックが実質的な品質ゲート: `npx tsc --noEmit`
  （`npm run lint` の ESLint 設定は `**/*.{js,jsx}` のみを対象にしているため、`.ts` / `.tsx` はチェックされない）

## UI

- **Tailwind CSS v4 + shadcn/ui**。Bootstrap / react-bootstrap は削除済みで使わない
- 独自のボタン・カードを作らず `@/components/ui/*` のプリミティブを使う
- **色を直接書かない**。`index.css` の `:root`（dark）と `:root.light` に定義したテーマ変数（`--primary` / `--muted-foreground` / `--color-protein` 等）経由で参照する。直接書くと `useTheme` のテーマ切替で破綻する
- **トーストは `sonner`**。`react-hot-toast` は削除済み
- グラフは `recharts`

## ロジックの置き場所

コンポーネントは表示に集中させ、状態遷移や計算はカスタムフックへ切り出す（`useMenuBuilder` が例）。
フックは DOM に依存しないため単体テストが書きやすい。

メモ化（`useMemo` / `useCallback`）は再レンダリングのコストが実際にある箇所に使う。無条件に全部包まない。

## API 通信

`@/lib/axios` の `apiClient` を使う。`axios` を直接 import しない。
リクエストインターセプタが `localStorage` のトークンを `Authorization: Token ...` として付与し、
レスポンスインターセプタが 401 でトークンを消してトップへ飛ばす。

## テスト

Vitest + React Testing Library。テストは対象と同じ階層の `__tests__/` にコロケーション配置する
（`features/meals/api/__tests__/mealApi.test.ts` のように）。

```bash
npm run test:run        # 一度だけ実行
npm run test            # watch
npm run test:coverage   # カバレッジ
```

## 既知の落とし穴

**日付整形に `toISOString()` を使わない。** UTC に変換されるため、日本時間の深夜だと前日になる。
食事記録は日付が主キー的な意味を持つため1日ずれると別の日に入る。

```typescript
const y = date.getFullYear();
const m = String(date.getMonth() + 1).padStart(2, '0');
const d = String(date.getDate()).padStart(2, '0');
const dateStr = `${y}-${m}-${d}`;
```

**複数箇所に現れる要素は `getByText` ではなく `getByRole` で取得する。**
`screen.getByRole('button', { name: '保存' })`（`getByText('保存')` は "Found multiple elements" で落ちる）。

**npm パッケージを追加したら anonymous volume を消す。** `/app/node_modules` の volume が残っていると
再ビルドしても反映されない。

```bash
docker compose rm -v -f frontend    # ★ -v を忘れない
docker compose up -d --build frontend
```

**Vite の環境変数はビルド時に静的置換される。** コンテナ起動後に設定しても効かない。値を変えたら再ビルド。
変数名は `src/lib/axios.ts` が読む `VITE_API_BASE_URL` に揃える。

開発時は Vite の `server.proxy` が `/api` を `http://backend:8000` へ転送するため、
**本番と同じ同一オリジン**で動作する。CORS の挙動差で本番だけ壊れる事態を避けるための構成。
