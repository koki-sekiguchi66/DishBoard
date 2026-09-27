import {
  Search,
  EggFried,
  BookmarkCheck,
  Store,
  Pencil,
  ScanLine,
  Sunrise,
  Sun,
  Moon,
  Coffee,
} from "lucide-react";
import { CalendarDatePicker } from "@/components/inputs";
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

type InputMethod = "search" | "myItems" | "myMenus" | "cafeteria" | "ocr" | "manual";

const INPUT_METHODS: { id: InputMethod; label: string; icon: typeof Search }[] = [
  { id: "search", label: "検索", icon: Search },
  { id: "myItems", label: "Myアイテム", icon: EggFried },
  { id: "myMenus", label: "Myメニュー", icon: BookmarkCheck },
  { id: "cafeteria", label: "食堂", icon: Store },
  { id: "ocr", label: "撮影", icon: ScanLine },
  { id: "manual", label: "手動", icon: Pencil },
];

const TIMING_OPTIONS: { value: MealTiming; label: string; icon: typeof Sunrise }[] = [
  { value: "breakfast", label: MEAL_TIMING_LABELS.breakfast, icon: Sunrise },
  { value: "lunch", label: MEAL_TIMING_LABELS.lunch, icon: Sun },
  { value: "dinner", label: MEAL_TIMING_LABELS.dinner, icon: Moon },
  { value: "snack", label: MEAL_TIMING_LABELS.snack, icon: Coffee },
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
  const amount = item.amount_grams === null ? null : Number(item.amount_grams ?? item.amount ?? 100);

  const resolveNutrient = (key: keyof FullNutrition): number => {
    const direct = item[key];
    if (direct !== undefined && direct !== null) {
      return parseFloat(String(direct));
    }
    const per100Val = item[PER_100G_FIELD[key]];
    if (per100Val !== undefined && per100Val !== null) {
      return (parseFloat(String(per100Val)) * (amount ?? 0)) / 100;
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
    ...(item.servings != null ? { servings: item.servings } : {}),
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
    <div className="space-y-5">
      {/* 入力方式（モード選択）は最上部に置く */}
      <div className="flex flex-wrap gap-2">
        {INPUT_METHODS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={activeInputMethod === id}
            onClick={() => setActiveInputMethod(id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium transition-colors",
              activeInputMethod === id
                ? "border-transparent bg-foreground text-background"
                : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* 日付・タイミング。「日付を選択」「食事タイミングを選択」はここ（記録の入力）に属し、
          上部の日付ナビゲーション（記録の閲覧）には付けない（ADR #36） */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] tracking-[0.25em] text-muted-foreground">
            日付を選択
          </p>
          <CalendarDatePicker
            id="record-date"
            value={recordDate}
            onChange={setRecordDate}
            className="mt-1.5"
          />
        </div>

        <div>
          <p className="text-[11px] tracking-[0.25em] text-muted-foreground">
            食事タイミングを選択
          </p>
          <div
            role="tablist"
            aria-label="記録するタイミング"
            className="mt-1.5 flex gap-0.5 rounded-full border border-border/40 p-1"
          >
            {TIMING_OPTIONS.map(({ value, label, icon: Icon }) => {
              const active = mealTiming === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setMealTiming(value)}
                  className={cn(
                    "flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

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
        {activeInputMethod === "ocr" && (
          <OCRButton onNutritionDetected={handleFoodSelected} />
        )}
        {activeInputMethod === "manual" && (
          <ManualInputForm onAdd={handleFoodSelected} />
        )}
      </div>
    </div>
  );
}
