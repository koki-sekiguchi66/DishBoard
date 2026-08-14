/**
 * テスト用モックファクトリ
 */
import { vi, type Mock } from "vitest";
import type {
  MealRecord,
  WeightRecord,
  CustomFood,
  CustomMenuItemDetail,
  DailySummary,
} from "@/types";

// ── 局所モック型 ──

interface MockFood {
  id: number;
  name: string;
  category: string;
  calories: number;
  protein: number;
  fat: number;
  carbohydrates: number;
  dietary_fiber: number;
  sodium: number;
  calcium: number;
  iron: number;
  vitamin_a: number;
  vitamin_b1: number;
  vitamin_b2: number;
  vitamin_c: number;
  per_serving_grams?: number;
}

interface MockCustomMenu {
  id: number;
  name: string;
  description: string;
  items: CustomMenuItemDetail[];
}

interface MockDailySummaryResponse {
  nutrition_summary: DailySummary;
}

interface MockApiClient {
  get: Mock;
  post: Mock;
  put: Mock;
  delete: Mock;
  patch: Mock;
  interceptors: {
    request: { use: Mock };
    response: { use: Mock };
  };
}

interface MockApiResponse<T> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: Record<string, unknown>;
}

interface MockApiError extends Error {
  response: {
    status: number;
    data: unknown;
    statusText: string;
  };
}

// ── モックデータファクトリ ──

export const createMockMeal = (
  overrides: Partial<MealRecord> = {}
): MealRecord => ({
  id: 1,
  record_date: "2025-01-15",
  meal_timing: "lunch",
  meal_name: "テスト食事",
  calories: 500,
  protein: 20.0,
  fat: 15.0,
  carbohydrates: 60.0,
  dietary_fiber: 5.0,
  sodium: 2.0,
  calcium: 100.0,
  iron: 3.0,
  vitamin_a: 200.0,
  vitamin_b1: 0.5,
  vitamin_b2: 0.6,
  vitamin_c: 30.0,
  items: [],
  ...overrides,
});

export const createMockWeight = (
  overrides: Partial<WeightRecord> = {}
): WeightRecord => ({
  id: 1,
  record_date: "2025-01-15",
  weight: 65.5,
  body_fat_percentage: null,
  memo: "",
  ...overrides,
});

export const createMockDailySummary = (
  overrides: Partial<DailySummary> = {}
): MockDailySummaryResponse => ({
  nutrition_summary: {
    calories: 1500,
    protein: 60.0,
    fat: 45.0,
    carbohydrates: 180.0,
    dietary_fiber: 15.0,
    sodium: 6.0,
    calcium: 300.0,
    iron: 9.0,
    vitamin_a: 600.0,
    vitamin_b1: 1.5,
    vitamin_b2: 1.8,
    vitamin_c: 90.0,
    ...overrides,
  },
});

export const createMockFood = (
  overrides: Partial<MockFood> = {}
): MockFood => ({
  id: 1,
  name: "白米",
  category: "grain",
  calories: 168,
  protein: 2.5,
  fat: 0.3,
  carbohydrates: 37.1,
  dietary_fiber: 0.3,
  sodium: 1.0,
  calcium: 3.0,
  iron: 0.1,
  vitamin_a: 0,
  vitamin_b1: 0.02,
  vitamin_b2: 0.01,
  vitamin_c: 0,
  per_serving_grams: 150,
  ...overrides,
});

export const createMockCustomFood = (
  overrides: Partial<CustomFood> = {}
): CustomFood => ({
  id: 1,
  name: "プロテインシェイク",
  calories: 120,
  protein: 24.0,
  fat: 1.5,
  carbohydrates: 3.0,
  dietary_fiber: 0,
  sodium: 0.2,
  calcium: 100.0,
  iron: 0,
  vitamin_a: 0,
  vitamin_b1: 0,
  vitamin_b2: 0,
  vitamin_c: 0,
  ...overrides,
});

export const createMockCustomMenu = (
  overrides: Partial<MockCustomMenu> = {}
): MockCustomMenu => ({
  id: 1,
  name: "お気に入りランチ",
  description: "よく食べるメニュー",
  items: [
    {
      id: 1,
      item_type: "standard",
      item_id: 10,
      item_name: "白米",
      amount_grams: 200,
      display_order: 1,
      calories: 336,
      protein: 5.0,
      fat: 0.6,
      carbohydrates: 74.2,
      dietary_fiber: 0.6,
      sodium: 2.0,
      calcium: 6.0,
      iron: 0.2,
      vitamin_a: 0,
      vitamin_b1: 0.04,
      vitamin_b2: 0.02,
      vitamin_c: 0,
    },
    {
      id: 2,
      item_type: "standard",
      item_id: 20,
      item_name: "鶏むね肉",
      amount_grams: 150,
      display_order: 2,
      calories: 160,
      protein: 31.0,
      fat: 3.5,
      carbohydrates: 0,
      dietary_fiber: 0,
      sodium: 0.8,
      calcium: 5.0,
      iron: 0.3,
      vitamin_a: 10,
      vitamin_b1: 0.1,
      vitamin_b2: 0.1,
      vitamin_c: 2,
    },
  ],
  ...overrides,
});

// ── ユーティリティ ──

export const createMockApiClient = (): MockApiClient => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn(),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
});

export const waitForMs = (ms = 0): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const mockApiResponse = <T>(
  data: T,
  status = 200
): MockApiResponse<T> => ({
  data,
  status,
  statusText: "OK",
  headers: {},
  config: {},
});

export const mockApiError = (
  status = 400,
  data: unknown = {}
): MockApiError => {
  const error = new Error(
    `Request failed with status code ${status}`
  ) as MockApiError;
  error.response = { status, data, statusText: "Bad Request" };
  return error;
};
