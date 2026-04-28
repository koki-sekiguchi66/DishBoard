/**
 * useDashboardData — ダッシュボードデータ管理フック（TypeScript版）
 *
 * Phase 3: JS→TS移行。
 * - 型定義追加（MealRecord, WeightRecord, DailySummary）
 * - ロジック変更なし（Fix #3 の stale closure 対策は維持）
 *
 * データフロー:
 *   マウント → fetchAll（meals + weights + summary を並列取得）
 *   日付変更 → updateForDate（summary 再取得 + allMeals から日付フィルタ）
 *   CRUD操作 → handler が allMeals state + ref を同期更新 → summary 再取得
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { mealApi } from "@/features/meals/api/mealApi";
import { weightApi } from "@/features/weights/api/weightApi";
import type { MealRecord, WeightRecord, DailySummary } from "@/types";

interface DashboardData {
  meals: MealRecord[];
  allMeals: MealRecord[];
  weights: WeightRecord[];
  dailySummary: DailySummary | null;
  selectedDate: string;
  message: string;
  loading: boolean;
}

interface DashboardActions {
  handleDateChange: (date: string) => void;
  handleMealCreated: (meal: MealRecord) => void;
  handleMealUpdated: (meal: MealRecord) => void;
  handleMealDelete: (mealId: number) => Promise<void>;
  handleWeightCreated: (weight: WeightRecord) => void;
  setMessage: (msg: string) => void;
}

export const useDashboardData = (initialDate: string) => {
  const [meals, setMeals] = useState<MealRecord[]>([]);
  const [allMeals, setAllMeals] = useState<MealRecord[]>([]);
  const [weights, setWeights] = useState<WeightRecord[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const allMealsRef = useRef<MealRecord[]>([]);
  const isInitialLoadDone = useRef(false);

  const updateAllMeals = useCallback(
    (updater: MealRecord[] | ((prev: MealRecord[]) => MealRecord[])) => {
      const current = allMealsRef.current;
      const next = typeof updater === "function" ? updater(current) : updater;
      allMealsRef.current = next;
      setAllMeals(next);
      return next;
    },
    []
  );

  const filterMealsByDate = useCallback(
    (mealList: MealRecord[], date: string) => {
      const filtered = mealList.filter((meal) => meal.record_date === date);
      setMeals(
        filtered.sort(
          (a, b) =>
            new Date(b.created_at ?? "").getTime() -
            new Date(a.created_at ?? "").getTime()
        )
      );
    },
    []
  );

  // ── 初回ロード ──
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
        console.error("Failed to fetch dashboard data", error);
        setMessage("データの取得に失敗しました。");
      } finally {
        setLoading(false);
        isInitialLoadDone.current = true;
      }
    };

    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 日付変更時 ──
  useEffect(() => {
    if (!isInitialLoadDone.current) return;

    const updateForDate = async () => {
      try {
        const summaryData = await mealApi.getDailySummary(selectedDate);
        setDailySummary(summaryData.nutrition_summary);
        filterMealsByDate(allMealsRef.current, selectedDate);
      } catch (error) {
        console.error("Failed to update daily view", error);
      }
    };

    updateForDate();
  }, [selectedDate, filterMealsByDate]);

  // --- ヘルパー ---

  const handleDateChange = useCallback((newDate: string) => {
    setSelectedDate(newDate);
  }, []);

  /** メッセージを表示し、5秒後に自動消去 */
  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 5000);
  }, []);

  /** サマリーを再取得（複数ハンドラから共通利用） */
  const refreshSummary = useCallback((date: string) => {
    mealApi
      .getDailySummary(date)
      .then((data) => setDailySummary(data.nutrition_summary))
      .catch((err) => console.error("Failed to refresh summary", err));
  }, []);

  // --- CRUD ハンドラ ---

  const handleMealCreated = useCallback(
    (newMeal: MealRecord) => {
      const updated = updateAllMeals((prev) =>
        [newMeal, ...prev].sort(
          (a, b) =>
            new Date(b.record_date).getTime() -
            new Date(a.record_date).getTime()
        )
      );

      if (newMeal.record_date === selectedDate) {
        filterMealsByDate(updated, selectedDate);
        refreshSummary(selectedDate);
      }
    },
    [selectedDate, updateAllMeals, filterMealsByDate, refreshSummary]
  );

  const handleMealDelete = useCallback(
    async (mealId: number) => {
      try {
        await mealApi.deleteMeal(mealId);
        const updated = updateAllMeals((prev) =>
          prev.filter((meal) => meal.id !== mealId)
        );
        filterMealsByDate(updated, selectedDate);
        refreshSummary(selectedDate);
        showMessage("記録を削除しました。");
      } catch (error) {
        console.error("Failed to delete meal", error);
        showMessage("記録の削除に失敗しました。");
      }
    },
    [selectedDate, updateAllMeals, filterMealsByDate, refreshSummary, showMessage]
  );

  const handleMealUpdated = useCallback(
    (updatedMeal: MealRecord) => {
      const updated = updateAllMeals((prev) =>
        prev.map((meal) => (meal.id === updatedMeal.id ? updatedMeal : meal))
      );
      filterMealsByDate(updated, selectedDate);
      refreshSummary(selectedDate);
    },
    [selectedDate, updateAllMeals, filterMealsByDate, refreshSummary]
  );

  const handleWeightCreated = useCallback((newWeight: WeightRecord) => {
    setWeights((prevWeights) => {
      const existingIndex = prevWeights.findIndex((w) => w.id === newWeight.id);
      if (existingIndex !== -1) {
        const copy = [...prevWeights];
        copy[existingIndex] = newWeight;
        return copy.sort(
          (a, b) =>
            new Date(b.record_date).getTime() -
            new Date(a.record_date).getTime()
        );
      }
      return [newWeight, ...prevWeights].sort(
        (a, b) =>
          new Date(b.record_date).getTime() -
          new Date(a.record_date).getTime()
      );
    });
  }, []);

  const data: DashboardData = {
    meals,
    allMeals,
    weights,
    dailySummary,
    selectedDate,
    message,
    loading,
  };

  const actions: DashboardActions = {
    handleDateChange,
    handleMealCreated,
    handleMealDelete,
    handleMealUpdated,
    handleWeightCreated,
    setMessage,
  };

  return { data, actions };
};
