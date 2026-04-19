import { FoodChip } from "./FoodChip";
import type { Meal } from "../types";

interface FoodChipListProps {
  meals: Meal[];
  onEdit?: (meal: Meal) => void;
  onDelete?: (mealId: number) => void;
  emptyMessage?: string;
}

export function FoodChipList({
  meals,
  onEdit,
  onDelete,
  emptyMessage = "記録がありません",
}: FoodChipListProps) {
  if (meals.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {meals.map((meal) => (
        <FoodChip
          key={meal.id}
          meal={meal}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}