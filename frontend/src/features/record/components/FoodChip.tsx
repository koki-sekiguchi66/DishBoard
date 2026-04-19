import { Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Meal } from "../types";

interface FoodChipProps {
  meal: Meal;
  onEdit?: (meal: Meal) => void;
  onDelete?: (mealId: number) => void;
}

export function FoodChip({ meal, onEdit, onDelete }: FoodChipProps) {
  return (
    <div
      className={cn(
        "group flex items-center justify-between gap-2",
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

      {/* アクション (hover時に表示) */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(meal)}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={`${meal.meal_name}を編集`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(meal.id)}
            className="rounded-md p-1 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
            aria-label={`${meal.meal_name}を削除`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}