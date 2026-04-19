import { type ReactNode } from "react";
import { DateSelector } from "./DateSelector";
import { CharacterGreeting } from "./CharacterGreeting";
import { PFCSummary } from "./PFCSummary";
import { MealTimingTabs } from "./MealTimingTabs";
import type { Meal, DailySummary } from "../types";

interface RecordTabProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  meals: Meal[];
  dailySummary: DailySummary | null;
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

      {/* PFCサマリー */}
      <PFCSummary
        calories={dailySummary?.total_calories ?? null}
        protein={dailySummary?.total_protein ?? null}
        fat={dailySummary?.total_fat ?? null}
        carbs={dailySummary?.total_carbohydrates ?? null}
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