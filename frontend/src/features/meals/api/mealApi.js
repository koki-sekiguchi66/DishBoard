import { apiClient } from '@/lib/axios';

/**
 * 食事記録API クライアント
 */
export const mealApi = {

  getMeals: async (params = {}) => {
    const response = await apiClient.get('/meal-records/', { params });
    return response.data;
  },

  getMealDetail: async (mealId) => {
    const response = await apiClient.get(`/meal-records/${mealId}/`);
    return response.data;
  },

  createMeal: async (mealData) => {
    const response = await apiClient.post('/meal-records/', mealData);
    return response.data;
  },

  updateMeal: async (mealId, mealData) => {
    const response = await apiClient.put(`/meal-records/${mealId}/`, mealData);
    return response.data;
  },

  deleteMeal: async (mealId) => {
    await apiClient.delete(`/meal-records/${mealId}/`);
  },

  // --- 食品検索・栄養計算 ---

  searchFoods: async (query) => {
    const response = await apiClient.get('/foods/search/', { params: { q: query } });
    return response.data;
  },

  calculateNutrition: async (foodId, amount) => {
    const response = await apiClient.post('/foods/calculate/', { 
      food_id: foodId, 
      amount: amount 
    });
    return response.data;
  },

  getFoodSuggestions: async (query) => {
    const response = await apiClient.get('/foods/suggestions/', { params: { q: query } });
    return response.data;
  },

  getCustomFoods: async () => {
    const response = await apiClient.get('/foods/custom');
    return response.data;
  },

  /**
   * 食堂メニュー一覧の取得
   * CafeteriaMenu.jsx で使用
   */
  getCafeteriaMenus: async (category) => {
    // カテゴリ指定があればクエリパラメータに追加
    const params = category ? { category } : {};
    const response = await apiClient.get('/cafeteria/list/', { params });
    return response.data;
  },

  /**
   * 食事タイミングの選択肢取得
   */
  getMealTimings: async () => {
    const response = await apiClient.get('/meal-timings/');
    return response.data;
  },

  /**
   * 日次サマリー取得
   */
  getDailySummary: async (date) => {
    const response = await apiClient.get('/nutrition/daily-summary/', { params: { date } });
    return response.data;
  }
};

export default mealApi;