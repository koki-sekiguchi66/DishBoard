/**
 * useSaveItemAsCustomFood — 食事記録の品目1件をMyアイテムとして保存する
 *
 * 重量があれば100g当たり、重量不明なら食数で割った1食分として保存する。
 */
import { useCallback, useState } from "react";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { customFoodApi } from "../api/customFoodApi";
import type { CustomFood, MealRecordItem } from "@/types";
import { EMPTY_NUTRITION, FULL_NUTRITION_KEYS, PER_100G_FIELD } from "@/types";

const toPer100gPayload = (item: MealRecordItem): Partial<CustomFood> => {
  if (item.amount_grams === null) {
    const servings = item.servings;
    if (!servings || servings <= 0) throw new Error('食数が必要です');
    return {
      nutrition_basis: 'per_serving', serving_size_g: null,
      nutrition_per_serving: FULL_NUTRITION_KEYS.reduce((values, key) => {
        values[key] = item[key] / servings;
        return values;
      }, { ...EMPTY_NUTRITION }),
    };
  }
  // amount_grams は MinValueValidator(0) のため 0 もあり得る。0 割りを避ける
  const factor = item.amount_grams > 0 ? 100 / item.amount_grams : 0;
  return Object.fromEntries(
    FULL_NUTRITION_KEYS.map((key) => [PER_100G_FIELD[key], item[key] * factor])
  ) as Partial<CustomFood>;
};

export function useSaveItemAsCustomFood() {
  const [isSaving, setIsSaving] = useState(false);

  const saveItemAsCustomFood = useCallback(
    async (item: MealRecordItem, name: string): Promise<CustomFood | null> => {
      setIsSaving(true);
      try {
        const food = await customFoodApi.createCustomFood({
          name,
          ...toPer100gPayload(item),
        });
        toast.success(`Myアイテム「${food.name}」として保存しました`);
        return food;
      } catch (error: unknown) {
        if (isAxiosError(error) && error.response?.status === 400) {
          toast.error("この名前のMyアイテムは既に登録されています");
        } else {
          toast.error("Myアイテムの保存に失敗しました");
        }
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  return { saveItemAsCustomFood, isSaving };
}
