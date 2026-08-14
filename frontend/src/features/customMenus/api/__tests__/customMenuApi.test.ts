import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockCustomMenu } from '@/test/helpers';

vi.mock('@/lib/axios', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { customMenuApi } from '@/features/customMenus/api/customMenuApi';
import { apiClient } from '@/lib/axios';

describe('customMenuApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMenus', () => {
    it('Myメニュー一覧を取得', async () => {
      const mockMenus = [createMockCustomMenu()];
      (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockMenus });

      const result = await customMenuApi.getMenus();

      expect(apiClient.get).toHaveBeenCalledWith('/custom-menus/');
      expect(result).toHaveLength(1);
    });
  });

  describe('getMenuDetail', () => {
    it('指定IDのメニュー詳細を取得', async () => {
      const mockMenu = createMockCustomMenu({ id: 5 });
      (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockMenu });

      const result = await customMenuApi.getMenuDetail(5);

      expect(apiClient.get).toHaveBeenCalledWith('/custom-menus/5/');
      expect(result.id).toBe(5);
      expect(result.items).toHaveLength(2);
    });
  });

  describe('createMenu', () => {
    it('Myメニューを作成', async () => {
      const newMenu = { name: '新メニュー', description: '', items: [] };
      const created = createMockCustomMenu({ ...newMenu, id: 10 });
      (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: created });

      const result = await customMenuApi.createMenu(newMenu);

      expect(apiClient.post).toHaveBeenCalledWith('/custom-menus/', newMenu);
      expect(result.id).toBe(10);
    });
  });

  describe('updateMenu', () => {
    it('指定IDのメニューを更新', async () => {
      const updated = createMockCustomMenu({ id: 1, name: '更新メニュー' });
      (apiClient.put as ReturnType<typeof vi.fn>).mockResolvedValue({ data: updated });

      const result = await customMenuApi.updateMenu(1, { name: '更新メニュー' });

      expect(apiClient.put).toHaveBeenCalledWith('/custom-menus/1/', { name: '更新メニュー' });
      expect(result.name).toBe('更新メニュー');
    });
  });

  describe('deleteMenu', () => {
    it('指定IDのメニューを削除', async () => {
      (apiClient.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await customMenuApi.deleteMenu(1);

      expect(apiClient.delete).toHaveBeenCalledWith('/custom-menus/1/');
    });
  });

  describe('エラーハンドリング', () => {
    it('APIエラー時にPromiseがreject', async () => {
      (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network Error'));

      await expect(customMenuApi.getMenus()).rejects.toThrow('Network Error');
    });
  });
});
