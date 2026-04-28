# Phase 3 実装レポート: フォーム系 + API層の Tailwind化 & TypeScript化

## 概要

Phase 3 は DishBoard UI モダン化プロジェクトにおける最大のフェーズ。
食事記録の入力フロー全体を Bootstrap + JavaScript から Tailwind + shadcn/ui + TypeScript に移行した。

## 変更ファイル一覧

### 新規作成 (12ファイル)

| ファイル | 役割 |
|---|---|
| `components/ui/dialog.tsx` | shadcn/ui Dialog（EditMealModal用） |
| `components/ui/input.tsx` | shadcn/ui Input |
| `components/ui/label.tsx` | shadcn/ui Label |
| `components/ui/textarea.tsx` | shadcn/ui Textarea |
| `components/ui/alert.tsx` | shadcn/ui Alert（エラー/成功メッセージ） |
| `components/ui/separator.tsx` | shadcn/ui Separator |
| `types/nutrition.ts` | BaseNutrition, FullNutrition, MealTiming, EMPTY_NUTRITION |
| `types/meal.ts` | MealRecord, MenuBuilderItem, DailySummary |
| `types/weight.ts` | WeightRecord, CreateWeightRequest |
| `types/food.ts` | StandardFood, CustomFood, CafeteriaMenu, FoodSelectionItem |
| `types/api.ts` | ApiErrorResponse, ApiError |
| `types/index.ts` | バレルエクスポート |

### JSX→TSX 移行 (11ファイル)

| 旧ファイル | 新ファイル |
|---|---|
| `MealForm.jsx` | `MealForm.tsx` |
| `MenuBuilderPanel.jsx` | `MenuBuilderPanel.tsx` |
| `MenuPreviewPanel.jsx` | `MenuPreviewPanel.tsx` |
| `ManualInputForm.jsx` | `ManualInputForm.tsx` |
| `FoodSearchInput.jsx` | `FoodSearchInput.tsx` |
| `CafeteriaSelector.jsx` | `CafeteriaSelector.tsx` |
| `NutritionSummary.jsx` | `NutritionSummary.tsx` |
| `CurrentMenuDisplay.jsx` | `CurrentMenuDisplay.tsx` |
| `EditMealModal.jsx` | `EditMealModal.tsx` |
| `WeightForm.jsx` | `WeightForm.tsx` |
| `Dashboard.jsx` | `Dashboard.tsx` |

### JS→TS 移行 (6ファイル)

| 旧ファイル | 新ファイル |
|---|---|
| `mealApi.js` | `mealApi.ts` |
| `weightApi.js` | `weightApi.ts` |
| `customFoodApi.js` | `customFoodApi.ts` |
| `customMenuApi.js` | `customMenuApi.ts` |
| `useMenuBuilder.js` | `useMenuBuilder.ts` |
| `useDashboardData.js` | `useDashboardData.ts` |

### テスト更新 (4ファイル)

| 旧ファイル | 新ファイル |
|---|---|
| `WeightForm.test.jsx` | `WeightForm.test.tsx` |
| `mealApi.test.js` | `mealApi.test.ts` |
| `weightApi.test.js` | `weightApi.test.ts` |
| `useMenuBuilder.test.js` | `useMenuBuilder.test.ts` |

### 削除 (2ファイル)

| ファイル | 理由 |
|---|---|
| `meals/components/CalorieChart.jsx` | Phase 2 で `analysis/` に移行済み |
| `weights/components/WeightChart.jsx` | 同上 |

### インデックス更新 (3ファイル)

- `meals/components/index.js` → `index.ts`（CalorieChart 除去）
- `meals/index.js` → `index.ts`
- `weights/components/index.js` → `index.ts`（WeightChart 除去）

## アーキテクチャ決定

### 1. 共通型定義の集約 (`src/types/`)

**問題**: Phase 1〜2 では各コンポーネント内でローカルに型定義していた。AnalysisPage と RecordTab で `Meal` 型が別々に定義されていた。

**解決**: `src/types/` ディレクトリに全型を集約し、バレルエクスポート。`import type { MealRecord } from "@/types"` で一箇所から参照。

**トレードオフ**: 型ファイルが肥大化するリスクがあるが、DishBoardの規模では問題にならない。

### 2. EMPTY_NUTRITION 定数パターン

