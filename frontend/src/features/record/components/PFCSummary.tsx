import { cn } from "@/lib/utils";

interface PFCSummaryProps {
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
}

interface NutrientDisplayProps {
  label: string;
  value: number | null;
  unit: string;
  colorClass: string;
}

function NutrientDisplay({ label, value, unit, colorClass }: NutrientDisplayProps) {
  return (
    <div className="text-center">
      <div className={cn("text-2xl font-bold tabular-nums", colorClass)}>
        {value != null ? Math.round(value) : "--"}
      </div>
      <div className="text-[11px] text-muted-foreground">
        {unit !== "" && <span className="mr-0.5">{unit}</span>}
        {label}
      </div>
    </div>
  );
}

export function PFCSummary({ calories, protein, fat, carbs }: PFCSummaryProps) {
  return (
    <div className="grid grid-cols-4 gap-2 rounded-xl bg-secondary/50 p-4" role="region" aria-label="栄養サマリー">
      <NutrientDisplay
        label=""
        value={calories}
        unit="kcal"
        colorClass="text-calories"
      />
      <NutrientDisplay
        label="P"
        value={protein}
        unit="g"
        colorClass="text-protein"
      />
      <NutrientDisplay
        label="F"
        value={fat}
        unit="g"
        colorClass="text-fat"
      />
      <NutrientDisplay
        label="C"
        value={carbs}
        unit="g"
        colorClass="text-carbs"
      />
    </div>
  );
}