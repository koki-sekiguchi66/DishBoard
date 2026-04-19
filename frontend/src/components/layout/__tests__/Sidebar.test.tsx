import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sidebar } from "../Sidebar";

describe("Sidebar", () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    activePage: "record" as const,
    onNavigate: vi.fn(),
    onLogout: vi.fn(),
  };

  it("3つのナビゲーション項目を表示する", () => {
    render(<Sidebar {...defaultProps} />);

    expect(screen.getByText("記録")).toBeInTheDocument();
    expect(screen.getByText("分析")).toBeInTheDocument();
    expect(screen.getByText("設定")).toBeInTheDocument();
  });

  it("アクティブページに aria-current='page' を付与する", () => {
    render(<Sidebar {...defaultProps} activePage="analysis" />);

    const analysisBtn = screen.getByText("分析").closest("button");
    expect(analysisBtn).toHaveAttribute("aria-current", "page");

    const recordBtn = screen.getByText("記録").closest("button");
    expect(recordBtn).not.toHaveAttribute("aria-current");
  });

  it("メニュー項目クリックで onNavigate + onClose が呼ばれる", async () => {
    const user = userEvent.setup();
    render(<Sidebar {...defaultProps} />);

    await user.click(screen.getByText("分析"));

    expect(defaultProps.onNavigate).toHaveBeenCalledWith("analysis");
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("ログアウトボタンで onLogout + onClose が呼ばれる", async () => {
    const user = userEvent.setup();
    render(<Sidebar {...defaultProps} />);

    await user.click(screen.getByText("ログアウト"));

    expect(defaultProps.onLogout).toHaveBeenCalled();
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("アプリ名 DishBoard を表示する", () => {
    render(<Sidebar {...defaultProps} />);

    expect(screen.getByText("Dish")).toBeInTheDocument();
    expect(screen.getByText("Board")).toBeInTheDocument();
  });

  it("open=false のとき非表示", () => {
    render(<Sidebar {...defaultProps} open={false} />);

    expect(screen.queryByText("記録")).not.toBeInTheDocument();
  });
});
