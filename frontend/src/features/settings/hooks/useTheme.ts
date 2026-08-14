/**
 * useTheme — ダーク/ライトテーマ切替フック（Phase 5 課題②）
 *
 * 設計判断:
 *   - localStorage に "dishboard-theme-v2" キーで永続化（useGoalSettings と命名規則統一）
 *   - デフォルトは "dark"（既存 UX を変えない）
 *   - useEffect で documentElement.classList を更新（light クラスの付与/除去）
 *   - index.html の inline script でマウント前に同期初期化（ちらつき防止）
 *   - prefers-color-scheme 追従は Phase 5 では実装しない（YAGNI）
 */
import { useState, useEffect, useCallback } from "react";

/** テーマ識別子 */
export type Theme = "light" | "dark";

/** localStorage キー */
const STORAGE_KEY_THEME = "dishboard-theme-v2";

interface UseThemeReturn {
  /** 現在のテーマ */
  theme: Theme;
  /** テーマを直接設定 */
  setTheme: (t: Theme) => void;
  /** テーマをトグル（dark ↔ light） */
  toggle: () => void;
}

/**
 * localStorage からテーマを読み取る
 * 不正値や未設定の場合は "dark" にフォールバック
 */
function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_THEME);
    if (stored === "light" || stored === "dark") {
      return stored;
    }
  } catch {
    // localStorage アクセスエラー（プライベートブラウジング等）は握りつぶし
  }
  return "dark";
}

/**
 * documentElement に light クラスを付与/除去する
 * dark がデフォルト（クラスなし）、light は :root.light セレクタで上書き
 */
function applyThemeToDOM(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "light") {
    root.classList.add("light");
  } else {
    root.classList.remove("light");
  }
}

export function useTheme(): UseThemeReturn {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);

  // テーマ変更時に DOM と localStorage を同期
  useEffect(() => {
    applyThemeToDOM(theme);
    try {
      localStorage.setItem(STORAGE_KEY_THEME, theme);
    } catch {
      // localStorage 書き込みエラーは握りつぶし
    }
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
  }, []);

  const toggle = useCallback(() => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return { theme, setTheme, toggle };
}
