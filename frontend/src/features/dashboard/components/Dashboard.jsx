/**
 * Dashboard — DishBoard メイン画面（Phase 1.5 + 2 統合版）
 *
 * Phase 1 → 1.5+2 の変更点:
 *   - AppShell が内部で BottomNav → Sidebar に変更済み（Dashboard側の変更は props のみ）
 *   - CalorieChart / WeightChart を記録タブから削除し、AnalysisPage に移動
 *   - analysisContent を AppShell に渡して分析ページを有効化
 *   - cafeteria 関連の props を削除（学食タブ廃止）
 *
 * アーキテクチャ:
 *   Dashboard は「統合レイヤー」として機能する。
 *   - useDashboardData フック: データ取得（変更なし）
 *   - RecordTab: 記録ページの表示（変更なし）
 *   - AnalysisPage: 分析ページの表示（新規追加）
 *   - AppShell: レイアウト + ページルーティング（Sidebar 方式に更新済み）
 */
import { useState } from 'react';
import { Card } from 'react-bootstrap';

import { MealForm, EditMealModal } from '@/features/meals';
import { WeightForm } from '@/features/weights';
import { InstallPWA } from '@/components/PWA';
import { useDashboardData } from '../hooks/useDashboardData';
import { AppShell } from '@/components/layout';
import { RecordTab } from '@/features/record';
import { AnalysisPage } from '@/features/analysis';

const Dashboard = ({ handleLogout }) => {
  const [editingMeal, setEditingMeal] = useState(null);
  const initialDate = new Date().toISOString().split('T')[0];

  // カスタムフックを使用（変更なし）
  const { data, actions } = useDashboardData(initialDate);
  const { meals, allMeals, weights, dailySummary, selectedDate } = data;

  // Meal 更新時のラッパー
  const onMealUpdateWrapper = (updatedMeal) => {
    actions.handleMealUpdated(updatedMeal);
    setEditingMeal(null);
  };

  // 削除確認ラッパー
  const confirmDelete = (mealId) => {
    if (window.confirm('この記録を本当に削除しますか？')) {
      actions.handleMealDelete(mealId);
    }
  };

  // ── 既存 Bootstrap コンポーネントをスロットとして準備（変更なし） ──

  const mealFormSlot = (
    <Card className="shadow-sm">
      <Card.Header className="bg-success text-white">
        <Card.Title className="mb-0">
          <i className="bi bi-journal-plus me-2"></i>
          食事記録
        </Card.Title>
      </Card.Header>
      <Card.Body>
        <MealForm onMealCreated={actions.handleMealCreated} />
      </Card.Body>
    </Card>
  );

  const weightFormSlot = (
    <Card className="shadow-sm">
      <Card.Header className="bg-info text-white">
        <Card.Title className="mb-0">
          <i className="bi bi-speedometer me-2"></i>
          体重記録
        </Card.Title>
      </Card.Header>
      <Card.Body>
        <WeightForm onWeightCreated={actions.handleWeightCreated} />
      </Card.Body>
    </Card>
  );

  // ── 記録ページ ──

  const recordContent = (
    <RecordTab
      selectedDate={selectedDate}
      onDateChange={actions.handleDateChange}
      meals={meals}
      dailySummary={dailySummary}
      onMealEdit={(meal) => setEditingMeal(meal)}
      onMealDelete={confirmDelete}
      mealFormSlot={mealFormSlot}
      weightFormSlot={weightFormSlot}
    />
  );

  // ── 分析ページ（Phase 2 新規追加） ──

  const analysisContent = (
    <AnalysisPage
      allMeals={allMeals}
      weights={weights}
      dailySummary={dailySummary ? {
        calories: dailySummary.calories ?? 0,
        protein: dailySummary.protein ?? 0,
        fat: dailySummary.fat ?? 0,
        carbohydrates: dailySummary.carbohydrates ?? 0,
      } : null}
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

      {editingMeal && (
        <EditMealModal
          meal={editingMeal}
          onClose={() => setEditingMeal(null)}
          onMealUpdated={onMealUpdateWrapper}
        />
      )}
    </>
  );
};

export default Dashboard;
