import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeightChart } from "../WeightChart";

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

describe("WeightChart", () => {
  const mockWeights = [
    { id: 1, record_date: "2026-04-15", weight: 65.5 },
    { id: 2, record_date: "2026-04-14", weight: 65.8 },
  ];

  it("タイトル '体重推移' を表示する", () => {
    render(<WeightChart weights={mockWeights} />);
    expect(screen.getByText("体重推移")).toBeInTheDocument();
  });

  it("データがある場合チャートを表示する", () => {
    render(<WeightChart weights={mockWeights} />);
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });

  it("最近の記録セクションを表示する", () => {
    render(<WeightChart weights={mockWeights} />);
    expect(screen.getByText("最近の記録")).toBeInTheDocument();
  });

  it("データが空の場合 'データがありません' を表示する", () => {
    render(<WeightChart weights={[]} />);
    expect(screen.getByText("データがありません")).toBeInTheDocument();
  });
});
