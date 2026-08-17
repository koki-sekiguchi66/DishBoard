import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createMockMeal } from "@/test/helpers";

vi.mock("@/features/meals/api/mealApi", () => ({
  mealApi: {
    getMealDetail: vi.fn(),
    createMeal: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { useQuickRepeat } from "@/features/meals/hooks/useQuickRepeat";
import { mealApi } from "@/features/meals/api/mealApi";
import { toast } from "sonner";

describe("useQuickRepeat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("詳細を取得し明細ごと指定日へ複製する", async () => {
    const pastMeal = createMockMeal({ id: 3, record_date: "2025-01-01" });
    const detail = createMockMeal({
      id: 3,
      meal_timing: "lunch",
      meal_name: "いつものカレー",
      items: [
        {
          id: 1,
          item_type: "standard",
          item_id: 10,
          item_name: "カレー",
          amount_grams: 300,
          display_order: 1,
          calories: 700,
          protein: 15,
          fat: 20,
          carbohydrates: 90,
          dietary_fiber: 3,
          sodium: 2,
          calcium: 50,
          iron: 2,
          vitamin_a: 100,
          vitamin_b1: 0.2,
          vitamin_b2: 0.1,
          vitamin_c: 10,
        },
      ],
    });
    vi.mocked(mealApi.getMealDetail).mockResolvedValue(detail);
    const createdMeal = { ...detail, id: 99, record_date: "2025-01-10" };
    vi.mocked(mealApi.createMeal).mockResolvedValue(createdMeal);

    const { result } = renderHook(() => useQuickRepeat());

    let returned;
    await act(async () => {
      returned = await result.current.repeatMeal(pastMeal, "2025-01-10");
    });

    expect(mealApi.getMealDetail).toHaveBeenCalledWith(3);
    expect(mealApi.createMeal).toHaveBeenCalledWith(
      expect.objectContaining({
        record_date: "2025-01-10",
        meal_timing: "lunch",
        meal_name: "いつものカレー",
        items: [expect.objectContaining({ item_name: "カレー", amount_grams: 300 })],
      })
    );
    expect(returned).toEqual(createdMeal);
    expect(toast.success).toHaveBeenCalled();
  });

  it("失敗時はエラーを通知し null を返す", async () => {
    const pastMeal = createMockMeal({ id: 3 });
    vi.mocked(mealApi.getMealDetail).mockRejectedValue(new Error("network"));

    const { result } = renderHook(() => useQuickRepeat());

    let returned;
    await act(async () => {
      returned = await result.current.repeatMeal(pastMeal, "2025-01-10");
    });

    expect(returned).toBeNull();
    expect(toast.error).toHaveBeenCalledWith("記録の再登録に失敗しました");
  });
});
