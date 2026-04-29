/**
 * GoalSettings — 栄養目標値設定コンポーネント
 *
 * Phase 4 で導入。目標カロリーと PFC 比率を設定し、localStorage に永続化する。
 *
 * UX 設計:
 *   - カロリーは Slider（1200〜3500 kcal、50 kcal 刻み）
 *   - PFC は比率（％）の Slider で操作する
 *     → 合計が 100% になるよう、変更時に他の2栄養素を比例配分で調整
 *   - 表示は「タンパク質 20% (100g)」のように比率と g を併記
 *
 * データモデル:
 *   - 内部状態: percentages (P/F/C の％)
 *   - 永続化: NutritionGoals (calories + g単位の P/F/C) で保存
 *   - 比率 → g 変換は KCAL_PER_GRAM 定数を使用
 *     例: 2000kcal × 20% ÷ 4kcal/g = 100g (タンパク質)
 *
 * 設計判断:
 *   - 比率の合計を 100% に保つ「自動調整」ロジック
 *     → 1つを動かすと、他の2つが現在比で按分される
 *     → これにより、ユーザーは「合計を意識せず」直感的に操作できる
 *   - リセットボタンで DEFAULT_GOALS に戻せる
 *   - useGoalSettings フックを通じて永続化（fault tolerance はフック側）
 */
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

/** カロリー Slider の範囲。マジックナンバー排除 */
const CALORIE_RANGE = {
  min: 1200,
  max: 3500,
  step: 50,
} as const;

/** PFC 比率 Slider の範囲（％） */
const RATIO_RANGE = {
  min: 5,
  max: 80,
  step: 1,
} as const;

/** デフォルト比率（％）。DEFAULT_GOALS と整合 */
const DEFAULT_RATIOS = {
  protein: 20,
  fat: 25,
  carbs: 55,
} as const;

const TOTAL_PERCENT = 100;

/**
 * NutritionGoals (g単位) → 比率 (％) に変換
 * 各栄養素のカロリー寄与から比率を逆算する。
 */
function goalsToRatios(goals: NutritionGoals): {
  protein: number;
  fat: number;
  carbs: number;
} {
  const total = goals.calories;
  if (total <= 0) return { ...DEFAULT_RATIOS };

  return {
    protein: Math.round((goals.protein * KCAL_PER_GRAM.protein * 100) / total),
    fat: Math.round((goals.fat * KCAL_PER_GRAM.fat * 100) / total),
    carbs: Math.round((goals.carbs * KCAL_PER_GRAM.carbs * 100) / total),
  };
}

/**
 * 比率 (％) + カロリー → NutritionGoals (g単位) に変換
 */
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
 * 1つの栄養素の比率を変更したとき、他の2つを按分調整して合計100%を維持する。
 *
 * アルゴリズム:
 *   1. 残り合計（100 - newValue）を求める
 *   2. 他の2つの現在比率の合計を求める
 *   3. 各栄養素を「残り合計 × (現在比率 / 他2つの合計)」で再計算
 *   4. 端数調整: round で誤差が出たら 1 つ目に吸収させる
 *
 * 例: protein 20→30 に変更（fat 25, carbs 55）
 *   残り = 70, 他合計 = 80
 *   fat  = 70 * 25/80 = 21.875 → 22
 *   carbs = 70 * 55/80 = 48.125 → 48
 *   合計 30+22+48 = 100 ✅
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

  // エッジケース: 他の2つが両方0なら均等配分
  if (otherSum <= 0) {
    const each = Math.floor(remaining / 2);
    const result = { ...current, [changed]: newValue };
    result[others[0]] = each;
    result[others[1]] = remaining - each; // 端数を2つ目に
    return result;
  }

  const result = { ...current, [changed]: newValue };
  result[others[0]] = Math.round((remaining * current[others[0]]) / otherSum);
  // 端数は 2 つ目で吸収（合計を必ず 100 にする）
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

  // 内部状態は比率（％）で管理。マウント時に goals から逆算
  const [ratios, setRatios] = useState(() => goalsToRatios(goals));

  // goals が外部要因で変わった場合（リセット等）に内部状態も同期
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
        {/* カロリー目標 */}
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

        {/* 区切り */}
        <div className="h-px bg-border" />

        {/* PFC 比率設定 */}
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
