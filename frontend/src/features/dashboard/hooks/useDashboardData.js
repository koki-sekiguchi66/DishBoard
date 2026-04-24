import { useState, useEffect, useCallback, useRef } from 'react';
import { mealApi } from '@/features/meals/api/mealApi';
import { weightApi } from '@/features/weights/api/weightApi';

/**
 * ダッシュボードに必要なデータを管理するカスタムフック
 *
 * 設計判断:
 *   - allMeals を useRef で保持し、useEffect 内の stale closure を回避
 *   - 初回ロード（fetchAll）と日付変更（updateForDate）を明確に分離
 *   - 重複していた weights の取得を初回ロードに一本化
 *   - filterMealsByDate のソートを created_at に修正
 *     （同一日付の record_date でソートしても順序が決まらなかった）
 *
 * データフロー:
 *   マウント → fetchAll（meals + weights + summary を並列取得）
 *   日付変更 → updateForDate（summary 再取得 + allMeals から日付フィルタ）
 *   CRUD操作 → handler が allMeals state + ref を同期更新 → summary 再取得
 */
export const useDashboardData = (initialDate) => {
  const [meals, setMeals] = useState([]);
  const [allMeals, setAllMeals] = useState([]);
  const [weights, setWeights] = useState([]);
  const [dailySummary, setDailySummary] = useState(null);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // stale closure 対策: allMeals の最新値を常に参照可能にする
  const allMealsRef = useRef([]);
  const isInitialLoadDone = useRef(false);

  /**
   * allMeals の state と ref を同期更新するヘルパー
   * handler 内で allMeals を直接参照すると stale になるため、
   * ref 経由で最新値を取得し、state 更新と同時に ref も更新する
   */
  const updateAllMeals = useCallback((updater) => {
    const current = allMealsRef.current;
    const next = typeof updater === 'function' ? updater(current) : updater;
    allMealsRef.current = next;
    setAllMeals(next);
    return next;
  }, []);

  // 指定された日付で食事リストをフィルタリング
  const filterMealsByDate = useCallback((mealList, date) => {
    const filtered = mealList.filter(meal => meal.record_date === date);
    // 同一日付内では created_at の降順でソート（record_date ソートは無意味だった）
    setMeals(filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
  }, []);

  // ── 初回ロード（マウント時に1回だけ実行） ──
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [mealsData, weightsData, summaryData] = await Promise.all([
          mealApi.getMeals(),
          weightApi.getWeights(),
          mealApi.getDailySummary(initialDate),
        ]);

        allMealsRef.current = mealsData;
        setAllMeals(mealsData);
        filterMealsByDate(mealsData, initialDate);
        setWeights(weightsData);
        setDailySummary(summaryData.nutrition_summary);
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
        setMessage('データの取得に失敗しました。');
      } finally {
        setLoading(false);
        isInitialLoadDone.current = true;
      }
    };

    fetchAll();
    // initialDate は初期値として1回だけ使用。filterMealsByDate は安定参照。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 日付変更時の処理（初回ロード完了後のみ） ──
  useEffect(() => {
    if (!isInitialLoadDone.current) return;

    const updateForDate = async () => {
      try {
        const summaryData = await mealApi.getDailySummary(selectedDate);
        setDailySummary(summaryData.nutrition_summary);
        filterMealsByDate(allMealsRef.current, selectedDate);
      } catch (error) {
        console.error('Failed to update daily view', error);
      }
    };

    updateForDate();
  }, [selectedDate, filterMealsByDate]);

  // --- アクションハンドラ ---

  const handleDateChange = useCallback((newDate) => {
    setSelectedDate(newDate);
  }, []);

  const showMessage = useCallback((msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 5000);
  }, []);

  /** サマリーを再取得（複数ハンドラから共通利用） */
  const refreshSummary = useCallback((date) => {
    mealApi.getDailySummary(date)
      .then(data => setDailySummary(data.nutrition_summary))
      .catch(err => console.error('Failed to refresh summary', err));
  }, []);

  const handleMealCreated = useCallback((newMeal) => {
    const updated = updateAllMeals((prev) =>
      [newMeal, ...prev].sort((a, b) => new Date(b.record_date) - new Date(a.record_date))
    );

    if (newMeal.record_date === selectedDate) {
      filterMealsByDate(updated, selectedDate);
      refreshSummary(selectedDate);
    }
  }, [selectedDate, updateAllMeals, filterMealsByDate, refreshSummary]);

  const handleMealDelete = useCallback(async (mealId) => {
    try {
      await mealApi.deleteMeal(mealId);
      const updated = updateAllMeals((prev) => prev.filter(meal => meal.id !== mealId));
      filterMealsByDate(updated, selectedDate);
      refreshSummary(selectedDate);
      showMessage('記録を削除しました。');
    } catch (error) {
      console.error('Failed to delete meal', error);
      showMessage('記録の削除に失敗しました。');
    }
  }, [selectedDate, updateAllMeals, filterMealsByDate, refreshSummary, showMessage]);

  const handleMealUpdated = useCallback((updatedMeal) => {
    const updated = updateAllMeals((prev) =>
      prev.map(meal => (meal.id === updatedMeal.id ? updatedMeal : meal))
    );
    filterMealsByDate(updated, selectedDate);
    refreshSummary(selectedDate);
  }, [selectedDate, updateAllMeals, filterMealsByDate, refreshSummary]);

  const handleWeightCreated = useCallback((newWeight) => {
    setWeights(prevWeights => {
      const existingIndex = prevWeights.findIndex(w => w.id === newWeight.id);
      if (existingIndex !== -1) {
        const copy = [...prevWeights];
        copy[existingIndex] = newWeight;
        return copy.sort((a, b) => new Date(b.record_date) - new Date(a.record_date));
      }
      return [newWeight, ...prevWeights].sort((a, b) => new Date(b.record_date) - new Date(a.record_date));
    });
  }, []);

  return {
    data: { meals, allMeals, weights, dailySummary, selectedDate, message, loading },
    actions: {
      handleDateChange,
      handleMealCreated,
      handleMealDelete,
      handleMealUpdated,
      handleWeightCreated,
      setMessage,
    },
  };
};
