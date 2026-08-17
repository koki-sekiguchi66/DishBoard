/**
 * useFrequentMeals — meal_name の記録頻度から「よく記録するメニュー」をタイミングごとに抽出する
 *
 * クイック記録バー用。allMeals（全期間）を meal_timing + meal_name で集計し、
 * 2回以上記録がある名前だけを頻度上位から提案する。1回きりの記録まで
 * 「よく食べるもの」として出すと、単発の外食などノイズが混ざるため。
 * 同名が複数回あっても返すのは最新の1件（そのときの栄養値スナップショットを複製に使う）。
 * その日のうちに既に記録済みの名前は、二重登録を誘わないよう候補から外す。
 */
import { useMemo } from "react";
import type { MealRecord, MealTiming } from "@/types";
import { MEAL_TIMING_LABELS } from "@/types";

const MEAL_TIMINGS = Object.keys(MEAL_TIMING_LABELS) as MealTiming[];
/** タイミングごとに提案する候補の最大数 */
const SUGGESTION_LIMIT = 3;
/** これ未満の記録回数は「よく食べるもの」として提案しない */
const MIN_OCCURRENCES = 2;

export function useFrequentMeals(
  allMeals: MealRecord[],
  selectedDate: string
): Record<MealTiming, MealRecord[]> {
  return useMemo(() => {
    const todayNamesByTiming = new Map<MealTiming, Set<string>>();
    for (const meal of allMeals) {
      if (meal.record_date !== selectedDate) continue;
      const names = todayNamesByTiming.get(meal.meal_timing) ?? new Set<string>();
      names.add(meal.meal_name);
      todayNamesByTiming.set(meal.meal_timing, names);
    }

    const result = {} as Record<MealTiming, MealRecord[]>;

    for (const timing of MEAL_TIMINGS) {
      const latestByName = new Map<string, MealRecord>();
      const countByName = new Map<string, number>();

      for (const meal of allMeals) {
        if (meal.meal_timing !== timing) continue;
        countByName.set(meal.meal_name, (countByName.get(meal.meal_name) ?? 0) + 1);
        const latest = latestByName.get(meal.meal_name);
        if (!latest || meal.record_date > latest.record_date) {
          latestByName.set(meal.meal_name, meal);
        }
      }

      const todayNames = todayNamesByTiming.get(timing) ?? new Set<string>();

      result[timing] = Array.from(countByName.entries())
        .filter(([name, count]) => count >= MIN_OCCURRENCES && !todayNames.has(name))
        .sort((a, b) => b[1] - a[1])
        .slice(0, SUGGESTION_LIMIT)
        .map(([name]) => latestByName.get(name) as MealRecord);
    }

    return result;
  }, [allMeals, selectedDate]);
}
