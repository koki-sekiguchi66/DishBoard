/**
 * Dashboard — DishBoard メイン画面（Phase 3 TypeScript + Tailwind版）
 *
 * Phase 3 変更点:
 *   - JSX → TSX（型安全化）
 *   - Bootstrap Card → shadcn/ui Card + Tailwind
 *   - useDashboardData, MealForm, WeightForm, EditMealModal を TS版に差し替え
 *
 * アーキテクチャ（変更なし）:
 *   Dashboard は「統合レイヤー」として機能する。
 *   - useDashboardData フック: データ取得
 *   - RecordTab: 記録ページの表示
 *   - AnalysisPage: 分析ページの表示
 *   - AppShell: レイアウト + ページルーティング
 *
 * Fix #10 維持: useMemo でフォームスロットをメモ化
 */
import { useState, useMemo } from "react";
import { UtensilsCrossed, Scale } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// バレルエクスポート経由（既存パターン維持）
import { MealForm, EditMealModal } from "@/features/meals";
import { WeightForm } from "@/features/weights";
import { InstallPWA } from "@/components/PWA";
import { useDashboardData } from "../hooks/useDashboardData";
import { AppShell } from "@/components/layout";
import { RecordTab } from "@/features/record";
import { AnalysisPage } from "@/features/analysis";
import type { MealRecord } from "@/types";

interface DashboardProps {
  handleLogout: () => void;
}

const Dashboard = ({ handleLogout }: DashboardProps) => {
  const [editingMeal, setEditingMeal] = useState<MealRecord | null>(null);

  // 日付初期値: toISOString() を使わない（UTC変換によるJSTずれ防止）
  const initialDate = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const { data, actions } = useDashboardData(initialDate);
  const { meals, allMeals, weights, dailySummary, selectedDate } = data;

  const onMealUpdateWrapper = (updatedMeal: MealRecord) => {
    actions.handleMealUpdated(updatedMeal);
    setEditingMeal(null);
  };

  const confirmDelete = (mealId: number) => {
    if (window.confirm("この記録を本当に削除しますか？")) {
      actions.handleMealDelete(mealId);
    }
  };

  // ── Fix #10: フォームスロットをメモ化（Bootstrap Card → shadcn/ui Card） ──
  const mealFormSlot = useMemo(
    () => (
      <Card>
        <CardHeader className="bg-primary/10">
          <CardTitle className="flex items-center gap-2 text-base">
            <UtensilsCrossed className="h-4 w-4" />
            食事記録
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <MealForm onMealCreated={actions.handleMealCreated} />
        </CardContent>
      </Card>
    ),
    [actions.handleMealCreated]
  );

  const weightFormSlot = useMemo(
    () => (
      <Card>
        <CardHeader className="bg-blue-500/10">
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="h-4 w-4" />
            体重記録
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <WeightForm onWeightCreated={actions.handleWeightCreated} />
        </CardContent>
      </Card>
    ),
    [actions.handleWeightCreated]
  );

  // ── ページコンテンツ ──
  const recordContent = (
    <RecordTab
      selectedDate={selectedDate}
      onDateChange={actions.handleDateChange}
      meals={meals}
      dailySummary={dailySummary}
      onMealEdit={(meal) => setEditingMeal(meal as MealRecord)}
      onMealDelete={confirmDelete}
      mealFormSlot={mealFormSlot}
      weightFormSlot={weightFormSlot}
    />
  );

  const analysisContent = (
    <AnalysisPage
      allMeals={allMeals}
      weights={weights}
      dailySummary={
        dailySummary
          ? {
              calories:
                dailySummary.calories ?? dailySummary.total_calories ?? 0,
              protein:
                dailySummary.protein ?? dailySummary.total_protein ?? 0,
              fat: dailySummary.fat ?? dailySummary.total_fat ?? 0,
              carbohydrates:
                dailySummary.carbohydrates ??
                dailySummary.total_carbohydrates ??
                0,
            }
          : null
      }
    />
  );

  return (
    <>
      <InstallPWA />
      <AppShell
        onLogout={handleLogout}
        recordContent={recordContent}
        analysisContent={analysisContent}
      />

      {/* 編集モーダル */}
      {editingMeal && (
        <EditMealModal
          meal={editingMeal}
          show={!!editingMeal}
          onClose={() => setEditingMeal(null)}
          onMealUpdated={onMealUpdateWrapper}
        />
      )}
    </>
  );
};

export default Dashboard;
