import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createMockMeal } from "@/test/helpers";

vi.mock("@/features/meals/api/mealApi", () => ({
  mealApi: {
    getMealDetail: vi.fn(),
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

import { useSaveMealAsMenu } from "@/features/customMenus/hooks/useSaveMealAsMenu";
import { mealApi } from "@/features/meals/api/mealApi";
import { customMenuApi } from "@/features/customMenus/api/customMenuApi";
import { toast } from "sonner";

describe("useSaveMealAsMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("明細を取得し display_order を振り直して Myメニューを作成する", async () => {
    const meal = createMockMeal({
      items: [
        {
          id: 1,
          item_type: "standard",
          item_id: 10,
          item_name: "白米",
          amount_grams: 200,
          display_order: 5,
          calories: 336,
          protein: 5,
          fat: 0.6,
          carbohydrates: 74.2,
          dietary_fiber: 0.6,
          sodium: 0,
          calcium: 0,
          iron: 0,
          vitamin_a: 0,
          vitamin_b1: 0,
          vitamin_b2: 0,
          vitamin_c: 0,
        },
      ],
    });
    vi.mocked(mealApi.getMealDetail).mockResolvedValue(meal);
    const createdMenu = { id: 9, name: "いつもの朝食" };
    vi.mocked(customMenuApi.createMenu).mockResolvedValue(createdMenu as never);

    const { result } = renderHook(() => useSaveMealAsMenu());

    let returned;
    await act(async () => {
      returned = await result.current.saveMealAsMenu(meal.id, "いつもの朝食", "説明");
    });

    expect(mealApi.getMealDetail).toHaveBeenCalledWith(meal.id);
    expect(customMenuApi.createMenu).toHaveBeenCalledWith({
      name: "いつもの朝食",
      description: "説明",
      items: [
        expect.objectContaining({
          item_type: "standard",
          item_id: 10,
          item_name: "白米",
          amount_grams: 200,
          display_order: 1,
          carbohydrates: 74.2,
        }),
      ],
    });
    expect(returned).toEqual(createdMenu);
    expect(toast.success).toHaveBeenCalled();
  });

  it("明細が空なら作成せずエラーを通知する", async () => {
    const meal = createMockMeal({ items: [] });
    vi.mocked(mealApi.getMealDetail).mockResolvedValue(meal);

    const { result } = renderHook(() => useSaveMealAsMenu());

    let returned;
    await act(async () => {
      returned = await result.current.saveMealAsMenu(meal.id, "空のメニュー");
    });

    expect(customMenuApi.createMenu).not.toHaveBeenCalled();
    expect(returned).toBeNull();
    expect(toast.error).toHaveBeenCalledWith(
      "この記録には明細がないため、Myメニューとして保存できません"
    );
  });

  it("API失敗時はエラーを通知し null を返す", async () => {
    const meal = createMockMeal();
    vi.mocked(mealApi.getMealDetail).mockRejectedValue(new Error("network"));

    const { result } = renderHook(() => useSaveMealAsMenu());

    let returned;
    await act(async () => {
      returned = await result.current.saveMealAsMenu(meal.id, "失敗するメニュー");
    });

    expect(returned).toBeNull();
    expect(toast.error).toHaveBeenCalledWith("Myメニューの保存に失敗しました");
  });
});
