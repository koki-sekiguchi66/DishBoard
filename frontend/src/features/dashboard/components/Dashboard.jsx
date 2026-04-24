/**
 * Dashboard — DishBoard メイン画面（Phase 1.5 + 2 統合版）
 *
 * アーキテクチャ:
 *   Dashboard は「統合レイヤー」として機能する。
 *   - useDashboardData フック: データ取得（Fix #3 で stale closure 修正済み）
 *   - RecordTab: 記録ページの表示
 *   - AnalysisPage: 分析ページの表示
 *   - AppShell: レイアウト + ページルーティング（Sidebar 方式）
 *
 * Fix #10: useMemo でフォームスロットをメモ化
 *   mealFormSlot / weightFormSlot は actions のコールバック参照が変わらない限り
 *   同一のJSXを返す。毎レンダーで再生成すると子コンポーネント（MealForm, WeightForm）が
 *   不要に再マウントされるため、useMemo で安定化させる。
 */
import { useState, useMemo } from 'react';
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

  const { data, actions } = useDashboardData(initialDate);
  const { meals, allMeals, weights, dailySummary, selectedDate } = data;

  const onMealUpdateWrapper = (updatedMeal) => {
    actions.handleMealUpdated(updatedMeal);
    setEditingMeal(null);
  };

  const confirmDelete = (mealId) => {
    if (window.confirm('この記録を本当に削除しますか？')) {
      actions.handleMealDelete(mealId);
    }
  };

  // ── Fix #10: フォームスロットをメモ化 ──
  // actions.handleMealCreated / handleWeightCreated は useCallback で安定化済み（Fix #3）
  const mealFormSlot = useMemo(() => (
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
  ), [actions.handleMealCreated]);

  const weightFormSlot = useMemo(() => (
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
  ), [actions.handleWeightCreated]);

  // ── ページコンテンツ ──

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
