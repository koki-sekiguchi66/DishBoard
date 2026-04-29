/**
 * settings 関連の共通型定義
 *
 * Phase 4 で導入。NutritionGoals は localStorage 経由で永続化され、
 * Dashboard → RecordTab → PFCSummary に props 伝搬される。
 *
 * 設計判断:
 *   - g 単位で直接保存（kcal は calories のみ例外）
 *     → PFCSummary / PFCProgressBar が g を期待しているため、変換層を介さない
 *   - DEFAULT_GOALS は厚労省「日本人の食事摂取基準」を参考にした成人男性の目安
 *   - GoalSettings の UI は内部で % ↔ g 変換を行うが、保存形式は g
 */

/** PFC栄養目標値（calories は kcal、その他は g） */
export interface NutritionGoals {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

/**
 * デフォルト目標値（成人男性の一般的な目安）
 * - 2000kcal を P:20% / F:25% / C:55% で配分
 * - protein:  20% × 2000 ÷ 4kcal/g = 100g
 * - fat:      25% × 2000 ÷ 9kcal/g ≈ 56g
 * - carbs:    55% × 2000 ÷ 4kcal/g = 275g
 */
export const DEFAULT_GOALS: NutritionGoals = {
  calories: 2000,
  protein: 100,
  fat: 56,
  carbs: 275,
};

/** localStorage キー。マジックストリング排除 */
export const STORAGE_KEY_GOALS = "dishboard-goals";

/**
 * カロリー換算係数（kcal/g）
 * GoalSettings での比率 ↔ g 変換に使用
 */
export const KCAL_PER_GRAM = {
  protein: 4,
  fat: 9,
  carbs: 4,
} as const;
