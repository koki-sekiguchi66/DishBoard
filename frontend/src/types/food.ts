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

/**
 * カスタム食品（Myアイテム）
 *
 * バックエンドの CustomFood モデルのフィールド名をそのまま写している。
 * 炭水化物と食物繊維だけ食事記録側（carbohydrates / dietary_fiber）と語幹が違い、
 * carbs_per_100g / fiber_per_100g になっている点に注意（StandardFood も同じ命名）。
 */
export interface CustomFood {
  id: number;
  name: string;
  nutrition_basis?: "per_100g" | "per_serving";
  serving_size_g?: number | null;
  source?: "manual" | "url";
  source_url?: string;
  is_verified?: boolean;
  calories_per_100g: number;
  protein_per_100g: number;
  fat_per_100g: number;
  carbs_per_100g: number;
  fiber_per_100g: number;
  sodium_per_100g: number;
  calcium_per_100g: number;
  iron_per_100g: number;
  vitamin_a_per_100g: number;
  vitamin_b1_per_100g: number;
  vitamin_b2_per_100g: number;
  vitamin_c_per_100g: number;
}

/** CustomFood のうち 100g あたり栄養素を表すフィールド名 */
export type Per100gField = Extract<keyof CustomFood, `${string}_per_100g`>;

/**
 * 記録側の栄養素名 → CustomFood の 100g あたりフィールド名。
 *
 * 語幹が一致しない carbohydrates / dietary_fiber を `${key}_per_100g` で組み立てると
 * 存在しないキーを引いて 0 になる。変換は必ずこの表を経由する。
 */
export const PER_100G_FIELD: Record<keyof FullNutrition, Per100gField> = {
  calories: "calories_per_100g",
  protein: "protein_per_100g",
  fat: "fat_per_100g",
  carbohydrates: "carbs_per_100g",
  dietary_fiber: "fiber_per_100g",
  sodium: "sodium_per_100g",
  calcium: "calcium_per_100g",
  iron: "iron_per_100g",
  vitamin_a: "vitamin_a_per_100g",
  vitamin_b1: "vitamin_b1_per_100g",
  vitamin_b2: "vitamin_b2_per_100g",
  vitamin_c: "vitamin_c_per_100g",
};

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

/** 対象の食堂（バックエンドの CafeteriaMenu.CAFETERIA_CHOICES と対応） */
export type CafeteriaCode = "rune" | "hokubu" | "chuo";

export const CAFETERIA_LABELS: Record<CafeteriaCode, string> = {
  rune: "ルネカフェテリア",
  hokubu: "北部食堂",
  chuo: "中央食堂",
};

/** タブの並び。サイト側の並びではなく、利用者に馴染みのある順に固定する */
export const CAFETERIA_ORDER: CafeteriaCode[] = ["rune", "hokubu", "chuo"];

/**
 * 区分チップの並び順。共通区分を先に、食堂ごとの区分（other）を後ろに置く。
 * 数値が小さいほど前。
 */
export const CAFETERIA_CATEGORY_ORDER: Record<string, number> = {
  main: 0,
  side: 1,
  noodle: 2,
  rice: 3,
  dessert: 4,
  other: 5,
};

/** 食堂メニュー */
export interface CafeteriaMenu {
  id: number;
  name: string;
  cafeteria: CafeteriaCode;
  cafeteria_display: string;
  category: string;
  category_display: string;
  /** サイト上の区分の見出し。食堂ごとに違う区分はこれでしか区別できない */
  category_label: string;
  calories: number;
  protein: number;
  fat: number;
  carbohydrates: number;
  /** サイト側のメニューID。食堂をまたぐと重複する */
  menu_id: string;
}

/**
 * 食品選択時にMenuBuilderPanelに渡される汎用型
 *
 * 供給元によって栄養値の持ち方が違う:
 *   - 検索 / 食堂 / 手動 / OCR … 摂取量ぶんの実数値（FullNutrition のキー）
 *   - Myアイテム              … 100g あたりの値（Per100gField のキー）
 * どちらで届くかは呼び出し側次第なので、両方を任意プロパティとして受ける。
 */
export interface FoodSelectionItem
  extends Partial<FullNutrition>,
    Partial<Record<Per100gField, number>> {
  item_type?: string;
  item_id?: number | string;
  item_name: string;
  amount_grams?: number;
  amount?: number;
  /** 食堂メニューの識別 */
  menu_id?: number;
}
