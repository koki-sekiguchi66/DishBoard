/**
 * 食事記録関連の型定義
 */
import type { FullNutrition, MealTiming } from "./nutrition";

/** 食事記録アイテムの種別 */
export type ItemType = "standard" | "custom" | "cafeteria";

/** 食事記録アイテム（MealRecordItem モデル対応） */
export interface MealRecordItem extends FullNutrition {
  id: number;
  item_type: ItemType;
  item_id: number;
  item_name: string;
  amount_grams: number;
  display_order: number;
}

/** 食事記録（MealRecord モデル対応） */
export interface MealRecord extends FullNutrition {
  id: number;
  record_date: string;
  meal_timing: MealTiming;
  meal_name: string;
  items: MealRecordItem[];
  created_at?: string;
  updated_at?: string;
}

/** 食事記録作成リクエスト */
export interface CreateMealRequest extends FullNutrition {
  record_date: string;
  meal_timing: MealTiming;
  meal_name: string;
  items: Omit<MealRecordItem, "id">[];
}

/** 食事記録更新リクエスト */
export type UpdateMealRequest = Partial<MealRecord>;

/** 日次栄養サマリー */
export interface DailySummary extends FullNutrition {
  total_calories?: number;
  total_protein?: number;
  total_fat?: number;
  total_carbohydrates?: number;
  meal_count?: number;
}

/** 日次サマリーAPIレスポンス */
export interface DailySummaryResponse {
  date: string;
  nutrition_summary: DailySummary;
}

/** メニュービルダー内の一時アイテム（tempId付き） */
export interface MenuBuilderItem extends FullNutrition {
  tempId: number;
  item_type: ItemType;
  item_id?: number;
  item_name: string;
  amount_grams: number;
  display_order: number;
}
