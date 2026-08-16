/**
 * CustomFoodNutritionFields — Myアイテムの「100gあたり栄養素」入力欄
 *
 * 新規作成モーダルと編集モーダルで同じ12項目を扱うため、欄の定義と
 * 文字列 ⇔ 数値の変換をここに集約する。フィールド名は
 * CustomFood モデルのものをそのまま使う（carbs / fiber の語幹に注意）。
 */
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { TrendingUp, Eye, EyeOff } from "lucide-react";
import { MeasureField, type MeasureAccent } from "@/components/inputs";
import type { CustomFood, Per100gField } from "@/types";

/** 入力途中の空欄を許すため、フォーム上は文字列で保持する */
export type Per100gFormValues = Record<Per100gField, string>;

interface FieldDef {
  name: Per100gField;
  label: string;
  unit: string;
  step: number;
  accent?: MeasureAccent;
}

const BASIC_FIELDS: FieldDef[] = [
  { name: "calories_per_100g", label: "カロリー", unit: "kcal", step: 10, accent: "calories" },
  { name: "protein_per_100g", label: "タンパク質", unit: "g", step: 1, accent: "protein" },
  { name: "fat_per_100g", label: "脂質", unit: "g", step: 1, accent: "fat" },
  { name: "carbs_per_100g", label: "炭水化物", unit: "g", step: 1, accent: "carbs" },
];

const ADVANCED_FIELDS: FieldDef[] = [
  { name: "fiber_per_100g", label: "食物繊維", unit: "g", step: 0.1 },
  { name: "sodium_per_100g", label: "ナトリウム", unit: "mg", step: 1 },
  { name: "calcium_per_100g", label: "カルシウム", unit: "mg", step: 10 },
  { name: "iron_per_100g", label: "鉄分", unit: "mg", step: 0.1 },
  { name: "vitamin_a_per_100g", label: "ビタミンA", unit: "μg", step: 10 },
  { name: "vitamin_b1_per_100g", label: "ビタミンB1", unit: "mg", step: 0.01 },
  { name: "vitamin_b2_per_100g", label: "ビタミンB2", unit: "mg", step: 0.01 },
  { name: "vitamin_c_per_100g", label: "ビタミンC", unit: "mg", step: 1 },
];

const ALL_FIELDS = [...BASIC_FIELDS, ...ADVANCED_FIELDS];

/** 新規作成時の初期値。0 埋めではなく空欄にして、消してから打ち直す手間をなくす */
export const EMPTY_PER_100G_VALUES: Per100gFormValues = Object.fromEntries(
  ALL_FIELDS.map((field) => [field.name, ""])
) as Per100gFormValues;

/** 既存の Myアイテムを編集フォームの初期値へ */
export const toPer100gFormValues = (food: CustomFood): Per100gFormValues =>
  Object.fromEntries(
    ALL_FIELDS.map((field) => [field.name, String(food[field.name] ?? "")])
  ) as Per100gFormValues;

/** 送信用に数値へ戻す。空欄は 0 */
export const toPer100gNumbers = (
  values: Per100gFormValues
): Record<Per100gField, number> =>
  Object.fromEntries(
    ALL_FIELDS.map((field) => {
      const parsed = parseFloat(values[field.name]);
      return [field.name, Number.isFinite(parsed) ? parsed : 0];
    })
  ) as Record<Per100gField, number>;

interface CustomFoodNutritionFieldsProps {
  values: Per100gFormValues;
  onChange: (field: Per100gField, value: string) => void;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
}

export default function CustomFoodNutritionFields({
  values,
  onChange,
  showAdvanced,
  onToggleAdvanced,
}: CustomFoodNutritionFieldsProps) {
  const renderField = (field: FieldDef) => (
    <MeasureField
      key={field.name}
      label={field.label}
      unit={field.unit}
      step={field.step}
      accent={field.accent}
      value={values[field.name]}
      onChange={(value) => onChange(field.name, value)}
    />
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <TrendingUp className="h-4 w-4" />
          栄養成分（100gあたり）
        </span>
        <Button variant="outline" size="sm" onClick={onToggleAdvanced}>
          {showAdvanced ? (
            <>
              <EyeOff className="mr-1 h-4 w-4" />
              閉じる
            </>
          ) : (
            <>
              <Eye className="mr-1 h-4 w-4" />
              詳細な栄養素を表示
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {BASIC_FIELDS.map(renderField)}
        </div>

        {showAdvanced && (
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 sm:grid-cols-4">
            {ADVANCED_FIELDS.map(renderField)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
