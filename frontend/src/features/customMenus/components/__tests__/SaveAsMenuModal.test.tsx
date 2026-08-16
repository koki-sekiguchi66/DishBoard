import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const saveMealAsMenu = vi.fn();

vi.mock("@/features/customMenus/hooks/useSaveMealAsMenu", () => ({
  useSaveMealAsMenu: () => ({ saveMealAsMenu, isSaving: false }),
}));

import SaveAsMenuModal from "@/features/customMenus/components/SaveAsMenuModal";

describe("SaveAsMenuModal", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mealId の食事名を初期値としてメニュー名欄に表示する", () => {
    render(
      <SaveAsMenuModal show mealId={1} defaultName="鶏胸肉のグリル" onClose={onClose} />
    );

    expect(screen.getByDisplayValue("鶏胸肉のグリル")).toBeInTheDocument();
  });

  it("保存すると saveMealAsMenu が呼ばれ、成功時にモーダルを閉じる", async () => {
    saveMealAsMenu.mockResolvedValue({ id: 1, name: "いつもの朝食" });
    const user = userEvent.setup();

    render(<SaveAsMenuModal show mealId={5} defaultName="朝食" onClose={onClose} />);

    await user.clear(screen.getByLabelText(/メニュー名/));
    await user.type(screen.getByLabelText(/メニュー名/), "いつもの朝食");
    await user.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(saveMealAsMenu).toHaveBeenCalledWith(5, "いつもの朝食", "");
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("保存に失敗した場合はモーダルを閉じない", async () => {
    saveMealAsMenu.mockResolvedValue(null);
    const user = userEvent.setup();

    render(<SaveAsMenuModal show mealId={5} defaultName="朝食" onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(saveMealAsMenu).toHaveBeenCalled();
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("メニュー名が空なら保存ボタンが無効", () => {
    render(<SaveAsMenuModal show mealId={5} defaultName="" onClose={onClose} />);

    expect(screen.getByRole("button", { name: "保存する" })).toBeDisabled();
  });
});
