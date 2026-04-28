/**
 * 食事記録API クライアント（TypeScript版）
 *
 * Phase 3: JS→TS移行。型定義追加のみ、ロジック変更なし。
 */
import { apiClient } from "@/lib/axios";
import type {
  MealRecord,
  CreateMealRequest,
  DailySummaryResponse,
} from "@/types";
import type { FoodSearchResponse, NutritionCalcResponse } from "@/types";

export const mealApi = {
  getMeals: async (params: Record<string, string> = {}): Promise<MealRecord[]> => {
    const response = await apiClient.get("/meal-records/", { params });
    return response.data;
  },

  getMealDetail: async (mealId: number): Promise<MealRecord> => {
    const response = await apiClient.get(`/meal-records/${mealId}/`);
    return response.data;
  },

  createMeal: async (mealData: CreateMealRequest): Promise<MealRecord> => {
    const response = await apiClient.post("/meal-records/", mealData);
    return response.data;
  },

  updateMeal: async (
    mealId: number,
    mealData: Partial<MealRecord>
  ): Promise<MealRecord> => {
    const response = await apiClient.put(`/meal-records/${mealId}/`, mealData);
    return response.data;
  },

  deleteMeal: async (mealId: number): Promise<void> => {
    await apiClient.delete(`/meal-records/${mealId}/`);
  },

  searchFoods: async (query: string): Promise<FoodSearchResponse> => {
    const response = await apiClient.get("/foods/search/", {
      params: { q: query },
    });
    return response.data;
  },

  calculateNutrition: async (
    foodId: number | string,
    amount: number
  ): Promise<NutritionCalcResponse> => {
    const response = await apiClient.post("/foods/calculate/", {
      food_id: foodId,
      amount,
    });
    return response.data;
  },

  getFoodSuggestions: async (
    query: string
  ): Promise<{ suggestions: string[] }> => {
    const response = await apiClient.get("/foods/suggestions/", {
      params: { q: query },
    });
    return response.data;
  },

  getCustomFoods: async (): Promise<unknown[]> => {
    const response = await apiClient.get("/foods/custom");
    return response.data;
  },

  getCafeteriaMenus: async (category?: string): Promise<unknown[]> => {
    const params = category ? { category } : {};
    const response = await apiClient.get("/cafeteria/list/", { params });
    return response.data;
  },

  getMealTimings: async (): Promise<unknown[]> => {
    const response = await apiClient.get("/meal-timings/");
    return response.data;
  },

  getDailySummary: async (date: string): Promise<DailySummaryResponse> => {
    const response = await apiClient.get("/nutrition/daily-summary/", {
      params: { date },
    });
    return response.data;
  },
};

export default mealApi;
