/**
 * useGoalSettings — 栄養目標値の永続化フック
 *
 * Phase 4 で導入。GoalSettings コンポーネントと、目標値を表示する
 * Dashboard / RecordTab / PFCSummary 側の双方から呼び出される。
 *
 * 設計判断:
 *   - localStorage に直接アクセス（バックエンド永続化は Phase 4.5 以降）
 *   - useState の lazy initializer で初回マウント時のみ I/O
 *   - 部分破損データへの防御（一部のキーだけ正常な JSON でもフォールバック）
 *   - localStorage.setItem の例外（容量超過等）は握り潰す
 *     → UI 上の値は更新するが永続化失敗、というデグレード許容
 *
 * なぜ Context を使わないか:
 *   現状 goals を必要とするのは Dashboard 系統のみ。Settings ↔ Record は
 *   Dashboard を介して props 伝搬可能で、Context のオーバーヘッドは不要（YAGNI）。
 *   ただし、Dashboard と Settings で別インスタンスのフックが動くため、
 *   片方の更新が他方に伝播しない点には注意（同一画面で同時表示しないため問題なし）。
 *
 * テスト: __tests__/useGoalSettings.test.ts 参照
 */
import { useState, useCallback } from "react";
import {
  type NutritionGoals,
  DEFAULT_GOALS,
  STORAGE_KEY_GOALS,
} from "@/types/settings";

/**
 * localStorage から goals を読み取り、不正値は DEFAULT_GOALS にフォールバックする。
 * モジュールスコープに切り出すことで、useState の lazy initializer から
 * 1回だけ呼ばれる純粋関数として再利用しやすくしている。
 */
function loadGoalsFromStorage(): NutritionGoals {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GOALS);
    if (!raw) return DEFAULT_GOALS;

    const parsed = JSON.parse(raw) as Partial<Record<keyof NutritionGoals, unknown>>;

    // 各キーごとに型チェックし、不正なら DEFAULT を採用
    return {
      calories:
        typeof parsed.calories === "number" ? parsed.calories : DEFAULT_GOALS.calories,
      protein:
        typeof parsed.protein === "number" ? parsed.protein : DEFAULT_GOALS.protein,
      fat: typeof parsed.fat === "number" ? parsed.fat : DEFAULT_GOALS.fat,
      carbs: typeof parsed.carbs === "number" ? parsed.carbs : DEFAULT_GOALS.carbs,
    };
  } catch {
    // JSON.parse 失敗、localStorage 例外などすべてここで吸収
    return DEFAULT_GOALS;
  }
}

interface UseGoalSettingsReturn {
  goals: NutritionGoals;
  updateGoals: (next: NutritionGoals) => void;
}

export function useGoalSettings(): UseGoalSettingsReturn {
  // lazy initializer で初回マウント時のみ localStorage を読む
  const [goals, setGoals] = useState<NutritionGoals>(loadGoalsFromStorage);

  const updateGoals = useCallback((next: NutritionGoals) => {
    // state は常に更新（UI の即時反映を優先）
    setGoals(next);

    // 永続化は best-effort。失敗してもクラッシュしない
    try {
      localStorage.setItem(STORAGE_KEY_GOALS, JSON.stringify(next));
    } catch (err) {
      // QuotaExceededError 等。ユーザーへの通知は呼び出し側の責務
      console.error("Failed to persist goals to localStorage", err);
    }
  }, []);

  return { goals, updateGoals };
}
