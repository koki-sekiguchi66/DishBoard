/**
 * 食品関連の型定義
 */
import type { FullNutrition } from "./nutrition";

/** 標準食品（食品データベース） */
export interface StandardFood {
  id: number | string;
  name: string;
  category: string;
  nutrition: {
    calories: number;
    protein: number;
    fat: number;
    carbohydrates: number;
    dietary_fiber?: number;
    sodium?: number;
    calcium?: number;
    iron?: number;
    vitamin_a?: number;
    vitamin_b1?: number;
    vitamin_b2?: number;
    vitamin_c?: number;
  };
  per_serving_grams?: number;
}

/** 食品検索APIレスポンス */
export interface FoodSearchResponse {
  foods: StandardFood[];
}

/** 栄養計算APIレスポンス */
export interface NutritionCalcResponse {
  nutrition: FullNutrition;
  amount: number;
}

/** カスタム食品（Myアイテム） */
export interface CustomFood {
  id: number;
  name: string;
  calories_per_100g?: number;
  protein_per_100g?: number;
  fat_per_100g?: number;
  carbohydrates_per_100g?: number;
  calories: number;
  protein: number;
  fat: number;
  carbohydrates: number;
  dietary_fiber: number;
  sodium: number;
  calcium: number;
  iron: number;
  vitamin_a: number;
  vitamin_b1: number;
  vitamin_b2: number;
  vitamin_c: number;
}

/** カスタムメニュー */
export interface CustomMenu {
  id: number;
  name: string;
  description?: string;
  total_calories: number;
  total_protein: number;
  total_fat: number;
  total_carbohydrates: number;
  items_count: number;
  items?: CustomMenuItemDetail[];
}

/** カスタムメニューアイテム詳細 */
export interface CustomMenuItemDetail extends FullNutrition {
  id: number;
  item_type: string;
  item_id: number;
  item_name: string;
  amount_grams: number;
  display_order: number;
}

/** 食堂メニュー */
export interface CafeteriaMenu {
  id: number;
  name: string;
  category: string;
  category_display: string;
  calories: number;
  protein: number;
  fat: number;
  carbohydrates: number;
  menu_id?: number;
}

/** 食品選択時にMenuBuilderPanelに渡される汎用型 */
export interface FoodSelectionItem {
  item_type?: string;
  item_id?: number | string;
  item_name: string;
  amount_grams?: number;
  amount?: number;
  calories: number;
  protein: number;
  fat: number;
  carbohydrates: number;
  dietary_fiber?: number;
  sodium?: number;
  calcium?: number;
  iron?: number;
  vitamin_a?: number;
  vitamin_b1?: number;
  vitamin_b2?: number;
  vitamin_c?: number;
  // カスタム食品の per_100g 系
  calories_per_100g?: number;
  protein_per_100g?: number;
  fat_per_100g?: number;
  carbohydrates_per_100g?: number;
  // 食堂メニューの識別
  menu_id?: number;
}
