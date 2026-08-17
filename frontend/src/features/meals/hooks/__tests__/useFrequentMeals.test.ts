import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFrequentMeals } from "../useFrequentMeals";
import { createMockMeal } from "@/test/helpers";

describe("useFrequentMeals", () => {
  it("2回以上記録した名前だけをタイミングごとに頻度順で返す", () => {
    const allMeals = [
      createMockMeal({ id: 1, meal_timing: "breakfast", meal_name: "白米", record_date: "2025-01-01" }),
      createMockMeal({ id: 2, meal_timing: "breakfast", meal_name: "白米", record_date: "2025-01-03" }),
      createMockMeal({ id: 3, meal_timing: "breakfast", meal_name: "パン", record_date: "2025-01-02" }),
      createMockMeal({ id: 4, meal_timing: "breakfast", meal_name: "パン", record_date: "2025-01-05" }),
      createMockMeal({ id: 5, meal_timing: "breakfast", meal_name: "サラダ", record_date: "2025-01-04" }),
      createMockMeal({ id: 6, meal_timing: "lunch", meal_name: "カレー", record_date: "2025-01-01" }),
      createMockMeal({ id: 7, meal_timing: "lunch", meal_name: "カレー", record_date: "2025-01-02" }),
      createMockMeal({ id: 8, meal_timing: "lunch", meal_name: "カレー", record_date: "2025-01-03" }),
    ];

    const { result } = renderHook(() => useFrequentMeals(allMeals, "2025-01-10"));

    // 白米・パンは2回、サラダは1回のみなので候補から外れる
    expect(result.current.breakfast.map((m) => m.meal_name)).toEqual(["白米", "パン"]);
    // カレーは3回で最多。返るのは最新（id=8, 2025-01-03）
    expect(result.current.lunch).toHaveLength(1);
    expect(result.current.lunch[0].id).toBe(8);
  });

  it("最新の1件（最新の record_date）を候補として返す", () => {
    const allMeals = [
      createMockMeal({ id: 1, meal_timing: "dinner", meal_name: "鍋", record_date: "2025-01-01", calories: 400 }),
      createMockMeal({ id: 2, meal_timing: "dinner", meal_name: "鍋", record_date: "2025-01-10", calories: 500 }),
    ];

    const { result } = renderHook(() => useFrequentMeals(allMeals, "2025-02-01"));

    expect(result.current.dinner).toHaveLength(1);
    expect(result.current.dinner[0].id).toBe(2);
    expect(result.current.dinner[0].calories).toBe(500);
  });

  it("選択中の日にすでに記録済みの名前は候補から外す", () => {
    const allMeals = [
      createMockMeal({ id: 1, meal_timing: "snack", meal_name: "チョコ", record_date: "2025-01-01" }),
      createMockMeal({ id: 2, meal_timing: "snack", meal_name: "チョコ", record_date: "2025-01-02" }),
      createMockMeal({ id: 3, meal_timing: "snack", meal_name: "チョコ", record_date: "2025-01-05" }),
    ];

    const { result } = renderHook(() => useFrequentMeals(allMeals, "2025-01-05"));

    expect(result.current.snack).toEqual([]);
  });

  it("記録が無いタイミングは空配列を返す", () => {
    const { result } = renderHook(() => useFrequentMeals([], "2025-01-01"));

    expect(result.current.breakfast).toEqual([]);
    expect(result.current.lunch).toEqual([]);
    expect(result.current.dinner).toEqual([]);
    expect(result.current.snack).toEqual([]);
  });
});
