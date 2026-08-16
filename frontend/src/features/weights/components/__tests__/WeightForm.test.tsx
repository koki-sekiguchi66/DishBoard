/**
 * WeightForm テスト
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMockWeight } from "@/test/helpers";

vi.mock("@/features/weights/api/weightApi", () => ({
  weightApi: {
    createWeight: vi.fn(),
  },
}));

import WeightForm from "@/features/weights/components/WeightForm";
import { weightApi } from "@/features/weights/api/weightApi";

describe("WeightForm コンポーネント", () => {
  const mockOnWeightCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("フォームが正しくレンダリングされる", () => {
    render(<WeightForm onWeightCreated={mockOnWeightCreated} />);

    expect(screen.getByText(/記録日/)).toBeInTheDocument();
    expect(screen.getByText(/体重/)).toBeInTheDocument();
    expect(screen.getByLabelText("体重（kg）")).toBeInTheDocument();
    expect(screen.getByText("kg")).toBeInTheDocument();
  });

  it("体重記録を正常に作成", async () => {
    const user = userEvent.setup();
    const created = createMockWeight();
    vi.mocked(weightApi.createWeight).mockResolvedValue(created);

    render(<WeightForm onWeightCreated={mockOnWeightCreated} />);

    const weightInput = screen.getByLabelText("体重（kg）");
    await user.clear(weightInput);
    await user.type(weightInput, "65.5");
    await user.click(screen.getByRole("button", { name: /記録する/ }));

    await waitFor(() => {
      expect(weightApi.createWeight).toHaveBeenCalled();
      expect(mockOnWeightCreated).toHaveBeenCalledWith(created);
    });
  });

  it("API失敗時にエラーメッセージが表示", async () => {
    const user = userEvent.setup();
    vi.mocked(weightApi.createWeight).mockRejectedValue(new Error("Server Error"));

    render(<WeightForm onWeightCreated={mockOnWeightCreated} />);

    const weightInput = screen.getByLabelText("体重（kg）");
    await user.clear(weightInput);
    await user.type(weightInput, "65.5");
    await user.click(screen.getByRole("button", { name: /記録する/ }));

    await waitFor(() => {
      expect(screen.getByText(/失敗しました/)).toBeInTheDocument();
    });

    expect(mockOnWeightCreated).not.toHaveBeenCalled();
  });

  it("空の体重でバリデーションエラー", async () => {
    const user = userEvent.setup();

    render(<WeightForm onWeightCreated={mockOnWeightCreated} />);

    // weight フィールドは空のまま送信（HTMLのrequired属性があるためブラウザバリデーション）
    // テスト環境ではrequired属性をスキップするため、直接ロジックテスト
    const weightInput = screen.getByLabelText("体重（kg）");
    await user.clear(weightInput);
    await user.type(weightInput, "0");
    await user.click(screen.getByRole("button", { name: /記録する/ }));

    await waitFor(() => {
      expect(screen.getByText(/有効な体重/)).toBeInTheDocument();
    });
  });
});
