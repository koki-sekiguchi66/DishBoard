import { useState, useEffect, useCallback } from 'react';
import { mealApi } from '@/features/meals/api/mealApi';
import { weightApi } from '@/features/weights/api/weightApi';

/**
 * ダッシュボードに必要なデータを管理するカスタムフック
 * APIコールと状態管理を分離し、コンポーネントをクリーンに保つ
 */
export const useDashboardData = (initialDate) => {
  const [meals, setMeals] = useState([]);
  const [allMeals, setAllMeals] = useState([]);
  const [weights, setWeights] = useState([]);
  const [dailySummary, setDailySummary] = useState(null);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // 指定された日付で食事リストをフィルタリング
  const filterMealsByDate = useCallback((mealList, date) => {
    const filteredMeals = mealList.filter(meal => meal.record_date === date);
    setMeals(filteredMeals.sort((a, b) => new Date(b.record_date) - new Date(a.record_date)));
  }, []);

  // データ取得
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [mealsData, weightsData, summaryData] = await Promise.all([
        mealApi.getMeals(),
        weightApi.getWeights(),
        mealApi.getDailySummary(selectedDate)
      ]);

      setAllMeals(mealsData);
      filterMealsByDate(mealsData, selectedDate);
      setWeights(weightsData);
      setDailySummary(summaryData.nutrition_summary);
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
      setMessage('データの取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, filterMealsByDate]);

  // 日付変更時に日次サマリーだけ更新し、リストは既存データからフィルタ
  useEffect(() => {
    const updateDateView = async () => {
      try {
        const summaryData = await mealApi.getDailySummary(selectedDate);
        setDailySummary(summaryData.nutrition_summary);
        // allMealsが既にロードされていればそこからフィルタ
        if (allMeals.length > 0) {
            filterMealsByDate(allMeals, selectedDate);
        } else {
            // 初回ロードなどの場合
            const mealsData = await mealApi.getMeals();
            setAllMeals(mealsData);
            filterMealsByDate(mealsData, selectedDate);
        }
      } catch (error) {
        console.error('Failed to update daily view', error);
      }
    };
    
    // データ未取得なら全取得、取得済みなら日付変更対応
    if (allMeals.length === 0) {
        fetchData();
    } else {
        updateDateView();
    }
  }, [selectedDate, fetchData]); // allMealsを依存に入れるとループする恐れがあるため注意

  // 初回ロード（weightsなどは日付変更の影響を受けないため分離してもよいが簡略化）
  useEffect(() => {
    const loadWeights = async () => {
        try {
            const data = await weightApi.getWeights();
            setWeights(data);
        } catch(e) { console.error(e) }
    };
    loadWeights();
  }, []);


  // --- アクションハンドラ ---

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
  };

  const showMessage = (msg, type = 'success') => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleMealCreated = (newMeal) => {
    const updatedAllMeals = [newMeal, ...allMeals].sort((a, b) => new Date(b.record_date) - new Date(a.record_date));
    setAllMeals(updatedAllMeals);
    
    if (newMeal.record_date === selectedDate) {
      filterMealsByDate(updatedAllMeals, selectedDate);
      // サマリー再取得
      mealApi.getDailySummary(selectedDate).then(data => setDailySummary(data.nutrition_summary));
    }
  };

  const handleMealDelete = async (mealId) => {
    try {
      await mealApi.deleteMeal(mealId);
      const updatedAllMeals = allMeals.filter(meal => meal.id !== mealId);
      setAllMeals(updatedAllMeals);
      filterMealsByDate(updatedAllMeals, selectedDate);
      // サマリー再取得
      mealApi.getDailySummary(selectedDate).then(data => setDailySummary(data.nutrition_summary));
      showMessage('記録を削除しました。');
    } catch (error) {
      console.error('Failed to delete meal', error);
      showMessage('記録の削除に失敗しました。', 'error');
    }
  };

  const handleMealUpdated = (updatedMeal) => {
    const updatedAllMeals = allMeals.map(meal => (meal.id === updatedMeal.id ? updatedMeal : meal));
    setAllMeals(updatedAllMeals);
    filterMealsByDate(updatedAllMeals, selectedDate);
    // サマリー再取得
    mealApi.getDailySummary(selectedDate).then(data => setDailySummary(data.nutrition_summary));
  };

  const handleWeightCreated = (newWeight) => {
    setWeights(prevWeights => {
      const existingIndex = prevWeights.findIndex(w => w.id === newWeight.id);
      if (existingIndex !== -1) {
        const updatedWeights = [...prevWeights];
        updatedWeights[existingIndex] = newWeight;
        return updatedWeights.sort((a, b) => new Date(b.record_date) - new Date(a.record_date));
      } else {
        return [newWeight, ...prevWeights].sort((a, b) => new Date(b.record_date) - new Date(a.record_date));
      }
    });
  };

  return {
    data: { meals, allMeals, weights, dailySummary, selectedDate, message, loading },
    actions: { 
      handleDateChange, 
      handleMealCreated, 
      handleMealDelete, 
      handleMealUpdated, 
      handleWeightCreated,
      setMessage 
    }
  };
};