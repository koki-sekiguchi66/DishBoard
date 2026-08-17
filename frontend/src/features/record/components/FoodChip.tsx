import { BookmarkPlus, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Meal } from "../types";

interface FoodChipProps {
  meal: Meal;
  onEdit?: (meal: Meal) => void;
  onDelete?: (mealId: number) => void;
  onSaveAsMenu?: (meal: Meal) => void;
}

/**
 * 食券メタファーの食事記録カード（ADR #21）。左端のミシン目とカロリーの
 * スタンプ風バッジで表現する。一覧で複数件並ぶ実運用画面のため、
 * モックアップにあった1件ごとの傾きは視認性を優先して見送っている。
 *
 * アクションボタンは常時表示にしている。
 * このアプリの主な利用端末はスマートフォン（PWA）で、hover は発火しないため、
 * hover 時だけ出す実装だと実質操作できなくなる。
 */
export function FoodChip({ meal, onEdit, onDelete, onSaveAsMenu }: FoodChipProps) {
  return (
    <div
      className={cn(
        "flex items-stretch overflow-hidden",
        "rounded-md border border-border bg-card",
        "transition-colors hover:bg-secondary/40"
      )}
    >
      {/* ミシン目 */}
      <div
        aria-hidden="true"
        className="w-3 shrink-0 border-r border-dashed border-border"
        style={{
          backgroundImage:
            "radial-gradient(circle at 6px 8px, var(--background) 3.5px, transparent 4px)",
          backgroundSize: "12px 16px",
        }}
      />

      <div className="flex flex-1 items-center justify-between gap-2 px-3 py-2">
        {/* 食品情報 */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {meal.meal_name}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>P:{meal.protein}g</span>
            <span>F:{meal.fat}g</span>
            <span>C:{meal.carbohydrates}g</span>
          </div>
        </div>

        {/* カロリー・スタンプ */}
        <span className="shrink-0 rounded-full border-2 border-calories/70 px-2.5 py-1 text-xs font-semibold tabular-nums text-calories">
          {Math.round(meal.calories)}kcal
        </span>

        {/* アクション */}
        <div className="flex shrink-0 items-center gap-0.5">
          {onSaveAsMenu && (
            <button
              type="button"
              onClick={() => onSaveAsMenu(meal)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label={`${meal.meal_name}をMyメニューに登録`}
            >
              <BookmarkPlus className="h-3.5 w-3.5" />
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(meal)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label={`${meal.meal_name}を編集`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(meal.id)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
              aria-label={`${meal.meal_name}を削除`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
