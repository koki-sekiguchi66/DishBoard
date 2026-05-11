import { useState, useMemo } from "react";
import { UtensilsCrossed, Scale } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { MealForm, EditMealModal } from "@/features/meals";
import { WeightForm } from "@/features/weights";
import { InstallPWA } from "@/components/PWA";
import { useDashboardData } from "../hooks/useDashboardData";
import { AppShell } from "@/components/layout";
import { RecordTab } from "@/features/record";
import { AnalysisPage } from "@/features/analysis";
import { SettingsPage, useGoalSettings } from "@/features/settings";
import type { MealRecord } from "@/types";

interface DashboardProps {
  handleLogout: () => void;
}

const Dashboard = ({ handleLogout }: DashboardProps) => {
  const [editingMeal, setEditingMeal] = useState<MealRecord | null>(null);

  // toISOString() は UTC 変換で JST の日付がずれるためローカル時刻で組み立てる
  const initialDate = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const { data, actions } = useDashboardData(initialDate);
  const { meals, allMeals, weights, dailySummary, selectedDate } = data;

  const { goals } = useGoalSettings();

  const onMealUpdateWrapper = (updatedMeal: MealRecord) => {
    actions.handleMealUpdated(updatedMeal);
    setEditingMeal(null);
  };

  const confirmDelete = (mealId: number) => {
    if (window.confirm("この記録を本当に削除しますか？")) {
      actions.handleMealDelete(mealId);
    }
  };

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

  const recordContent = (
    <RecordTab
      selectedDate={selectedDate}
      onDateChange={actions.handleDateChange}
      meals={meals}
      dailySummary={dailySummary}
      goals={goals}
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

  const settingsContent = <SettingsPage />;

  return (
    <>
      <InstallPWA />
      <AppShell
        onLogout={handleLogout}
        recordContent={recordContent}
        analysisContent={analysisContent}
        settingsContent={settingsContent}
      />

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
