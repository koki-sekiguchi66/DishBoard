import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuickRepeatChips } from "../QuickRepeatChips";
import { createMockMeal } from "@/test/helpers";

describe("QuickRepeatChips", () => {
  it("候補が無ければ何も描画しない", () => {
    const { container } = render(
      <QuickRepeatChips suggestions={[]} onRepeat={vi.fn()} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("候補をチップとして表示し、タップで onRepeat を呼ぶ", async () => {
    const onRepeat = vi.fn();
    const meal = createMockMeal({ id: 5, meal_name: "いつもの朝食" });
    const user = userEvent.setup();

    render(<QuickRepeatChips suggestions={[meal]} onRepeat={onRepeat} />);

    await user.click(screen.getByRole("button", { name: "いつもの朝食" }));

    expect(onRepeat).toHaveBeenCalledWith(meal);
  });

  it("isRepeating 中はチップを無効化する", () => {
    const meal = createMockMeal({ id: 5, meal_name: "いつもの朝食" });

    render(<QuickRepeatChips suggestions={[meal]} onRepeat={vi.fn()} isRepeating />);

    expect(screen.getByRole("button", { name: "いつもの朝食" })).toBeDisabled();
  });
});
