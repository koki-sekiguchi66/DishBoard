/**
 * PFCSummary — PFC 栄養サマリーダッシュボード
 *
 * 設計判断:
 *   - goals は optional。未指定なら現在値のみを表示する
 *   - 表示は控えめに: "1500/2000" の "/2000" 部分は小さい text-muted
 *   - 4カラムグリッドの幅は変えず、文字サイズで吸収
 *   - 目標値がある項目だけ、MeasureField の目盛り帯（ADR #18）と統一感のある
 *     ゲージバーを添える（ADR #21）。目標未設定・値未取得時はバーを出さない
 */
import { cn } from "@/lib/utils";
import type { NutritionGoals } from "@/types";

interface PFCSummaryProps {
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  /** 目標値（任意）。指定時は現在値の隣に小さく表示 */
  goals?: Partial<NutritionGoals>;
}

interface NutrientDisplayProps {
  label: string;
  value: number | null;
  goal?: number;
  unit: string;
  colorClass: string;
  barColorClass: string;
}

function NutrientDisplay({
  label,
  value,
  goal,
  unit,
  colorClass,
  barColorClass,
}: NutrientDisplayProps) {
  const pct =
    value != null && goal ? Math.min(100, Math.max(0, (value / goal) * 100)) : null;

  return (
    <div className="text-center">
      <div className="flex items-baseline justify-center gap-0.5">
        <span className={cn("text-2xl font-bold tabular-nums", colorClass)}>
          {value != null ? Math.round(value) : "--"}
        </span>
        {goal != null && (
          <span className="text-[10px] text-muted-foreground tabular-nums">
            /{goal}
          </span>
        )}
      </div>
      <div className="text-[11px] text-muted-foreground">
        {unit !== "" && <span className="mr-0.5">{unit}</span>}
        {label}
      </div>
      {pct != null && (
        <div
          className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
          aria-hidden="true"
        >
          <div
            className={cn("h-full rounded-full", barColorClass)}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function PFCSummary({
  calories,
  protein,
  fat,
  carbs,
  goals,
}: PFCSummaryProps) {
  return (
    <div
      className="grid grid-cols-4 gap-2 rounded-xl border border-border bg-card p-4"
      role="region"
      aria-label="栄養サマリー"
    >
      <NutrientDisplay
        label=""
        value={calories}
        goal={goals?.calories}
        unit="kcal"
        colorClass="text-calories"
        barColorClass="bg-calories"
      />
      <NutrientDisplay
        label="P"
        value={protein}
        goal={goals?.protein}
        unit="g"
        colorClass="text-protein"
        barColorClass="bg-protein"
      />
      <NutrientDisplay
        label="F"
        value={fat}
        goal={goals?.fat}
        unit="g"
        colorClass="text-fat"
        barColorClass="bg-fat"
      />
      <NutrientDisplay
        label="C"
        value={carbs}
        goal={goals?.carbs}
        unit="g"
        colorClass="text-carbs"
        barColorClass="bg-carbs"
      />
    </div>
  );
}
