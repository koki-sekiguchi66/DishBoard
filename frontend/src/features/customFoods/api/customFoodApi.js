import { apiClient } from '@/lib/axios';

export const customFoodApi = {
  getCustomFoods: async () => {
    // 既にmealApiにも同様の処理があるが、専用APIとして保持する場合
    const response = await apiClient.get('/foods/custom/');
    return response.data;
  },

  createCustomFood: async (data) => {
    // POST /foods/custom/
    const response = await apiClient.post('/foods/custom/', data);
    return response.data;
  },

  updateCustomFood: async (id, data) => {
    // PUT /foods/custom/<id>/
    const response = await apiClient.put(`/foods/custom/${id}/`, data);
    return response.data;
  },

  deleteCustomFood: async (id) => {
    // DELETE /foods/custom/<id>/delete/ (urls.pyの設定に基づく)
    await apiClient.delete(`/foods/custom/${id}/delete/`);
  }
};