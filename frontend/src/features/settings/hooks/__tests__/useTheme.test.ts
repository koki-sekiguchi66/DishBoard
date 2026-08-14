/**
 * useTheme テスト
 *
 * 検証項目:
 *   - 初期化: localStorage 空 → dark / "light" 保存済 → light / 不正値 → dark
 *   - setTheme: state + localStorage + classList 同期
 *   - toggle: dark ↔ light 切替
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTheme } from "../useTheme";

describe("useTheme フック", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // classList をリセット
    document.documentElement.classList.remove("light");
  });

  describe("初期化", () => {
    it("localStorage が空の場合 dark を返す", () => {
      const { result } = renderHook(() => useTheme());
      expect(result.current.theme).toBe("dark");
    });

    it('localStorage に "light" がある場合 light を返す', () => {
      localStorage.setItem("dishboard-theme-v2", "light");
      const { result } = renderHook(() => useTheme());
      expect(result.current.theme).toBe("light");
    });

    it('localStorage に "dark" がある場合 dark を返す', () => {
      localStorage.setItem("dishboard-theme-v2", "dark");
      const { result } = renderHook(() => useTheme());
      expect(result.current.theme).toBe("dark");
    });

    it("localStorage に不正値がある場合 dark にフォールバック", () => {
      localStorage.setItem("dishboard-theme-v2", "invalid-theme");
      const { result } = renderHook(() => useTheme());
      expect(result.current.theme).toBe("dark");
    });
  });

  describe("setTheme", () => {
    it('setTheme("light") で theme が light に変わる', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme("light");
      });

      expect(result.current.theme).toBe("light");
    });

    it('setTheme("light") で localStorage に "light" が保存される', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme("light");
      });

      expect(localStorage.setItem).toHaveBeenCalledWith(
        "dishboard-theme-v2",
        "light"
      );
    });

    it('setTheme("light") で documentElement に "light" クラスが付与される', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme("light");
      });

      expect(document.documentElement.classList.contains("light")).toBe(true);
    });

    it('setTheme("dark") で "light" クラスが除去される', () => {
      document.documentElement.classList.add("light");
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme("dark");
      });

      expect(document.documentElement.classList.contains("light")).toBe(false);
    });
  });

  describe("toggle", () => {
    it("dark → light → dark と切り替わる", () => {
      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe("dark");

      act(() => {
        result.current.toggle();
      });
      expect(result.current.theme).toBe("light");

      act(() => {
        result.current.toggle();
      });
      expect(result.current.theme).toBe("dark");
    });
  });
});
