import { WeeklyTrend } from "./WeeklyTrend";
import { PFCProgressBar } from "./PFCProgressBar";
import { HeatmapCalendar } from "./HeatmapCalendar";
import { CalorieChart } from "./CalorieChart";
import { WeightChart } from "./WeightChart";

interface Meal {
  id: number;
  record_date: string;
  calories: number | string;
  protein: number | string;
  fat: number | string;
  carbohydrates: number | string;
  meal_name?: string;
  meal_timing?: string;
}

interface Weight {
  id: number;
  record_date: string;
  weight: number | string;
}

interface DailySummary {
  calories: number;
  protein: number;
  fat: number;
  carbohydrates: number;
}

interface AnalysisPageProps {
  allMeals: Meal[];
  weights: Weight[];
  dailySummary: DailySummary | null;
}

export function AnalysisPage({ allMeals, weights, dailySummary }: AnalysisPageProps) {
  const currentNutrition = {
    calories: dailySummary?.calories ?? 0,
    protein: dailySummary?.protein ?? 0,
    fat: dailySummary?.fat ?? 0,
    carbs: dailySummary?.carbohydrates ?? 0,
  };

  return (
    <div className="space-y-4 pb-8" data-testid="analysis-page">
      <WeeklyTrend meals={allMeals} />

      <div className="bg-ledger rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-medium text-foreground">今日の目標達成状況</h3>
        <PFCProgressBar current={currentNutrition} />
      </div>

      <HeatmapCalendar meals={allMeals} />
      <CalorieChart meals={allMeals} />
      <WeightChart weights={weights} />
    </div>
  );
}
