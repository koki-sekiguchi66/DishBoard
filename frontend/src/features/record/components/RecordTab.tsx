/**
 * RecordTab — 記録ページのプレゼンテーションコンポーネント
 *
 * Phase 4 変更点:
 *   - `goals?: Partial<NutritionGoals>` props を追加
 *   - PFCSummary に goals を伝搬（目標値表示）
 *
 * Dashboard → RecordTab → PFCSummary の3段 props drilling。
 * Context は導入せず、シンプルさを優先。
 */
import { type ReactNode } from "react";
import { DateSelector } from "./DateSelector";
import { CharacterGreeting } from "./CharacterGreeting";
import { PFCSummary } from "./PFCSummary";
import { MealTimingTabs } from "./MealTimingTabs";
import type { Meal, DailySummary } from "../types";
import type { NutritionGoals } from "@/types";

interface RecordTabProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  meals: Meal[];
  dailySummary: DailySummary | null;
  /** 栄養目標値（任意）。Phase 4 で追加。GoalSettings で設定された値が伝搬される */
  goals?: Partial<NutritionGoals>;
  onMealEdit?: (meal: Meal) => void;
  onMealDelete?: (mealId: number) => void;
  mealFormSlot: ReactNode;
  weightFormSlot: ReactNode;
}

export function RecordTab({
  selectedDate,
  onDateChange,
  meals,
  dailySummary,
  goals,
  onMealEdit,
  onMealDelete,
  mealFormSlot,
  weightFormSlot,
}: RecordTabProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* 日付セレクター */}
      <DateSelector selectedDate={selectedDate} onDateChange={onDateChange} />

      {/* キャラクター挨拶 */}
      <CharacterGreeting />

      {/* PFCサマリー（Phase 4: goals を伝搬） */}
      <PFCSummary
        calories={dailySummary?.total_calories ?? null}
        protein={dailySummary?.total_protein ?? null}
        fat={dailySummary?.total_fat ?? null}
        carbs={dailySummary?.total_carbohydrates ?? null}
        goals={goals}
      />

      {/* 食事タイミング別タブ + 食品チップリスト */}
      <MealTimingTabs
        meals={meals}
        onEdit={onMealEdit}
        onDelete={onMealDelete}
      />

      {/* 既存の食事記録フォーム */}
      <div className="mt-2">{mealFormSlot}</div>

      {/* 既存の体重記録フォーム */}
      <div className="mt-2">{weightFormSlot}</div>
    </div>
  );
}
