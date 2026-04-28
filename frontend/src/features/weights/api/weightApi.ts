/**
 * 体重記録API クライアント（TypeScript版）
 *
 * Phase 3: JS→TS移行。型定義追加のみ、ロジック変更なし。
 */
import { apiClient } from "@/lib/axios";
import type { WeightRecord, CreateWeightRequest, UpdateWeightRequest } from "@/types";

export const weightApi = {
  getWeights: async (): Promise<WeightRecord[]> => {
    const response = await apiClient.get("/weights/");
    return response.data;
  },

  createWeight: async (weightData: CreateWeightRequest): Promise<WeightRecord> => {
    const response = await apiClient.post("/weights/", weightData);
    const data = response.data;
    return { ...data, weight: parseFloat(data.weight) };
  },

  updateWeight: async (
    weightId: number,
    weightData: UpdateWeightRequest
  ): Promise<WeightRecord> => {
    const response = await apiClient.put(`/weights/${weightId}/`, weightData);
    return response.data;
  },

  deleteWeight: async (weightId: number): Promise<void> => {
    await apiClient.delete(`/weights/${weightId}/`);
  },
};
