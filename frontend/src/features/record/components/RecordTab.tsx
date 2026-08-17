/**
 * RecordTab — 記録ページのプレゼンテーションコンポーネント
 *
 * Dashboard → RecordTab → PFCSummary の3段 props drilling。
 * Context は導入せず、シンプルさを優先。
 */
import { type ReactNode } from "react";
import { DateSelector } from "./DateSelector";
import { CharacterGreeting } from "./CharacterGreeting";
import { PFCSummary } from "./PFCSummary";
import { MealTimingTabs } from "./MealTimingTabs";
import { useFrequentMeals } from "@/features/meals";
import type { Meal, DailySummary } from "../types";
import type { MealRecord, NutritionGoals } from "@/types";

interface RecordTabProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  meals: Meal[];
  /** よく記録するメニューの抽出に使う全期間の記録 */
  allMeals: MealRecord[];
  dailySummary: DailySummary | null;
  /** 栄養目標値（任意）。GoalSettings で設定された値が伝搬される */
  goals?: Partial<NutritionGoals>;
  onMealEdit?: (meal: Meal) => void;
  onMealDelete?: (mealId: number) => void;
  onMealSaveAsMenu?: (meal: Meal) => void;
  onMealRepeat?: (meal: MealRecord) => void;
  isRepeatingMeal?: boolean;
  mealFormSlot: ReactNode;
  weightFormSlot: ReactNode;
}

export function RecordTab({
  selectedDate,
  onDateChange,
  meals,
  allMeals,
  dailySummary,
  goals,
  onMealEdit,
  onMealDelete,
  onMealSaveAsMenu,
  onMealRepeat,
  isRepeatingMeal,
  mealFormSlot,
  weightFormSlot,
}: RecordTabProps) {
  const frequentMeals = useFrequentMeals(allMeals, selectedDate);

  return (
    <div className="flex flex-col gap-4">
      {/* 日付セレクター */}
      <DateSelector selectedDate={selectedDate} onDateChange={onDateChange} />

      {/* キャラクター挨拶 */}
      <CharacterGreeting />

      {/* PFCサマリー */}
      <PFCSummary
        calories={dailySummary?.calories ?? null}
        protein={dailySummary?.protein ?? null}
        fat={dailySummary?.fat ?? null}
        carbs={dailySummary?.carbohydrates ?? null}
        goals={goals}
      />

      {/* 食事タイミング別タブ + 食品チップリスト */}
      <MealTimingTabs
        meals={meals}
        onEdit={onMealEdit}
        onDelete={onMealDelete}
        onSaveAsMenu={onMealSaveAsMenu}
        frequentMeals={frequentMeals}
        onRepeatMeal={onMealRepeat}
        isRepeatingMeal={isRepeatingMeal}
      />

      {/* 既存の食事記録フォーム */}
      <div className="mt-2">{mealFormSlot}</div>

      {/* 既存の体重記録フォーム */}
      <div className="mt-2">{weightFormSlot}</div>
    </div>
  );
}
