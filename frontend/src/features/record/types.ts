export interface Meal {
  id: number;
  meal_name: string;
  meal_timing: string;
  calories: number;
  protein: number;
  fat: number;
  carbohydrates: number;
}

/** @/types の DailySummary をそのまま使う。feature 内での重複定義はしない */
export type { DailySummary } from "@/types";
