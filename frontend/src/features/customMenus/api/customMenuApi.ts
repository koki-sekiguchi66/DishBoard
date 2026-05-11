import { apiClient } from "@/lib/axios";
import type { CustomMenu, MealRecord } from "@/types";

interface CreateMenuRequest {
  name: string;
  description?: string;
  items: Array<{
    item_type: string;
    item_id: number;
    item_name: string;
    amount_grams: number;
    display_order: number;
    calories: number;
    protein: number;
    fat: number;
    carbohydrates: number;
    dietary_fiber?: number;
    sodium?: number;
    calcium?: number;
    iron?: number;
    vitamin_a?: number;
    vitamin_b1?: number;
    vitamin_b2?: number;
    vitamin_c?: number;
  }>;
}

interface CreateMealFromMenuRequest {
  record_date: string;
  meal_timing: string;
  multiplier?: number;
}

export const customMenuApi = {
  getMenus: async (): Promise<CustomMenu[]> => {
    const response = await apiClient.get("/custom-menus/");
    return response.data;
  },

  getMenuDetail: async (menuId: number): Promise<CustomMenu> => {
    const response = await apiClient.get(`/custom-menus/${menuId}/`);
    return response.data;
  },

  createMenu: async (menuData: CreateMenuRequest): Promise<CustomMenu> => {
    const response = await apiClient.post("/custom-menus/", menuData);
    return response.data;
  },

  updateMenu: async (
    menuId: number,
    menuData: Partial<CreateMenuRequest>
  ): Promise<CustomMenu> => {
    const response = await apiClient.put(`/custom-menus/${menuId}/`, menuData);
    return response.data;
  },

  deleteMenu: async (menuId: number): Promise<void> => {
    await apiClient.delete(`/custom-menus/${menuId}/`);
  },

  createMealFromMenu: async (
    menuId: number,
    data: CreateMealFromMenuRequest
  ): Promise<MealRecord> => {
    const response = await apiClient.post(
      `/custom-menus/${menuId}/create_meal_from_menu/`,
      data
    );
    return response.data;
  },

  searchMenus: async (query: string): Promise<CustomMenu[]> => {
    const response = await apiClient.get("/custom-menus/search/", {
      params: { q: query },
    });
    return response.data;
  },
};
