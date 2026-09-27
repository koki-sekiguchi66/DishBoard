# frontend（React + TypeScript + Vite）

## ディレクトリ構成

```
src/
  features/<name>/     機能単位。api/ components/ hooks/ types.ts index.ts
  components/ui/       shadcn/ui のプリミティブ。ここに独自コンポーネントを増やさない
  components/layout/   AppShell / Header / Sidebar / Section
  components/inputs/   feature をまたぐ独自入力部品（MeasureField / QuickAmountChips）
  types/               feature をまたぐ共通型（index.ts で再エクスポート）
  lib/                 apiClient（axios）と汎用ユーティリティ
  test/                Vitest のセットアップとヘルパー
```

新機能は `src/features/<name>/` に作る。

**feature 間の参照は `index.ts` 経由に限る。** 内部構造の変更を feature 外へ波及させないため。

```typescript
import { EditCustomFoodModal } from '@/features/customFoods';        // ✅
import X from '@/features/customFoods/components/EditCustomFoodModal'; // ❌
```

**型の置き場所**: 複数 feature から参照するなら `src/types/`、その feature 専用なら
`features/<name>/types.ts`。コンポーネント内でローカル定義しない。

パスエイリアス `@/` `@features/` `@components/` `@lib/` は
`tsconfig.json` と `vite.config.js` の**両方**に定義する（片方だけでは動かない）。

## TypeScript

- `strict: true` / `allowJs: false`。`src/` に `.js` / `.jsx` は無い
- **`@ts-expect-error` と `any` は禁止**。不明な外部データは `unknown` で受けて絞り込む
- **`npx tsc --noEmit` と `npm run lint` を実行する。**
  型の整合性は TypeScript、`.ts` / `.tsx` の未使用値や Hooks 等は ESLint で検査する

## UI

- **Tailwind CSS v4 + shadcn/ui**（Bootstrap は削除済み）
- 独自のボタン・カードを作らず `@/components/ui/*` を使う
- **色を直接書かない。** `index.css` のテーマ変数（`--primary` / `--color-protein` 等）経由で参照する。
  直接書くと `useTheme` のテーマ切替で破綻する
- **見出し・日付・主要な数値は `.font-display`（明朝）。** 本文と入力欄はゴシックのまま。
  `CardTitle` / `DialogTitle` は既に明朝なので、個別に指定しない → ADR #33
- **画面で最も重要な1アクションだけ `<Button variant="brand" size="xl">`。**
  1画面に複数置くと発光が意味を失う → ADR #33
- **`Card` で囲わない。** セクションは `@/components/layout` の `Section`（見出し + 上端の罫線）
  で区切る。記録ページのヒーロー（黒板）は廃止済み → ADR #34・#35
- 罫線は `border-border/40`、囲みが要る場所でも `/40`〜`/70` に留める → ADR #34
- トーストは `sonner`、グラフは `recharts`
- **数値欄は `MeasureField`**（`@/components/inputs`）。`<input type="number">` を直接置かない。
  値は文字列で渡す（空欄と 0 を区別するため）。→ ADR #18

## ロジックの置き場所

コンポーネントは表示に集中させ、状態遷移や計算はカスタムフックへ切り出す（`useMenuBuilder` が例）。
フックは DOM に依存しないため単体テストが書きやすい。

メモ化は再レンダリングのコストが実際にある箇所だけに使う。無条件に全部包まない。

## API 通信

`@/lib/axios` の `apiClient` を使う（`axios` を直接 import しない）。
リクエストインターセプタが `localStorage` のトークンを付与し、
レスポンスインターセプタが 401 でトークンを消してトップへ飛ばす。

## テスト

Vitest + React Testing Library。テストは対象と同じ階層の `__tests__/` に置く。

```bash
npm run test:run        # 一度だけ実行（watch は npm run test）
```

## 既知の落とし穴

**重量不明のMyアイテム・明細のnullを100gや0gで補わない。**
食品は `nutrition_per_serving`、明細は `servings` を使う。再登録・Myメニュー保存でも食数を引き継ぐ。
編集フォームは選択した栄養基準で入力し、`*_per_100g` と1食分の値を混同しない（ADR #42）。

**日付は `@/lib/date` の `getLocalDateString()` を使う。**
`toISOString()` は UTC 変換のため日本時間の深夜に前日へずれる。
食事記録は日付が主キー的な意味を持つので、1日ずれると別の日に入る。

**要素の取得は `getByText` ではなく `getByRole`。**
`getByText('保存')` は複数一致で "Found multiple elements" になる。

**npm パッケージ追加後は anonymous volume を消す。** 残っていると再ビルドしても反映されない。

```bash
docker compose rm -v -f frontend && docker compose up -d --build frontend   # ★ -v 必須
```

**`VITE_` 変数はビルド時に静的置換される。** 起動後に設定しても効かず、値を変えたら再ビルドが要る
（`VITE_API_BASE_URL` / `VITE_GOOGLE_CLIENT_ID`）。増やしたら `.env.production.example` にも追記する。

開発時は Vite の `server.proxy` が `/api` を backend へ転送し、**本番と同じ同一オリジン**で動く。
CORS の挙動差で本番だけ壊れる事態を避けるための構成。

**タブ切替でフォームの入力途中を消してはいけない画面は、Radix `Tabs.Content` で
出し分けない。** 非アクティブなタブの中身はアンマウントされ、ローカル state
（`useState` で持つ入力途中のデータ）が消える。両方を常にマウントしたまま
`className={cn(!active && "hidden")}` で表示だけ切り替える → ADR #35
