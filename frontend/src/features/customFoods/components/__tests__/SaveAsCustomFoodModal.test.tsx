import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { MealRecordItem } from "@/types";

const saveItemAsCustomFood = vi.fn();

vi.mock("@/features/customFoods/hooks/useSaveItemAsCustomFood", () => ({
  useSaveItemAsCustomFood: () => ({ saveItemAsCustomFood, isSaving: false }),
}));

import SaveAsCustomFoodModal from "@/features/customFoods/components/SaveAsCustomFoodModal";

const item: MealRecordItem = {
  id: 1,
  item_type: "standard",
  item_id: 10,
  item_name: "白米",
  amount_grams: 200,
  display_order: 1,
  calories: 336,
  protein: 5,
  fat: 0.6,
  carbohydrates: 74.2,
  dietary_fiber: 0.6,
  sodium: 0,
  calcium: 0,
  iron: 0,
  vitamin_a: 0,
  vitamin_b1: 0,
  vitamin_b2: 0,
  vitamin_c: 0,
};

describe("SaveAsCustomFoodModal", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("品目名を初期値としてアイテム名欄に表示する", () => {
    render(<SaveAsCustomFoodModal show item={item} onClose={onClose} />);

    expect(screen.getByDisplayValue("白米")).toBeInTheDocument();
  });

  it("保存すると saveItemAsCustomFood が呼ばれ、成功時にモーダルを閉じる", async () => {
    saveItemAsCustomFood.mockResolvedValue({ id: 1, name: "白米" });
    const user = userEvent.setup();

    render(<SaveAsCustomFoodModal show item={item} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(saveItemAsCustomFood).toHaveBeenCalledWith(item, "白米");
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("保存に失敗した場合はモーダルを閉じない", async () => {
    saveItemAsCustomFood.mockResolvedValue(null);
    const user = userEvent.setup();

    render(<SaveAsCustomFoodModal show item={item} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(saveItemAsCustomFood).toHaveBeenCalled();
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("アイテム名が空なら保存ボタンが無効", async () => {
    const user = userEvent.setup();
    render(<SaveAsCustomFoodModal show item={item} onClose={onClose} />);

    await user.clear(screen.getByLabelText(/アイテム名/));

    expect(screen.getByRole("button", { name: "保存する" })).toBeDisabled();
  });
});
