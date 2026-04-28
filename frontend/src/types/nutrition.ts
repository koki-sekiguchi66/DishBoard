/**
 * 栄養素の基本インターフェース
 *
 * なぜ共通型を一元管理するか:
 *   Phase 1〜2 では各コンポーネント内でローカルに型定義していたが、
 *   API層・フック・コンポーネント間で同じ型が繰り返し定義されていた。
 *   Phase 3 で src/types/ に集約し、DRY原則を徹底する。
 */

/** 基本4栄養素（PFC + カロリー） */
export interface BaseNutrition {
  calories: number;
  protein: number;
  fat: number;
  carbohydrates: number;
}

/** 全12栄養素（詳細表示・スナップショット保存用） */
export interface FullNutrition extends BaseNutrition {
  dietary_fiber: number;
  sodium: number;
  calcium: number;
  iron: number;
  vitamin_a: number;
  vitamin_b1: number;
  vitamin_b2: number;
  vitamin_c: number;
}

/** FullNutrition の全フィールド名 */
export const FULL_NUTRITION_KEYS: (keyof FullNutrition)[] = [
  "calories",
  "protein",
  "fat",
  "carbohydrates",
  "dietary_fiber",
  "sodium",
  "calcium",
  "iron",
  "vitamin_a",
  "vitamin_b1",
  "vitamin_b2",
  "vitamin_c",
];

/** 栄養素ゼロ値（reduce の初期値など） */
export const EMPTY_NUTRITION: FullNutrition = {
  calories: 0,
  protein: 0,
  fat: 0,
  carbohydrates: 0,
  dietary_fiber: 0,
  sodium: 0,
  calcium: 0,
  iron: 0,
  vitamin_a: 0,
  vitamin_b1: 0,
  vitamin_b2: 0,
  vitamin_c: 0,
};

/** 食事タイミング */
export type MealTiming = "breakfast" | "lunch" | "dinner" | "snack";

export const MEAL_TIMING_LABELS: Record<MealTiming, string> = {
  breakfast: "朝食",
  lunch: "昼食",
  dinner: "夕食",
  snack: "間食",
};
