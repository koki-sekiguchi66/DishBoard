import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMockMeal } from "@/test/helpers";

vi.mock("@/features/meals/api/mealApi", () => ({
  mealApi: {
    updateMeal: vi.fn(),
  },
}));

const saveMealAsMenu = vi.fn();
vi.mock("@/features/customMenus", () => ({
  useSaveMealAsMenu: () => ({ saveMealAsMenu, isSaving: false }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import EditMealModal from "@/features/meals/components/EditMealModal";
import { mealApi } from "@/features/meals/api/mealApi";

describe("EditMealModal コンポーネント", () => {
  const onClose = vi.fn();
  const onMealUpdated = vi.fn();
  const meal = createMockMeal({ id: 42, meal_name: "鶏胸肉のグリル" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("食事名と栄養素の初期値を表示する", () => {
    render(
      <EditMealModal meal={meal} show onClose={onClose} onMealUpdated={onMealUpdated} />
    );

    expect(screen.getByDisplayValue("鶏胸肉のグリル")).toBeInTheDocument();
    expect(screen.getByLabelText("カロリー（kcal）")).toHaveValue("500");
  });

  it("更新すると onMealUpdated が呼ばれる", async () => {
    const updated = { ...meal, meal_name: "更新後" };
    vi.mocked(mealApi.updateMeal).mockResolvedValue(updated);
    const user = userEvent.setup();

    render(
      <EditMealModal meal={meal} show onClose={onClose} onMealUpdated={onMealUpdated} />
    );
    await user.click(screen.getByRole("button", { name: "更新する" }));

    await waitFor(() => {
      expect(mealApi.updateMeal).toHaveBeenCalledWith(
        42,
        // record_date / meal_timing は必須項目（PUT は非部分更新）のため、
        // フォームで編集しなくても送信しなければならない
        expect.objectContaining({
          meal_name: "鶏胸肉のグリル",
          calories: 500,
          record_date: meal.record_date,
          meal_timing: meal.meal_timing,
        })
      );
      expect(onMealUpdated).toHaveBeenCalledWith(updated);
      expect(onClose).toHaveBeenCalled();
    });
    expect(saveMealAsMenu).not.toHaveBeenCalled();
  });

  it("「Myメニューとしても保存する」を有効にすると更新後に saveMealAsMenu を呼ぶ", async () => {
    vi.mocked(mealApi.updateMeal).mockResolvedValue(meal);
    saveMealAsMenu.mockResolvedValue({ id: 1, name: "いつもの朝食" });
    const user = userEvent.setup();

    render(
      <EditMealModal meal={meal} show onClose={onClose} onMealUpdated={onMealUpdated} />
    );

    await user.click(screen.getByRole("checkbox", { name: /Myメニューとしても保存する/ }));
    const menuNameInput = screen.getByLabelText(/メニュー名/);
    await user.clear(menuNameInput);
    await user.type(menuNameInput, "いつもの朝食");
    await user.click(screen.getByRole("button", { name: "更新する" }));

    await waitFor(() => {
      expect(saveMealAsMenu).toHaveBeenCalledWith(42, "いつもの朝食", "");
    });
  });

  it("Myメニュー保存を有効にして名前が空だとエラーになり更新しない", async () => {
    const user = userEvent.setup();

    render(
      <EditMealModal meal={meal} show onClose={onClose} onMealUpdated={onMealUpdated} />
    );

    await user.click(screen.getByRole("checkbox", { name: /Myメニューとしても保存する/ }));
    const menuNameInput = screen.getByLabelText(/メニュー名/);
    await user.clear(menuNameInput);
    await user.click(screen.getByRole("button", { name: "更新する" }));

    expect(await screen.findByText(/名前が必要です/)).toBeInTheDocument();
    expect(mealApi.updateMeal).not.toHaveBeenCalled();
  });
});
