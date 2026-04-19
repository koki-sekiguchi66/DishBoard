import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeatmapCalendar } from "../HeatmapCalendar";

describe("HeatmapCalendar", () => {
  const today = new Date().toISOString().split("T")[0];

  it("記録カレンダーのタイトルを表示する", () => {
    render(<HeatmapCalendar meals={[]} />);
    expect(screen.getByText("記録カレンダー")).toBeInTheDocument();
  });

  it("SVG要素がレンダリングされる", () => {
    render(<HeatmapCalendar meals={[]} />);
    expect(screen.getByRole("img", { name: "記録ヒートマップカレンダー" })).toBeInTheDocument();
  });

  it("記録日数が表示される", () => {
    const meals = [
      { id: 1, record_date: today },
      { id: 2, record_date: today },
    ];
    render(<HeatmapCalendar meals={meals} />);
    expect(screen.getByText("1日記録")).toBeInTheDocument();
  });

  it("凡例（少〜多）が表示される", () => {
    render(<HeatmapCalendar meals={[]} />);
    expect(screen.getByText("少")).toBeInTheDocument();
    expect(screen.getByText("多")).toBeInTheDocument();
  });

  it("データが空でもクラッシュしない", () => {
    render(<HeatmapCalendar meals={[]} />);
    expect(screen.getByText("0日記録")).toBeInTheDocument();
  });
});
