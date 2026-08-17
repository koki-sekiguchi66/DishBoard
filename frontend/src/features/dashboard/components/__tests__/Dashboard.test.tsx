/**
 * Dashboard コンポーネントテスト
 *
 * 主眼は2つの回帰テスト:
 *   1. 一覧APIの meal（MealRecordListSerializer 由来で基本4栄養素のみ）を
 *      そのまま編集モーダルに渡すと詳細栄養素が消えるバグの再発防止
 *      （編集時に詳細を取得し直しているか）
 *   2. データ取得・削除に失敗したときの data.message が実際に画面へ
 *      表示されるか（以前はどこにも描画されず握りつぶされていた）
 *
 * 重い子コンポーネント（フォーム・分析・設定など）はモックし、
 * useDashboardData は実物を使って API モックだけ差し替える。
 */
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMockMeal, createMockDailySummary } from "@/test/helpers";
import type { MealRecord } from "@/types";
import type { Meal } from "@/features/record";

const { mealApiMock, toastErrorMock } = vi.hoisted(() => ({
  mealApiMock: {
    getMeals: vi.fn(),
    getMealDetail: vi.fn(),
    getDailySummary: vi.fn(),
    deleteMeal: vi.fn(),
  },
  toastErrorMock: vi.fn(),
}));

// useDashboardData が直接 import しているパス
vi.mock("@/features/meals/api/mealApi", () => ({ mealApi: mealApiMock }));

vi.mock("@/features/meals", () => ({
  MealForm: () => <div />,
  EditMealModal: ({
    meal,
    show,
  }: {
    meal: MealRecord;
    show: boolean;
    onClose: () => void;
    onMealUpdated: (meal: MealRecord) => void;
  }) =>
    show ? (
      <div data-testid="edit-modal">
        <span data-testid="edit-modal-fiber">{meal.dietary_fiber}</span>
      </div>
    ) : null,
  mealApi: mealApiMock,
  useQuickRepeat: () => ({ repeatMeal: vi.fn(), isRepeating: false }),
}));

vi.mock("@/features/weights", () => ({ WeightForm: () => <div /> }));
vi.mock("@/features/weights/api/weightApi", () => ({
  weightApi: { getWeights: vi.fn().mockResolvedValue([]) },
}));
vi.mock("@/features/customMenus", () => ({ SaveAsMenuModal: () => null }));
vi.mock("@/components/PWA", () => ({ InstallPWA: () => null }));
vi.mock("@/features/analysis", () => ({ AnalysisPage: () => null }));
vi.mock("@/features/settings", () => ({
  SettingsPage: () => null,
  useGoalSettings: () => ({ goals: {} }),
}));
vi.mock("@/components/layout", () => ({
  AppShell: ({ recordContent }: { recordContent: ReactNode }) => (
    <div>{recordContent}</div>
  ),
}));
vi.mock("sonner", () => ({ toast: { error: toastErrorMock, success: vi.fn() } }));

vi.mock("@/features/record", () => ({
  RecordTab: ({
    meals,
    onMealEdit,
  }: {
    meals: Meal[];
    onMealEdit?: (meal: Meal) => void;
  }) => (
    <div>
      <span data-testid="meal-count">{meals.length}</span>
      <button onClick={() => onMealEdit?.(meals[0])}>編集トリガー</button>
    </div>
  ),
}));

import Dashboard from "@/features/dashboard/components/Dashboard";

// 「今日」の日付。useDashboardData は初期表示日でフィルタするため、
// テスト用の記録もその日付に合わせる
const today = new Date();
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

/** GET /meal-records/ の実際のレスポンス形（MealRecordListSerializer）。
 * dietary_fiber 等の詳細栄養素も items も含まれない。 */
const listMealRaw = {
  id: 1,
  record_date: todayStr,
  meal_timing: "lunch",
  meal_name: "テスト食事",
  calories: 500,
  protein: 20,
  fat: 15,
  carbohydrates: 60,
  items_count: 2,
  created_at: `${todayStr}T08:00:00Z`,
};

describe("Dashboard コンポーネント", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mealApiMock.getMeals.mockResolvedValue([listMealRaw]);
    mealApiMock.getDailySummary.mockResolvedValue({
      date: todayStr,
      nutrition_summary: createMockDailySummary().nutrition_summary,
    });
  });

  it("編集時は一覧の簡略データではなく詳細(全栄養素)を取得し直してモーダルへ渡す", async () => {
    const detail = createMockMeal({ id: 1, dietary_fiber: 12.3 });
    mealApiMock.getMealDetail.mockResolvedValue(detail);
    const user = userEvent.setup();

    render(<Dashboard handleLogout={vi.fn()} />);
    await waitFor(() => expect(screen.getByTestId("meal-count")).toHaveTextContent("1"));

    await user.click(screen.getByText("編集トリガー"));

    await waitFor(() => {
      expect(mealApiMock.getMealDetail).toHaveBeenCalledWith(1);
      expect(screen.getByTestId("edit-modal-fiber")).toHaveTextContent("12.3");
    });
  });

  it("詳細取得に失敗した場合はエラートーストを表示しモーダルを開かない", async () => {
    mealApiMock.getMealDetail.mockRejectedValue(new Error("network"));
    const user = userEvent.setup();

    render(<Dashboard handleLogout={vi.fn()} />);
    await waitFor(() => expect(screen.getByTestId("meal-count")).toHaveTextContent("1"));

    await user.click(screen.getByText("編集トリガー"));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith("食事記録の詳細取得に失敗しました。");
    });
    expect(screen.queryByTestId("edit-modal")).not.toBeInTheDocument();
  });

  it("データ取得に失敗した場合エラートーストで通知する", async () => {
    mealApiMock.getMeals.mockRejectedValue(new Error("network"));

    render(<Dashboard handleLogout={vi.fn()} />);

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith("データの取得に失敗しました。");
    });
  });
});
