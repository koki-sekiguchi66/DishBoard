import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnalysisPage } from "../AnalysisPage";

const mockMeals = [
  { id: 1, record_date: "2026-04-15", calories: 500, protein: 20, fat: 15, carbohydrates: 60, meal_name: "朝食", meal_timing: "breakfast" },
  { id: 2, record_date: "2026-04-15", calories: 700, protein: 30, fat: 20, carbohydrates: 80, meal_name: "昼食", meal_timing: "lunch" },
  { id: 3, record_date: "2026-04-14", calories: 600, protein: 25, fat: 18, carbohydrates: 70, meal_name: "夕食", meal_timing: "dinner" },
];

const mockWeights = [
  { id: 1, record_date: "2026-04-15", weight: 65.5 },
  { id: 2, record_date: "2026-04-14", weight: 65.8 },
];

const mockSummary = { calories: 1200, protein: 50, fat: 35, carbohydrates: 140 };

describe("AnalysisPage", () => {
  it("全セクションがレンダリングされる", () => {
    render(
      <AnalysisPage allMeals={mockMeals} weights={mockWeights} dailySummary={mockSummary} />
    );

    expect(screen.getByTestId("analysis-page")).toBeInTheDocument();
    expect(screen.getByText("週間サマリー")).toBeInTheDocument();
    expect(screen.getByText("今日の目標達成状況")).toBeInTheDocument();
    expect(screen.getByText("記録カレンダー")).toBeInTheDocument();
    expect(screen.getByText("カロリー推移")).toBeInTheDocument();
    expect(screen.getByText("体重推移")).toBeInTheDocument();
  });

  it("データが空でもクラッシュしない", () => {
    render(
      <AnalysisPage allMeals={[]} weights={[]} dailySummary={null} />
    );

    expect(screen.getByTestId("analysis-page")).toBeInTheDocument();
  });

  it("PFCProgressBar に dailySummary の値が渡される", () => {
    render(
      <AnalysisPage allMeals={mockMeals} weights={mockWeights} dailySummary={mockSummary} />
    );

    // PFCProgressBar 内の目標達成状況が表示される
    expect(screen.getByRole("region", { name: "栄養素目標達成状況" })).toBeInTheDocument();
  });
});
