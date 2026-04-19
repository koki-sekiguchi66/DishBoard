import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PFCProgressBar } from "../PFCProgressBar";

describe("PFCProgressBar", () => {
  const current = { calories: 1100, protein: 40, fat: 30, carbs: 150 };

  it("4つの栄養素ラベルを表示する", () => {
    render(<PFCProgressBar current={current} />);

    expect(screen.getByText("カロリー")).toBeInTheDocument();
    expect(screen.getByText("タンパク質")).toBeInTheDocument();
    expect(screen.getByText("脂質")).toBeInTheDocument();
    expect(screen.getByText("炭水化物")).toBeInTheDocument();
  });

  it("4つのプログレスバーがレンダリングされる", () => {
    render(<PFCProgressBar current={current} />);

    const bars = screen.getAllByRole("progressbar");
    expect(bars).toHaveLength(4);
  });

  it("デフォルト目標値で達成率を計算する", () => {
    render(<PFCProgressBar current={current} />);

    // カロリー: 1100/2200 = 50%（脂質・炭水化物も50%のため複数マッチする）
    const matches = screen.getAllByText("(50%)");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("カスタム目標値を適用できる", () => {
    render(
      <PFCProgressBar
        current={current}
        goals={{ calories: 2000, protein: 50, fat: 50, carbs: 250 }}
      />
    );

    // カロリー: 1100/2000 = 55%
    expect(screen.getByText("(55%)")).toBeInTheDocument();
    // タンパク質: 40/50 = 80%
    expect(screen.getByText("(80%)")).toBeInTheDocument();
  });

  it("region ランドマークが存在する", () => {
    render(<PFCProgressBar current={current} />);
    expect(screen.getByRole("region", { name: "栄養素目標達成状況" })).toBeInTheDocument();
  });
});
