/**
 * 現在時刻から食事タイミングを推定するフック。
 *
 * MealTimingTabs の初期選択タブに使う。useGreeting と違い1分ごとの更新はしない。
 * 記録画面を開いたまま時間帯をまたいでも、操作中のタブが勝手に切り替わると
 * かえって使いづらいため、マウント時点の時刻だけを見る。
 */
import { useState } from "react";
import type { MealTiming } from "@/types";

const TIMING_RANGES: { start: number; end: number; timing: MealTiming }[] = [
  { start: 4, end: 10, timing: "breakfast" },
  { start: 10, end: 15, timing: "lunch" },
  { start: 15, end: 18, timing: "snack" },
  { start: 18, end: 4, timing: "dinner" },
];

function getMealTimingForHour(hour: number): MealTiming {
  for (const { start, end, timing } of TIMING_RANGES) {
    if (start < end) {
      if (hour >= start && hour < end) return timing;
    } else {
      if (hour >= start || hour < end) return timing;
    }
  }
  return "breakfast";
}

export function useCurrentMealTiming(): MealTiming {
  const [timing] = useState(() => getMealTimingForHour(new Date().getHours()));
  return timing;
}

// テスト用にエクスポート
export { getMealTimingForHour };
