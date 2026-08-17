import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { MealRecordItem } from "@/types";

vi.mock("@/features/customFoods/api/customFoodApi", () => ({
  customFoodApi: {
    createCustomFood: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { useSaveItemAsCustomFood } from "@/features/customFoods/hooks/useSaveItemAsCustomFood";
import { customFoodApi } from "@/features/customFoods/api/customFoodApi";
import { toast } from "sonner";

const baseItem: MealRecordItem = {
  id: 1,
  item_type: "standard",
  item_id: 10,
  item_name: "白米",
  amount_grams: 200,
  display_order: 1,
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
};

describe("useSaveItemAsCustomFood", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("amount_grams ぶんの実数値を100gあたりへ換算して保存する", async () => {
    const createdFood = { id: 3, name: "白米" };
    vi.mocked(customFoodApi.createCustomFood).mockResolvedValue(createdFood as never);

    const { result } = renderHook(() => useSaveItemAsCustomFood());

    let returned;
    await act(async () => {
      returned = await result.current.saveItemAsCustomFood(baseItem, "白米");
    });

    expect(customFoodApi.createCustomFood).toHaveBeenCalledWith({
      name: "白米",
      calories_per_100g: 168,
      protein_per_100g: 2.5,
      fat_per_100g: 0.3,
      carbs_per_100g: 37.1,
      fiber_per_100g: 0.3,
      sodium_per_100g: 0,
      calcium_per_100g: 0,
      iron_per_100g: 0,
      vitamin_a_per_100g: 0,
      vitamin_b1_per_100g: 0,
      vitamin_b2_per_100g: 0,
      vitamin_c_per_100g: 0,
    });
    expect(returned).toEqual(createdFood);
    expect(toast.success).toHaveBeenCalled();
  });

  it("amount_grams が0のときは0割りせず0で埋める", async () => {
    vi.mocked(customFoodApi.createCustomFood).mockResolvedValue({ id: 1, name: "空" } as never);
    const { result } = renderHook(() => useSaveItemAsCustomFood());

    await act(async () => {
      await result.current.saveItemAsCustomFood({ ...baseItem, amount_grams: 0 }, "空");
    });

    expect(customFoodApi.createCustomFood).toHaveBeenCalledWith(
      expect.objectContaining({ calories_per_100g: 0, carbs_per_100g: 0 })
    );
  });

  it("重複名(400)のときは専用メッセージを出し null を返す", async () => {
    const axiosError = {
      isAxiosError: true,
      response: { status: 400 },
    };
    vi.mocked(customFoodApi.createCustomFood).mockRejectedValue(axiosError);

    const { result } = renderHook(() => useSaveItemAsCustomFood());

    let returned;
    await act(async () => {
      returned = await result.current.saveItemAsCustomFood(baseItem, "白米");
    });

    expect(returned).toBeNull();
    expect(toast.error).toHaveBeenCalledWith("この名前のMyアイテムは既に登録されています");
  });

  it("それ以外のエラーは汎用メッセージを出す", async () => {
    vi.mocked(customFoodApi.createCustomFood).mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useSaveItemAsCustomFood());

    let returned;
    await act(async () => {
      returned = await result.current.saveItemAsCustomFood(baseItem, "白米");
    });

    expect(returned).toBeNull();
    expect(toast.error).toHaveBeenCalledWith("Myアイテムの保存に失敗しました");
  });
});
