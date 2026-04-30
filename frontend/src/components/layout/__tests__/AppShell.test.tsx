import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppShell } from "../AppShell";

describe("AppShell", () => {
  const defaultProps = {
    onLogout: vi.fn(),
    recordContent: <div data-testid="record-content">記録コンテンツ</div>,
  };

  it("デフォルトで記録ページを表示する", () => {
    render(<AppShell {...defaultProps} />);

    expect(screen.getByTestId("record-content")).toBeInTheDocument();
  });

  it("Header が存在する", () => {
    render(<AppShell {...defaultProps} />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("ハンバーガーメニューからサイドバーを開き、分析ページに遷移できる", async () => {
    const user = userEvent.setup();
    render(
      <AppShell
        {...defaultProps}
        analysisContent={<div data-testid="analysis-content">分析コンテンツ</div>}
      />
    );

    // サイドバーを開く
    await user.click(screen.getByRole("button", { name: "メニューを開く" }));

    // 分析メニューをクリック
    await user.click(screen.getByText("分析"));

    // 分析コンテンツが表示される
    expect(screen.getByTestId("analysis-content")).toBeInTheDocument();
    expect(screen.queryByTestId("record-content")).not.toBeInTheDocument();
  });

  it("analysisContent が未提供の場合プレースホルダーを表示", async () => {
    const user = userEvent.setup();
    render(<AppShell {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "メニューを開く" }));
    await user.click(screen.getByText("分析"));

    expect(screen.getByText("Coming Soon...")).toBeInTheDocument();
  });

  it("ルート要素に min-h-screen クラスが適用されている", () => {
    const { container } = render(<AppShell {...defaultProps} />);

    expect(container.querySelector(".min-h-screen")).toBeInTheDocument();
  });
});
