import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CalorieChart } from "../CalorieChart";

// Recharts は jsdom で SVG 描画できないためモック
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

import { vi } from "vitest";
import React from "react";

describe("CalorieChart", () => {
  const mockMeals = [
    { id: 1, record_date: "2026-04-15", calories: 500 },
    { id: 2, record_date: "2026-04-15", calories: 700 },
    { id: 3, record_date: "2026-04-14", calories: 600 },
  ];

  it("タイトル 'カロリー推移' を表示する", () => {
    render(<CalorieChart meals={mockMeals} />);
    expect(screen.getByText("カロリー推移")).toBeInTheDocument();
  });

  it("データがある場合チャートを表示する", () => {
    render(<CalorieChart meals={mockMeals} />);
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });

  it("最近の記録セクションを表示する", () => {
    render(<CalorieChart meals={mockMeals} />);
    expect(screen.getByText("最近の記録")).toBeInTheDocument();
  });

  it("データが空の場合 'データがありません' を表示する", () => {
    render(<CalorieChart meals={[]} />);
    expect(screen.getByText("データがありません")).toBeInTheDocument();
  });
});