**なぜ**: `useMenuBuilder` の `totalNutrition` 計算で12栄養素のゼロ値オブジェクトが必要。マジックナンバー排除のため定数化。

### 3. Dialog vs Modal

**選択**: shadcn/ui Dialog（`@radix-ui/react-dialog` ベース）

**理由**: Sheet（サイドバー）で既に `@radix-ui/react-dialog` を導入済み。同じパッケージを共有するため追加インストール不要。フォーカストラップ・Esc閉じ・オーバーレイが標準提供される。

### 4. MyItemsSelector / MyMenusSelector の据え置き

**判断**: Phase 3 スコープ外として Bootstrap のまま維持。

**理由**: これらは `CustomFoodFormModal` / `EditCustomFoodModal` に依存しており、それらのモーダルも Bootstrap。連鎖的に移行範囲が広がるため、Phase 4 で認証画面と一緒に対応するか、独立タスクとして切り出すことを推奨。

### 5. 日付初期値の安全な生成

Phase 1〜2 で確立された規約に従い、`new Date().toISOString().split('T')[0]` を使用せず、`getFullYear()`/`getMonth()`/`getDate()` で手動フォーマット。Dashboard.tsx と useMenuBuilder.ts の両方で適用。

## 追加パッケージ

**Phase 3 では追加パッケージなし。** 仕様書では `@radix-ui/react-select` と `@radix-ui/react-accordion` が記載されていたが、以下の理由で不要と判断:

- Select: ネイティブ `<select>` + Tailwind スタイリングで十分（MealTiming 選択は4項目のみ）
- Accordion: ManualInputForm の詳細栄養素は `useState` + 条件レンダリングで実現（Radix の複雑さは不要）

YAGNI原則に従い、Phase 4 以降で必要になった時点で導入する。

## 既知の制約

1. **MyItemsSelector / MyMenusSelector**: Bootstrap のまま残存。`.dishboard-app` スコープ内で Bootstrap と Tailwind が共存する。
2. **react-hot-toast**: Phase 4 で sonner に置換予定。useMenuBuilder では引き続き `toast` を使用。
3. **useDashboardData テスト**: `.test.js` のまま残存。`useDashboardData.ts` への移行でインポートパスは自動解決されるが、テスト内の型アノテーションは追加していない（既存テストが `vi.fn()` ベースのため型推論で十分）。

## Phase 3 完了後のコンポーネント階層

```
App.jsx (Bootstrap — Phase 4)
└── Dashboard.tsx (Tailwind ✅ Phase 3)
    ├── InstallPWA (Bootstrap — Phase 4)
    ├── AppShell.tsx (Tailwind ✅)
    │   ├── Header.tsx (Tailwind ✅)
    │   ├── Sidebar.tsx (Tailwind ✅)
    │   └── main content area
    │       ├── RecordTab.tsx (Tailwind ✅)
    │       │   ├── DateSelector.tsx (Tailwind ✅)
    │       │   ├── CharacterGreeting.tsx (Tailwind ✅)
    │       │   ├── PFCSummary.tsx (Tailwind ✅)
    │       │   ├── MealTimingTabs.tsx (Tailwind ✅)
    │       │   ├── MealForm.tsx (Tailwind ✅ Phase 3)
    │       │   │   ├── MenuBuilderPanel.tsx (Tailwind ✅ Phase 3)
    │       │   │   │   ├── FoodSearchInput.tsx (Tailwind ✅ Phase 3)
    │       │   │   │   ├── MyItemsSelector.jsx (Bootstrap — 据え置き)
    │       │   │   │   ├── MyMenusSelector.jsx (Bootstrap — 据え置き)
    │       │   │   │   ├── CafeteriaSelector.tsx (Tailwind ✅ Phase 3)
    │       │   │   │   └── ManualInputForm.tsx (Tailwind ✅ Phase 3)
    │       │   │   └── MenuPreviewPanel.tsx (Tailwind ✅ Phase 3)
    │       │   │       ├── CurrentMenuDisplay.tsx (Tailwind ✅ Phase 3)
    │       │   │       └── NutritionSummary.tsx (Tailwind ✅ Phase 3)
    │       │   └── WeightForm.tsx (Tailwind ✅ Phase 3)
    │       ├── AnalysisPage.tsx (Tailwind ✅)
    │       └── SettingsPage (Phase 4)
    └── EditMealModal.tsx (Tailwind ✅ Phase 3)
```
