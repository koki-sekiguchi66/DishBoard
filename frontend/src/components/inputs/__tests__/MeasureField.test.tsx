/**
 * MeasureField テスト
 *
 * ドラッグ操作は jsdom で PointerEvent を再現しづらいため、
 * キーボード・ステッパー・プリセットの経路を検証する。
 */
import { useState } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MeasureField from "@/components/inputs/MeasureField";

describe("MeasureField コンポーネント", () => {
  const onChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setup = (props: Partial<Parameters<typeof MeasureField>[0]> = {}) =>
    render(
      <MeasureField
        label="炭水化物"
        unit="g"
        value=""
        onChange={onChange}
        {...props}
      />
    );

  it("ラベルと単位を表示する", () => {
    setup();

    expect(screen.getByText("炭水化物")).toBeInTheDocument();
    expect(screen.getByText("g")).toBeInTheDocument();
  });

  it("空欄のときはプレースホルダの 0 を出す（0 を消す手間をなくす）", () => {
    setup();

    expect(screen.getByLabelText("炭水化物（g）")).toHaveValue("");
    expect(screen.getByPlaceholderText("0")).toBeInTheDocument();
  });

  it("数字以外の入力は捨てる", async () => {
    const user = userEvent.setup();
    // 連続入力を見るので、value を保持する側を用意する
    const Controlled = () => {
      const [value, setValue] = useState("");
      return (
        <MeasureField label="炭水化物" unit="g" value={value} onChange={setValue} />
      );
    };
    render(<Controlled />);

    const input = screen.getByLabelText("炭水化物（g）");
    await user.type(input, "1a2.3.4");

    expect(input).toHaveValue("12.34");
  });

  it("+ ボタンで step ぶん増える", async () => {
    const user = userEvent.setup();
    setup({ value: "10", step: 5 });

    await user.click(screen.getByRole("button", { name: "炭水化物を増やす" }));

    expect(onChange).toHaveBeenCalledWith("15");
  });

  it("− ボタンは min を下回らない", async () => {
    const user = userEvent.setup();
    setup({ value: "1", step: 5, min: 0 });

    await user.click(screen.getByRole("button", { name: "炭水化物を減らす" }));

    expect(onChange).toHaveBeenCalledWith("0");
  });

  it("↑↓ キーで増減し、Shift 併用で10倍動く", async () => {
    const user = userEvent.setup();
    setup({ value: "20", step: 1 });
    const input = screen.getByLabelText("炭水化物（g）");

    await user.click(input);
    await user.keyboard("{ArrowUp}");
    expect(onChange).toHaveBeenLastCalledWith("21");

    await user.keyboard("{Shift>}{ArrowDown}{/Shift}");
    expect(onChange).toHaveBeenLastCalledWith("10");
  });

  it("step より細かい入力を加減算で潰さない", async () => {
    const user = userEvent.setup();
    setup({ value: "20.5", step: 1 });

    await user.click(screen.getByRole("button", { name: "炭水化物を増やす" }));

    expect(onChange).toHaveBeenCalledWith("21.5");
  });

  it("プリセットをタップするとその値になる", async () => {
    const user = userEvent.setup();
    setup({ label: "分量", presets: [100, 150] });

    await user.click(screen.getByRole("button", { name: "150g" }));

    expect(onChange).toHaveBeenCalledWith("150");
  });

  it("フォーカスが外れると表記を整える", async () => {
    const user = userEvent.setup();
    setup({ value: "05." });

    await user.click(screen.getByLabelText("炭水化物（g）"));
    await user.tab();

    expect(onChange).toHaveBeenCalledWith("5");
  });

  it("Enter で次の数値欄へ移る", async () => {
    const user = userEvent.setup();
    render(
      <>
        <MeasureField label="タンパク質" unit="g" value="" onChange={onChange} />
        <MeasureField label="脂質" unit="g" value="" onChange={onChange} />
      </>
    );

    await user.click(screen.getByLabelText("タンパク質（g）"));
    await user.keyboard("{Enter}");

    expect(screen.getByLabelText("脂質（g）")).toHaveFocus();
  });
});
