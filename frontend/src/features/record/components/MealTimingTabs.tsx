import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FoodChipList } from "./FoodChipList";
import { cn } from "@/lib/utils";
import type { Meal } from "../types";

interface MealTimingTabsProps {
  meals: Meal[];
  onEdit?: (meal: Meal) => void;
  onDelete?: (mealId: number) => void;
}

const TIMINGS = [
  { value: "breakfast", label: "朝食", emoji: "☀️", colorClass: "data-[state=active]:text-breakfast" },
  { value: "lunch", label: "昼食", emoji: "⛅", colorClass: "data-[state=active]:text-lunch" },
  { value: "dinner", label: "夕食", emoji: "🌙", colorClass: "data-[state=active]:text-dinner" },
  { value: "snack", label: "間食", emoji: "🍩", colorClass: "data-[state=active]:text-snack" },
] as const;

export function MealTimingTabs({ meals, onEdit, onDelete }: MealTimingTabsProps) {
  const groupedMeals = TIMINGS.reduce(
    (acc, timing) => {
      acc[timing.value] = meals.filter((m) => m.meal_timing === timing.value);
      return acc;
    },
    {} as Record<string, Meal[]>
  );

  return (
    <Tabs defaultValue="breakfast" className="w-full">
      <TabsList className="grid w-full grid-cols-4 bg-secondary/50">
        {TIMINGS.map((timing) => {
          const count = groupedMeals[timing.value]?.length ?? 0;
          return (
            <TabsTrigger
              key={timing.value}
              value={timing.value}
              className={cn("flex items-center gap-1 text-xs", timing.colorClass)}
            >
              <span>{timing.emoji}</span>
              <span>{timing.label}</span>
              {count > 0 && (
                <span className="ml-0.5 rounded-full bg-primary/20 px-1.5 text-[10px] font-semibold text-primary">
                  {count}
                </span>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>

      {TIMINGS.map((timing) => (
        <TabsContent key={timing.value} value={timing.value} className="mt-3">
          <FoodChipList
            meals={groupedMeals[timing.value] ?? []}
            onEdit={onEdit}
            onDelete={onDelete}
            emptyMessage={`${timing.label}の記録がありません`}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}