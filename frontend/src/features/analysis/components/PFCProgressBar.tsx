/**
 * PFCProgressBar — PFC 目標比プログレスバー
 *
 * PFCSummary の拡張として、各栄養素の目標値に対する達成率をバーで可視化。
 * 目標値が未設定の場合は一般的な成人の目安値（厚生労働省「日本人の食事摂取基準」参考）を使用。
 *
 * 設計判断:
 *   - 目標値はハードコーディングせず props で受け取る（Phase 4 の GoalSettings で動的変更）
 *   - デフォルト値は定数化し、マジックナンバーを排除
 */
import { Flame, Beef, Droplets, Wheat } from "lucide-react";
import { Progress } from "@/components/ui/progress";

/** デフォルト目標値（成人男性の一般的な目安） */
const DEFAULT_GOALS = {
  calories: 2200,
  protein: 65,
  fat: 60,
  carbs: 300,
} as const;

interface NutritionGoals {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

interface PFCProgressBarProps {
  /** 現在の摂取量 */
  current: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
  /** 目標値（未指定時はデフォルト値を使用） */
  goals?: Partial<NutritionGoals>;
}

interface NutrientRowProps {
  label: string;
  current: number;
  goal: number;
  unit: string;
  icon: React.ReactNode;
  colorClass: string;
}

function NutrientRow({ label, current, goal, unit, icon, colorClass }: NutrientRowProps) {
  const percent = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className="tabular-nums text-foreground">
          {Math.round(current)}
          <span className="text-muted-foreground">/{goal}{unit}</span>
          <span className="ml-1 text-muted-foreground">({percent}%)</span>
        </span>
      </div>
      <Progress value={percent} indicatorClassName={colorClass} />
    </div>
  );
}

export function PFCProgressBar({ current, goals }: PFCProgressBarProps) {
  const g: NutritionGoals = {
    calories: goals?.calories ?? DEFAULT_GOALS.calories,
    protein: goals?.protein ?? DEFAULT_GOALS.protein,
    fat: goals?.fat ?? DEFAULT_GOALS.fat,
    carbs: goals?.carbs ?? DEFAULT_GOALS.carbs,
  };

  return (
    <div className="space-y-3" role="region" aria-label="栄養素目標達成状況">
      <NutrientRow
        label="カロリー"
        current={current.calories}
        goal={g.calories}
        unit="kcal"
        icon={<Flame className="h-3.5 w-3.5" />}
        colorClass="bg-primary"
      />
      <NutrientRow
        label="タンパク質"
        current={current.protein}
        goal={g.protein}
        unit="g"
        icon={<Beef className="h-3.5 w-3.5" />}
        colorClass="bg-blue-500"
      />
      <NutrientRow
        label="脂質"
        current={current.fat}
        goal={g.fat}
        unit="g"
        icon={<Droplets className="h-3.5 w-3.5" />}
        colorClass="bg-yellow-500"
      />
      <NutrientRow
        label="炭水化物"
        current={current.carbs}
        goal={g.carbs}
        unit="g"
        icon={<Wheat className="h-3.5 w-3.5" />}
        colorClass="bg-green-500"
      />
    </div>
  );
}
