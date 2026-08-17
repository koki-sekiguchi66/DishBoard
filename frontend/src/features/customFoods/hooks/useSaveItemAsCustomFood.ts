/**
 * useSaveItemAsCustomFood — 食事記録の品目1件をMyアイテムとして保存する
 *
 * MealRecordItem は amount_grams ぶんの実数値でしか栄養素を持たないため、
 * CustomFood（100gあたり）へ換算してから保存する。換算は PER_100G_FIELD
 * （記録側の栄養素名 → CustomFood の100gあたりフィールド名）を経由する。
 */
import { useCallback, useState } from "react";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { customFoodApi } from "../api/customFoodApi";
import type { CustomFood, MealRecordItem } from "@/types";
import { FULL_NUTRITION_KEYS, PER_100G_FIELD } from "@/types";

const toPer100gPayload = (item: MealRecordItem): Partial<CustomFood> => {
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
