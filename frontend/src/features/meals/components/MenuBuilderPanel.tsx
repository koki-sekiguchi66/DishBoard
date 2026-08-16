import {
  Search,
  EggFried,
  BookmarkCheck,
  Store,
  Pencil,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import FoodSearchInput from "./FoodSearchInput";
import ManualInputForm from "./ManualInputForm";
import MyMenusSelector from "./MyMenuSelector";
import MyItemsSelector from "./MyItemsSelector";
import CafeteriaSelector from "./CafeteriaSelector";
import { OCRButton } from "@/features/ocr";
import type { MenuBuilderReturn } from "../hooks/useMenuBuilder";
import type { FoodSelectionItem, FullNutrition, MealTiming } from "@/types";
import {
  FULL_NUTRITION_KEYS,
  MEAL_TIMING_LABELS,
  PER_100G_FIELD,
} from "@/types";

interface MenuBuilderPanelProps {
  menuBuilder: MenuBuilderReturn;
}

type InputMethod = "search" | "myItems" | "myMenus" | "cafeteria" | "manual";

const INPUT_METHODS: { id: InputMethod; label: string; icon: typeof Search }[] = [
  { id: "search", label: "検索", icon: Search },
  { id: "myItems", label: "Myアイテム", icon: EggFried },
  { id: "myMenus", label: "Myメニュー", icon: BookmarkCheck },
  { id: "cafeteria", label: "食堂", icon: Store },
  { id: "manual", label: "手動", icon: Pencil },
];

const TIMING_OPTIONS: { value: MealTiming; label: string }[] = [
  { value: "breakfast", label: MEAL_TIMING_LABELS.breakfast },
  { value: "lunch", label: MEAL_TIMING_LABELS.lunch },
  { value: "dinner", label: MEAL_TIMING_LABELS.dinner },
  { value: "snack", label: MEAL_TIMING_LABELS.snack },
];

/**
 * 選択された食品をメニュー明細（摂取量ぶんの実数値）へ正規化する。
 *
 * 100g あたりの値しか持たない Myアイテムは、PER_100G_FIELD で対応する
 * フィールドを引いてから按分する。キー名を組み立てて引くと
 * carbs_per_100g / fiber_per_100g を取り逃がして 0 になるため。
 */
export const toMenuItemPayload = (
  item: FoodSelectionItem
): Record<string, unknown> => {
  const amount = parseFloat(String(item.amount_grams || item.amount || 100));

  const resolveNutrient = (key: keyof FullNutrition): number => {
    const direct = item[key];
    if (direct !== undefined && direct !== null) {
      return parseFloat(String(direct));
    }
    const per100Val = item[PER_100G_FIELD[key]];
    if (per100Val !== undefined && per100Val !== null) {
      return (parseFloat(String(per100Val)) * amount) / 100;
    }
    return 0;
  };

  const nutrition = Object.fromEntries(
    FULL_NUTRITION_KEYS.map((key) => [key, resolveNutrient(key)])
  );

  return {
    item_type:
      item.item_type ||
      (item.menu_id
        ? "cafeteria"
        : item.calories_per_100g
          ? "custom"
          : "standard"),
    item_id: item.item_id || item.menu_id || 0,
    item_name: item.item_name,
    amount_grams: amount,
    ...nutrition,
  };
};

export default function MenuBuilderPanel({ menuBuilder }: MenuBuilderPanelProps) {
  const {
    recordDate,
    setRecordDate,
    mealTiming,
    setMealTiming,
    activeInputMethod,
    setActiveInputMethod,
    addMenuItem,
  } = menuBuilder;

  const handleFoodSelected = (item: FoodSelectionItem) => {
    addMenuItem(toMenuItemPayload(item));
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">食事を記録</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 日付 & タイミング */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="flex items-center gap-1.5 text-xs">
              <Calendar className="h-3.5 w-3.5" />
              記録日
            </Label>
            <Input
              type="date"
              value={recordDate}
              onChange={(e) => setRecordDate(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">タイミング</Label>
            <select
              value={mealTiming}
              onChange={(e) => setMealTiming(e.target.value as MealTiming)}
              className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {TIMING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 入力方式タブ */}
        <div className="flex flex-wrap gap-1">
          {INPUT_METHODS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveInputMethod(id)}
              className={cn(
                "flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                activeInputMethod === id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* 区切り線 */}
        <div className="h-px bg-border" />

        {/* 入力エリア */}
        <div>
          {activeInputMethod === "search" && (
            <FoodSearchInput onFoodSelected={handleFoodSelected} />
          )}
          {activeInputMethod === "myItems" && (
            <MyItemsSelector onItemSelected={handleFoodSelected} />
          )}
          {activeInputMethod === "myMenus" && (
            <MyMenusSelector menuBuilder={menuBuilder} />
          )}
          {activeInputMethod === "cafeteria" && (
            <CafeteriaSelector onMenuSelected={handleFoodSelected} />
          )}
          {activeInputMethod === "manual" && (
            <>
              <ManualInputForm onAdd={handleFoodSelected} />
              <div className="mt-3">
                <div className="mb-2 text-center">
                  <span className="text-xs text-muted-foreground">または</span>
                </div>
                <OCRButton onNutritionDetected={handleFoodSelected} />
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
