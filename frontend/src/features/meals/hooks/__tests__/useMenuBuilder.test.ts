/**
 * useMenuBuilder テスト
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@/features/meals/api/mealApi", () => ({
  mealApi: {
    createMeal: vi.fn(),
  },
}));

vi.mock("@/features/customMenus/api/customMenuApi", () => ({
  customMenuApi: {
    createMenu: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { useMenuBuilder } from "@/features/meals/hooks/useMenuBuilder";
import { mealApi } from "@/features/meals/api/mealApi";
import { toast } from "sonner";

describe("useMenuBuilder フック", () => {
  const mockOnMealCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
  });

  it("初期状態", () => {
    const { result } = renderHook(() => useMenuBuilder(mockOnMealCreated));

    expect(result.current.menuItems).toEqual([]);
    expect(result.current.mealTiming).toBe("breakfast");
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.saveAsMenu).toBe(false);
  });

  describe("addMenuItem", () => {
    it("アイテムを追加", () => {
      const { result } = renderHook(() => useMenuBuilder(mockOnMealCreated));

      act(() => {
        result.current.addMenuItem({
          item_name: "白米",
          calories: 340,
          protein: 5,
          fat: 0.6,
          carbohydrates: 74,
        });
      });

      expect(result.current.menuItems).toHaveLength(1);
      expect(result.current.menuItems[0].item_name).toBe("白米");
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining("白米")
      );
    });

    it("複数アイテムを追加", () => {
      const { result } = renderHook(() => useMenuBuilder(mockOnMealCreated));

      act(() => {
        result.current.addMenuItem({ item_name: "白米", calories: 340 });
      });
      act(() => {
        result.current.addMenuItem({ item_name: "味噌汁", calories: 50 });
      });

      expect(result.current.menuItems).toHaveLength(2);
    });
  });

  describe("removeMenuItem", () => {
    it("アイテムを削除", () => {
      const { result } = renderHook(() => useMenuBuilder(mockOnMealCreated));

      act(() => {
        result.current.addMenuItem({ item_name: "白米", calories: 340 });
      });

      const tempId = result.current.menuItems[0].tempId;

      act(() => {
        result.current.removeMenuItem(tempId);
      });

      expect(result.current.menuItems).toHaveLength(0);
    });
  });

  describe("totalNutrition", () => {
    it("合計栄養素が正しく計算される", () => {
      const { result } = renderHook(() => useMenuBuilder(mockOnMealCreated));

      act(() => {
        result.current.addMenuItem({
          item_name: "白米",
          calories: 340,
          protein: 5,
          fat: 0.6,
          carbohydrates: 74,
        });
      });
      act(() => {
        result.current.addMenuItem({
          item_name: "味噌汁",
          calories: 50,
          protein: 3,
          fat: 1.5,
          carbohydrates: 5,
        });
      });

      expect(result.current.totalNutrition.calories).toBe(390);
      expect(result.current.totalNutrition.protein).toBe(8);
    });
  });

  describe("handleClearMenu", () => {
    it("メニューをクリア", () => {
      const { result } = renderHook(() => useMenuBuilder(mockOnMealCreated));

      act(() => {
        result.current.addMenuItem({ item_name: "白米", calories: 340 });
      });

      expect(result.current.menuItems).toHaveLength(1);

      act(() => {
        result.current.handleClearMenu();
      });

      expect(result.current.menuItems).toHaveLength(0);
    });
  });

  describe("handleSubmit", () => {
    it("アイテムなしでエラー", async () => {
      const { result } = renderHook(() => useMenuBuilder(mockOnMealCreated));

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(toast.error).toHaveBeenCalledWith("アイテムを追加してください");
      expect(mealApi.createMeal).not.toHaveBeenCalled();
    });

    it("正常に送信", async () => {
      const createdMeal = { id: 1, meal_name: "白米" };
      (mealApi.createMeal as ReturnType<typeof vi.fn>).mockResolvedValue(
        createdMeal
      );

      const { result } = renderHook(() => useMenuBuilder(mockOnMealCreated));

      act(() => {
        result.current.addMenuItem({
          item_name: "白米",
          calories: 340,
          protein: 5,
          fat: 0.6,
          carbohydrates: 74,
          amount_grams: 200,
        });
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(mealApi.createMeal).toHaveBeenCalled();
      expect(mockOnMealCreated).toHaveBeenCalledWith(createdMeal);
      expect(result.current.menuItems).toHaveLength(0);
    });
  });
});
