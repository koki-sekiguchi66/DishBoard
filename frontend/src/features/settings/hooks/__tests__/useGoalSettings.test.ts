/**
 * useGoalSettings フックのテスト
 *
 * TDD アプローチ: このテストが通るように useGoalSettings.ts を実装する。
 *
 * 検証項目:
 *   - 初期化: localStorage の状態に応じた初期値（空 / 正常値 / 破損データ）
 *   - 永続化: updateGoals 呼び出しで state と localStorage が同期更新
 *   - 防御性: localStorage I/O 失敗時に例外を握り潰す
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGoalSettings } from "../useGoalSettings";
import {
  DEFAULT_GOALS,
  STORAGE_KEY_GOALS,
  type NutritionGoals,
} from "@/types/settings";

describe("useGoalSettings フック", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("初期化", () => {
    it("localStorage が空の場合 DEFAULT_GOALS を返す", () => {
      const { result } = renderHook(() => useGoalSettings());

      expect(result.current.goals).toEqual(DEFAULT_GOALS);
    });

    it("localStorage に正常な JSON があればそれを返す", () => {
      const stored: NutritionGoals = {
        calories: 1800,
        protein: 90,
        fat: 50,
        carbs: 247,
      };
      localStorage.setItem(STORAGE_KEY_GOALS, JSON.stringify(stored));

      const { result } = renderHook(() => useGoalSettings());

      expect(result.current.goals).toEqual(stored);
    });

    it("localStorage が破損している場合 DEFAULT_GOALS にフォールバック", () => {
      localStorage.setItem(STORAGE_KEY_GOALS, "{invalid json");

      const { result } = renderHook(() => useGoalSettings());

      expect(result.current.goals).toEqual(DEFAULT_GOALS);
    });

    it("一部のキーが欠損している場合は欠損部分のみ DEFAULT を使用", () => {
      // calories と protein のみ保存、fat/carbs は欠損
      localStorage.setItem(
        STORAGE_KEY_GOALS,
        JSON.stringify({ calories: 1800, protein: 90 })
      );

      const { result } = renderHook(() => useGoalSettings());

      expect(result.current.goals.calories).toBe(1800);
      expect(result.current.goals.protein).toBe(90);
      expect(result.current.goals.fat).toBe(DEFAULT_GOALS.fat);
      expect(result.current.goals.carbs).toBe(DEFAULT_GOALS.carbs);
    });

    it("型が不正な値は DEFAULT にフォールバック", () => {
      // calories が文字列、その他は正常
      localStorage.setItem(
        STORAGE_KEY_GOALS,
        JSON.stringify({
          calories: "not a number",
          protein: 90,
          fat: 50,
          carbs: 247,
        })
      );

      const { result } = renderHook(() => useGoalSettings());

      expect(result.current.goals.calories).toBe(DEFAULT_GOALS.calories);
      expect(result.current.goals.protein).toBe(90);
    });
  });

  describe("updateGoals", () => {
    it("呼び出しで state が更新される", () => {
      const { result } = renderHook(() => useGoalSettings());

      const newGoals: NutritionGoals = {
        calories: 2200,
        protein: 110,
        fat: 61,
        carbs: 303,
      };

      act(() => {
        result.current.updateGoals(newGoals);
      });

      expect(result.current.goals).toEqual(newGoals);
    });

    it("呼び出しで localStorage に正しい JSON が保存される", () => {
      const { result } = renderHook(() => useGoalSettings());

      const newGoals: NutritionGoals = {
        calories: 2200,
        protein: 110,
        fat: 61,
        carbs: 303,
      };

      act(() => {
        result.current.updateGoals(newGoals);
      });

      const raw = localStorage.getItem(STORAGE_KEY_GOALS);
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw!)).toEqual(newGoals);
    });

    it("localStorage.setItem が throw しても state は更新される", () => {
      const { result } = renderHook(() => useGoalSettings());

      const setItemSpy = vi
        .spyOn(Storage.prototype, "setItem")
        .mockImplementation(() => {
          throw new Error("QuotaExceededError");
        });

      const newGoals: NutritionGoals = {
        calories: 2200,
        protein: 110,
        fat: 61,
        carbs: 303,
      };

      // エラーは握り潰される（throw しない）
      expect(() => {
        act(() => {
          result.current.updateGoals(newGoals);
        });
      }).not.toThrow();

      // state 自体は更新される
      expect(result.current.goals).toEqual(newGoals);

      setItemSpy.mockRestore();
    });
  });
});
