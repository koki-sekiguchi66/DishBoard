import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/axios', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { customFoodApi } from '@/features/customFoods/api/customFoodApi';
import { apiClient } from '@/lib/axios';

describe('customFoodApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCustomFoods', () => {
    it('Myアイテム一覧を取得できること', async () => {
      const mockFoods = [{ id: 1, name: '自作プロテインバー' }];
      (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockFoods });

      const result = await customFoodApi.getCustomFoods();

      expect(apiClient.get).toHaveBeenCalledWith('/foods/custom/');
      expect(result).toEqual(mockFoods);
    });
  });

  describe('createCustomFood', () => {
    it('Myアイテムを作成', async () => {
      const newFood = { name: '新食品', calories_per_100g: 200 };
      (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: 10, ...newFood } });

      const result = await customFoodApi.createCustomFood(newFood);

      expect(apiClient.post).toHaveBeenCalledWith('/foods/custom/', newFood);
      expect(result.id).toBe(10);
    });
  });

  describe('updateCustomFood', () => {
    it('指定IDのMyアイテムを更新', async () => {
      const updated = { id: 5, name: '更新食品' };
      (apiClient.put as ReturnType<typeof vi.fn>).mockResolvedValue({ data: updated });

      const result = await customFoodApi.updateCustomFood(5, { name: '更新食品' });

      expect(apiClient.put).toHaveBeenCalledWith('/foods/custom/5/', { name: '更新食品' });
      expect(result.name).toBe('更新食品');
    });
  });

  describe('deleteCustomFood', () => {
    it('指定IDのMyアイテムを削除（ViewSet標準DELETEエンドポイント）', async () => {
      (apiClient.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await customFoodApi.deleteCustomFood(5);

      // 旧: /foods/custom/5/delete/ → 新: /foods/custom/5/ (ViewSet.destroy)
      expect(apiClient.delete).toHaveBeenCalledWith('/foods/custom/5/');
    });
  });

  describe('エラーハンドリング', () => {
    it('ネットワークエラー時', async () => {
      (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network Error'));

      await expect(customFoodApi.getCustomFoods()).rejects.toThrow('Network Error');
    });

    it('バリデーションエラー時', async () => {
      const error = Object.assign(new Error('Bad Request'), {
        response: { status: 400, data: { name: ['この食品名は既に存在します。'] } },
      });
      (apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      await expect(customFoodApi.createCustomFood({ name: '' })).rejects.toThrow('Bad Request');
    });
  });
});
