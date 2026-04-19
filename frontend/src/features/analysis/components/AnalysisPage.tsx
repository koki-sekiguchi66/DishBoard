/**
 * AnalysisPage — 分析ページコンテナ
 *
 * サイドバーの「分析」から遷移するページ。
 * 上から順に: WeeklyTrend → PFCProgressBar → HeatmapCalendar → CalorieChart → WeightChart
 *
 * 設計判断:
 *   - AnalysisPage は純粋なプレゼンテーション層。データ取得は Dashboard.jsx が行い props で渡す
 *   - 各コンポーネントは独立しており、将来的にドラッグ＆ドロップで並び替え可能にする余地を残す
 *   - meals / weights が空の場合も各コンポーネントが自身の空状態を表示するため、ここではガードしない
 */
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
  [key: string]: unknown;
}

interface Weight {
  id: number;
  record_date: string;
  weight: number | string;
  [key: string]: unknown;
}

interface DailySummary {
  calories: number;
  protein: number;
  fat: number;
  carbohydrates: number;
  [key: string]: unknown;
}

interface AnalysisPageProps {
  /** 全期間の食事記録（チャート・ヒートマップ用） */
  allMeals: Meal[];
  /** 体重記録一覧 */
  weights: Weight[];
  /** 本日の栄養サマリー（PFCProgressBar用） */
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
      {/* 週間トレンド */}
      <WeeklyTrend meals={allMeals} />

      {/* PFC目標達成状況 */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-medium text-foreground">今日の目標達成状況</h3>
        <PFCProgressBar current={currentNutrition} />
      </div>

      {/* ヒートマップカレンダー */}
      <HeatmapCalendar meals={allMeals} />

      {/* カロリー推移チャート */}
      <CalorieChart meals={allMeals} />

      {/* 体重推移チャート */}
      <WeightChart weights={weights} />
    </div>
  );
}
