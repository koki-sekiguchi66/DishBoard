/**
 * SettingsPage コンポーネントのテスト
 *
 * SettingsPage は純粋なコンテナのため、3セクションが
 * 確実にレンダリングされることのみ検証する。
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SettingsPage } from "../SettingsPage";

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("ページコンテナがレンダリングされる", () => {
    render(<SettingsPage />);
    expect(screen.getByTestId("settings-page")).toBeInTheDocument();
  });

  it("プロフィールセクションがレンダリングされる", () => {
    render(<SettingsPage />);
    expect(screen.getByText(/プロフィール/)).toBeInTheDocument();
  });

  it("目標設定セクションがレンダリングされる", () => {
    render(<SettingsPage />);
    expect(screen.getByText(/目標設定/)).toBeInTheDocument();
  });

  it("表示設定セクションがレンダリングされる", () => {
    render(<SettingsPage />);
    expect(screen.getByText(/表示設定/)).toBeInTheDocument();
  });
});
