import { useState, useEffect } from "react";
import { Target, RotateCcw, Flame, Beef, Droplets, Wheat } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useGoalSettings } from "../hooks/useGoalSettings";
import {
  DEFAULT_GOALS,
  KCAL_PER_GRAM,
  type NutritionGoals,
} from "@/types/settings";

const CALORIE_RANGE = { min: 1200, max: 3500, step: 50 } as const;
const RATIO_RANGE = { min: 5, max: 80, step: 1 } as const;
const DEFAULT_RATIOS = { protein: 20, fat: 25, carbs: 55 } as const;
const TOTAL_PERCENT = 100;

function goalsToRatios(goals: NutritionGoals): { protein: number; fat: number; carbs: number } {
  const total = goals.calories;
  if (total <= 0) return { ...DEFAULT_RATIOS };

  return {
    protein: Math.round((goals.protein * KCAL_PER_GRAM.protein * 100) / total),
    fat: Math.round((goals.fat * KCAL_PER_GRAM.fat * 100) / total),
    carbs: Math.round((goals.carbs * KCAL_PER_GRAM.carbs * 100) / total),
  };
}

function ratiosToGoals(
  calories: number,
  ratios: { protein: number; fat: number; carbs: number }
): NutritionGoals {
  return {
    calories,
    protein: Math.round((calories * ratios.protein) / 100 / KCAL_PER_GRAM.protein),
    fat: Math.round((calories * ratios.fat) / 100 / KCAL_PER_GRAM.fat),
    carbs: Math.round((calories * ratios.carbs) / 100 / KCAL_PER_GRAM.carbs),
  };
}

/**
 * 1つの比率を変更したとき他の2つを現在比で按分し合計 100% を維持する。
 * 端数は2つ目に吸収して合計を必ず 100 に保つ。
 */
function rebalanceRatios(
  changed: "protein" | "fat" | "carbs",
  newValue: number,
  current: { protein: number; fat: number; carbs: number }
): { protein: number; fat: number; carbs: number } {
  const remaining = TOTAL_PERCENT - newValue;
  const others = (Object.keys(current) as Array<keyof typeof current>).filter(
    (k) => k !== changed
  );
  const otherSum = others.reduce((sum, k) => sum + current[k], 0);

  if (otherSum <= 0) {
    const each = Math.floor(remaining / 2);
    const result = { ...current, [changed]: newValue };
    result[others[0]] = each;
    result[others[1]] = remaining - each;
    return result;
  }

  const result = { ...current, [changed]: newValue };
  result[others[0]] = Math.round((remaining * current[others[0]]) / otherSum);
  result[others[1]] = remaining - result[others[0]];

  return result;
}

interface NutrientSliderProps {
  label: string;
  icon: React.ReactNode;
  ratio: number;
  grams: number;
  colorClass: string;
  onValueChange: (value: number) => void;
}

function NutrientSlider({
  label,
  icon,
  ratio,
  grams,
  colorClass,
  onValueChange,
}: NutrientSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className={`flex items-center gap-1.5 font-medium ${colorClass}`}>
          {icon}
          {label}
        </span>
        <span className="tabular-nums text-muted-foreground">
          <span className="font-bold text-foreground">{ratio}%</span>
          <span className="ml-1.5">({grams}g)</span>
        </span>
      </div>
      <Slider
        aria-label={label}
        value={[ratio]}
        min={RATIO_RANGE.min}
        max={RATIO_RANGE.max}
        step={RATIO_RANGE.step}
        onValueChange={(values) => onValueChange(values[0])}
      />
    </div>
  );
}

export function GoalSettings() {
  const { goals, updateGoals } = useGoalSettings();

  const [ratios, setRatios] = useState(() => goalsToRatios(goals));

  useEffect(() => {
    setRatios(goalsToRatios(goals));
  }, [goals]);

  const handleCalorieChange = (newCalories: number) => {
    const newGoals = ratiosToGoals(newCalories, ratios);
    updateGoals(newGoals);
  };

  const handleRatioChange = (
    nutrient: "protein" | "fat" | "carbs",
    newValue: number
  ) => {
    const newRatios = rebalanceRatios(nutrient, newValue, ratios);
    setRatios(newRatios);
    const newGoals = ratiosToGoals(goals.calories, newRatios);
    updateGoals(newGoals);
  };

  const handleReset = () => {
    updateGoals(DEFAULT_GOALS);
    setRatios({ ...DEFAULT_RATIOS });
  };

  const totalRatio = ratios.protein + ratios.fat + ratios.carbs;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            目標設定
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-7 text-xs"
          >
            <RotateCcw className="mr-1 h-3 w-3" />
            リセット
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent
        className="space-y-6"
        role="region"
        aria-label="栄養目標設定"
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 font-medium text-calories">
              <Flame className="h-3.5 w-3.5" />
              目標カロリー
            </span>
            <span className="tabular-nums">
              <span className="text-lg font-bold text-foreground">
                {goals.calories}
              </span>
              <span className="ml-1 text-xs text-muted-foreground">kcal</span>
            </span>
          </div>
          <Slider
            aria-label="カロリー"
            value={[goals.calories]}
            min={CALORIE_RANGE.min}
            max={CALORIE_RANGE.max}
            step={CALORIE_RANGE.step}
            onValueChange={(values) => handleCalorieChange(values[0])}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{CALORIE_RANGE.min}</span>
            <span>{CALORIE_RANGE.max} kcal</span>
          </div>
        </div>

        <div className="h-px bg-border" />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-foreground">PFC バランス</h4>
            <span
              className={`text-xs tabular-nums ${
                totalRatio === TOTAL_PERCENT
                  ? "text-muted-foreground"
                  : "text-destructive"
              }`}
            >
              合計: {totalRatio}%
            </span>
          </div>

          <NutrientSlider
            label="タンパク質"
            icon={<Beef className="h-3.5 w-3.5" />}
            ratio={ratios.protein}
            grams={goals.protein}
            colorClass="text-protein"
            onValueChange={(v) => handleRatioChange("protein", v)}
          />

          <NutrientSlider
            label="脂質"
            icon={<Droplets className="h-3.5 w-3.5" />}
            ratio={ratios.fat}
            grams={goals.fat}
            colorClass="text-fat"
            onValueChange={(v) => handleRatioChange("fat", v)}
          />

          <NutrientSlider
            label="炭水化物"
            icon={<Wheat className="h-3.5 w-3.5" />}
            ratio={ratios.carbs}
            grams={goals.carbs}
            colorClass="text-carbs"
            onValueChange={(v) => handleRatioChange("carbs", v)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
