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
 * アクションボタンは常時表示にしている。
 * このアプリの主な利用端末はスマートフォン（PWA）で、hover は発火しないため、
 * hover 時だけ出す実装だと実質操作できなくなる。
 */
export function FoodChip({ meal, onEdit, onDelete, onSaveAsMenu }: FoodChipProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2",
        "rounded-lg border border-border bg-secondary/30 px-3 py-2",
        "transition-colors hover:bg-secondary/50"
      )}
    >
      {/* 食品情報 */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {meal.meal_name}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-semibold text-calories">
            {Math.round(meal.calories)}kcal
          </span>
          <span>P:{meal.protein}g</span>
          <span>F:{meal.fat}g</span>
          <span>C:{meal.carbohydrates}g</span>
        </div>
      </div>

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
  );
}