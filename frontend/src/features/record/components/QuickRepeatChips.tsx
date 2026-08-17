/**
 * QuickRepeatChips — よく記録するメニューをワンタップで今日の記録に追加する
 *
 * useFrequentMeals が求めた候補（同名で2回以上・当日未記録）をチップ表示する。
 * タップすると useQuickRepeat が明細ごと複製して今日の記録に追加する。
 */
import { Repeat } from "lucide-react";
import type { MealRecord } from "@/types";

interface QuickRepeatChipsProps {
  suggestions: MealRecord[];
  onRepeat: (meal: MealRecord) => void;
  isRepeating?: boolean;
}

export function QuickRepeatChips({
  suggestions,
  onRepeat,
  isRepeating,
}: QuickRepeatChipsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="mb-2 flex flex-wrap items-center gap-1.5">
      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Repeat className="h-3 w-3" />
        よく記録するメニュー
      </span>
      {suggestions.map((meal) => (
        <button
          key={meal.id}
          type="button"
          disabled={isRepeating}
          onClick={() => onRepeat(meal)}
          className="rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
        >
          {meal.meal_name}
        </button>
      ))}
    </div>
  );
}
