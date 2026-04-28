/**
 * カスタム食品（Myアイテム）API（TypeScript版）
 *
 * Phase 3: JS→TS移行。型定義追加のみ、ロジック変更なし。
 */
import { apiClient } from "@/lib/axios";
import type { CustomFood } from "@/types";

export const customFoodApi = {
  getCustomFoods: async (): Promise<CustomFood[]> => {
    const response = await apiClient.get("/foods/custom/");
    return response.data;
  },

  createCustomFood: async (data: Partial<CustomFood>): Promise<CustomFood> => {
    const response = await apiClient.post("/foods/custom/", data);
    return response.data;
  },

  updateCustomFood: async (
    id: number,
    data: Partial<CustomFood>
  ): Promise<CustomFood> => {
    const response = await apiClient.put(`/foods/custom/${id}/`, data);
    return response.data;
  },

  deleteCustomFood: async (id: number): Promise<void> => {
    await apiClient.delete(`/foods/custom/${id}/`);
  },
};
