import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Header } from "../Header";

describe("Header", () => {
  it("アプリ名 DishBoard を表示する", () => {
    render(<Header onMenuOpen={vi.fn()} />);

    expect(screen.getByText("Dish")).toBeInTheDocument();
    expect(screen.getByText("Board")).toBeInTheDocument();
  });

  it("ハンバーガーボタンクリックで onMenuOpen が呼ばれる", async () => {
    const user = userEvent.setup();
    const onMenuOpen = vi.fn();
    render(<Header onMenuOpen={onMenuOpen} />);

    const menuBtn = screen.getByRole("button", { name: "メニューを開く" });
    await user.click(menuBtn);

    expect(onMenuOpen).toHaveBeenCalledOnce();
  });

  it("banner ランドマークとして認識される", () => {
    render(<Header onMenuOpen={vi.fn()} />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
  });
});
