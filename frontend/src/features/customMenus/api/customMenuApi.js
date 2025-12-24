import { apiClient } from '@/lib/axios';

/**
 * カスタムメニューAPI クライアント
 * 
 * 設計原則:
 * - RESTful APIとの通信を抽象化
 * - エラーハンドリングは呼び出し側で実施
 * - async/awaitでPromiseベースの実装
 */
export const customMenuApi = {
  /**
   * カスタムメニュー一覧取得
   * @returns {Promise<Array>} カスタムメニュー一覧
   */
  getMenus: async () => {
    const response = await apiClient.get('/custom-menus/');
    return response.data;
  },

  /**
   * カスタムメニュー詳細取得
   * @param {number} menuId - メニューID
   * @returns {Promise<Object>} カスタムメニュー詳細（items含む）
   */
  getMenuDetail: async (menuId) => {
    const response = await apiClient.get(`/custom-menus/${menuId}/`);
    return response.data;
  },

  /**
   * カスタムメニュー作成
   * @param {Object} menuData - メニューデータ
   * @param {string} menuData.name - メニュー名
   * @param {string} menuData.description - 説明（任意）
   * @param {Array} menuData.items - アイテム配列
   * @returns {Promise<Object>} 作成されたカスタムメニュー
   */
  createMenu: async (menuData) => {
    const response = await apiClient.post('/custom-menus/', menuData);
    return response.data;
  },

  /**
   * カスタムメニュー更新
   * @param {number} menuId - メニューID
   * @param {Object} menuData - 更新するメニューデータ
   * @returns {Promise<Object>} 更新されたカスタムメニュー
   */
  updateMenu: async (menuId, menuData) => {
    const response = await apiClient.put(`/custom-menus/${menuId}/`, menuData);
    return response.data;
  },

  /**
   * カスタムメニュー削除
   * @param {number} menuId - メニューID
   * @returns {Promise<void>}
   */
  deleteMenu: async (menuId) => {
    await apiClient.delete(`/custom-menus/${menuId}/`);
  },

  /**
   * メニューから食事記録を作成
   * @param {number} menuId - メニューID
   * @param {Object} data - 食事記録データ
   * @param {string} data.record_date - 記録日
   * @param {string} data.meal_timing - 食事タイミング
   * @param {number} data.multiplier - 倍率（デフォルト: 1.0）
   * @returns {Promise<Object>} 作成された食事記録
   */
  createMealFromMenu: async (menuId, data) => {
    const response = await apiClient.post(
      `/custom-menus/${menuId}/create_meal_from_menu/`,
      data
    );
    return response.data;
  },

  /**
   * カスタムメニュー検索
   * @param {string} query - 検索キーワード
   * @returns {Promise<Array>} 検索結果
   */
  searchMenus: async (query) => {
    const response = await apiClient.get('/custom-menus/search/', {
      params: { q: query }
    });
    return response.data;
  },
};