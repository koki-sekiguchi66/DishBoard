import { apiClient } from '@/lib/axios';

export const weightApi = {
  // 体重記録の取得
  getWeights: async () => {
    const response = await apiClient.get('/weights/');
    return response.data;
  },

  // 体重記録の作成
  createWeight: async (weightData) => {
    const response = await apiClient.post('/weights/', weightData);
    return response.data;
  },

  // 体重記録の更新
  updateWeight: async (weightId, weightData) => {
    const response = await apiClient.put(`/weights/${weightId}/`, weightData);
    return response.data;
  },

  // 体重記録の削除
  deleteWeight: async (weightId) => {
    await apiClient.delete(`/weights/${weightId}/`);
  }
};