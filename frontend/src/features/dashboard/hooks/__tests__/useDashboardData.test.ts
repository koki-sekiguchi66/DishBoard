/**
 * useDashboardData テスト
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import {
  createMockMeal,
  createMockWeight,
  createMockDailySummary,
} from "@/test/helpers";

vi.mock("@/features/meals/api/mealApi", () => ({
  mealApi: {
    getMeals: vi.fn(),
    getDailySummary: vi.fn(),
    deleteMeal: vi.fn(),
  },
}));

vi.mock("@/features/weights/api/weightApi", () => ({
  weightApi: {
    getWeights: vi.fn(),
  },
}));

import { useDashboardData } from "@/features/dashboard/hooks/useDashboardData";
import { mealApi } from "@/features/meals/api/mealApi";
import { weightApi } from "@/features/weights/api/weightApi";

describe("useDashboardData フック", () => {
  const testDate = "2025-01-15";
  const mockMeals = [
    createMockMeal({ id: 1, record_date: testDate }),
    createMockMeal({ id: 2, record_date: testDate, meal_name: "朝食" }),
  ];
  const mockWeights = [createMockWeight()];
  const mockSummary = createMockDailySummary();

  beforeEach(() => {
    vi.clearAllMocks();
    (mealApi.getMeals as ReturnType<typeof vi.fn>).mockResolvedValue(mockMeals);
    (mealApi.getDailySummary as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockSummary
    );
    (weightApi.getWeights as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockWeights
    );
  });

  describe("初回データ取得", () => {
    it("マウント時にAPIからデータを取得", async () => {
      renderHook(() => useDashboardData(testDate));

      await waitFor(() => {
        expect(mealApi.getMeals).toHaveBeenCalled();
        expect(weightApi.getWeights).toHaveBeenCalled();
      });
    });

    it("取得したデータが正しく状態に反映", async () => {
      const { result } = renderHook(() => useDashboardData(testDate));

      await waitFor(() => {
        expect(result.current.data.allMeals).toHaveLength(2);
        expect(result.current.data.dailySummary).not.toBeNull();
        expect(result.current.data.dailySummary!.calories).toBe(1500);
      });
    });

    it("データ取得中はloading状態", () => {
      const { result } = renderHook(() => useDashboardData(testDate));

      expect(result.current.data.loading).toBe(true);
    });
  });

  describe("handleMealCreated", () => {
    it("新しい食事記録を状態に追加", async () => {
      const { result } = renderHook(() => useDashboardData(testDate));

      await waitFor(() => {
        expect(result.current.data.allMeals).toHaveLength(2);
      });

      const newMeal = createMockMeal({
        id: 99,
        record_date: testDate,
        meal_name: "新規",
      });
      (mealApi.getDailySummary as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockSummary
      );

      act(() => {
        result.current.actions.handleMealCreated(newMeal);
      });

      expect(result.current.data.allMeals).toHaveLength(3);
    });
  });

  describe("handleMealDelete", () => {
    it("指定IDの食事記録が状態から削除", async () => {
      (mealApi.deleteMeal as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const { result } = renderHook(() => useDashboardData(testDate));

      await waitFor(() => {
        expect(result.current.data.allMeals).toHaveLength(2);
      });

      (mealApi.getDailySummary as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockSummary
      );

      await act(async () => {
        await result.current.actions.handleMealDelete(1);
      });

      expect(result.current.data.allMeals).toHaveLength(1);
      expect(mealApi.deleteMeal).toHaveBeenCalledWith(1);
    });
  });

  describe("handleMealUpdated", () => {
    it("更新された食事記録が状態に反映", async () => {
      const { result } = renderHook(() => useDashboardData(testDate));

      await waitFor(() => {
        expect(result.current.data.allMeals).toHaveLength(2);
      });

      const updated = createMockMeal({
        id: 1,
        record_date: testDate,
        meal_name: "更新済み",
      });
      (mealApi.getDailySummary as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockSummary
      );

      act(() => {
        result.current.actions.handleMealUpdated(updated);
      });

      const updatedMeal = result.current.data.allMeals.find(
        (m) => m.id === 1
      );
      expect(updatedMeal!.meal_name).toBe("更新済み");
    });
  });

  describe("handleWeightCreated", () => {
    it("新規体重記録が追加", async () => {
      const { result } = renderHook(() => useDashboardData(testDate));

      await waitFor(() => {
        expect(result.current.data.weights).toHaveLength(1);
      });

      const newWeight = createMockWeight({ id: 99, weight: 70.0 });

      act(() => {
        result.current.actions.handleWeightCreated(newWeight);
      });

      expect(result.current.data.weights).toHaveLength(2);
    });

    it("同じIDの体重記録は更新", async () => {
      const { result } = renderHook(() => useDashboardData(testDate));

      await waitFor(() => {
        expect(result.current.data.weights).toHaveLength(1);
      });

      const updatedWeight = createMockWeight({ id: 1, weight: 68.0 });

      act(() => {
        result.current.actions.handleWeightCreated(updatedWeight);
      });

      expect(result.current.data.weights).toHaveLength(1);
      expect(result.current.data.weights[0].weight).toBe(68.0);
    });
  });

  describe("エラーハンドリング", () => {
    it("データ取得失敗時にエラーメッセージ表示", async () => {
      (mealApi.getMeals as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Network Error")
      );

      const { result } = renderHook(() => useDashboardData(testDate));

      await waitFor(() => {
        expect(result.current.data.message).toContain("失敗");
      });
    });

    it("食事削除失敗時にエラーメッセージ表示", async () => {
      (mealApi.deleteMeal as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Delete Error")
      );

      const { result } = renderHook(() => useDashboardData(testDate));

      await waitFor(() => {
        expect(result.current.data.allMeals).toHaveLength(2);
      });

      await act(async () => {
        await result.current.actions.handleMealDelete(1);
      });

      await waitFor(() => {
        expect(result.current.data.message).toContain("失敗");
      });
    });
  });
});
