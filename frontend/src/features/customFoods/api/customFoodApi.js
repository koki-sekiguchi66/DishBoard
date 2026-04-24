import { apiClient } from '@/lib/axios';

/**
 * カスタム食品（Myアイテム）API
 *
 * バックエンドは CustomFoodViewSet（ModelViewSet）で CRUD を一元管理。
 * エンドポイント: /api/foods/custom/
 *
 * 変更: deleteCustomFood のパスを ViewSet 標準の DELETE /<id>/ に統一
 *       （旧: /<id>/delete/ は関数ベースView向けで削除済み）
 */
export const customFoodApi = {
  getCustomFoods: async () => {
    const response = await apiClient.get('/foods/custom/');
    return response.data;
  },

  createCustomFood: async (data) => {
    const response = await apiClient.post('/foods/custom/', data);
    return response.data;
  },

  updateCustomFood: async (id, data) => {
    const response = await apiClient.put(`/foods/custom/${id}/`, data);
    return response.data;
  },

  deleteCustomFood: async (id) => {
    // ViewSet 標準の destroy アクション（DELETE /foods/custom/<id>/）
    await apiClient.delete(`/foods/custom/${id}/`);
  },
};
