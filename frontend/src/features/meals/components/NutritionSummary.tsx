/**
 * NutritionSummary — 栄養素サマリーテーブル（Tailwind版）
 *
 * Phase 3: Bootstrap Table → Tailwind table。
 * MenuPreviewPanel の合計栄養素表示で使用。
 */
import { cn } from "@/lib/utils";
import type { FullNutrition } from "@/types";

interface NutritionItem {
  label: string;
  key: keyof FullNutrition;
  unit: string;
  decimals: number;
}

const NUTRITION_ITEMS: NutritionItem[] = [
  { label: "エネルギー", key: "calories", unit: "kcal", decimals: 0 },
  { label: "タンパク質", key: "protein", unit: "g", decimals: 1 },
  { label: "脂質", key: "fat", unit: "g", decimals: 1 },
  { label: "炭水化物", key: "carbohydrates", unit: "g", decimals: 1 },
  { label: "食物繊維", key: "dietary_fiber", unit: "g", decimals: 1 },
  { label: "食塩相当量", key: "sodium", unit: "g", decimals: 2 },
  { label: "カルシウム", key: "calcium", unit: "mg", decimals: 0 },
  { label: "鉄", key: "iron", unit: "mg", decimals: 1 },
  { label: "ビタミンA", key: "vitamin_a", unit: "μg", decimals: 0 },
  { label: "ビタミンB1", key: "vitamin_b1", unit: "mg", decimals: 2 },
  { label: "ビタミンB2", key: "vitamin_b2", unit: "mg", decimals: 2 },
  { label: "ビタミンC", key: "vitamin_c", unit: "mg", decimals: 0 },
];

interface NutritionSummaryProps {
  nutrition: FullNutrition;
  /** true の場合、基本4栄養素のみ表示 */
  simple?: boolean;
}

export default function NutritionSummary({
  nutrition,
  simple = false,
}: NutritionSummaryProps) {
  const items = simple ? NUTRITION_ITEMS.slice(0, 4) : NUTRITION_ITEMS;

  return (
    <table className="w-full text-sm">
      <tbody>
        {items.map((item) => (
          <tr
            key={item.key}
            className={cn(
              "border-b border-border last:border-b-0",
              item.key === "calories" && "text-primary"
            )}
          >
            <td className="py-1.5 font-medium text-muted-foreground">
              {item.label}
            </td>
            <td className="py-1.5 text-right font-semibold text-foreground">
              {(nutrition[item.key] ?? 0).toFixed(item.decimals)} {item.unit}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
