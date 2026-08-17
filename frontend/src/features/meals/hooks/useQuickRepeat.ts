/**
 * useQuickRepeat — 過去の食事記録と同じ内容を、指定日にワンタップで再記録する
 *
 * 一覧の meal は明細を持たないため（MealRecordListSerializer）、
 * 再記録の直前に詳細を取得し直してから明細ごと複製する。
 */
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { mealApi } from "../api/mealApi";
import type { MealRecord, MealRecordItem } from "@/types";

const toItemPayload = (item: MealRecordItem) => ({
  item_type: item.item_type,
  item_id: item.item_id,
  item_name: item.item_name,
  amount_grams: item.amount_grams,
  display_order: item.display_order,
  calories: item.calories,
  protein: item.protein,
  fat: item.fat,
  carbohydrates: item.carbohydrates,
  dietary_fiber: item.dietary_fiber,
  sodium: item.sodium,
  calcium: item.calcium,
  iron: item.iron,
  vitamin_a: item.vitamin_a,
  vitamin_b1: item.vitamin_b1,
  vitamin_b2: item.vitamin_b2,
  vitamin_c: item.vitamin_c,
});

export function useQuickRepeat() {
  const [isRepeating, setIsRepeating] = useState(false);

  const repeatMeal = useCallback(
    async (pastMeal: MealRecord, recordDate: string): Promise<MealRecord | null> => {
      setIsRepeating(true);
      try {
        const detail = await mealApi.getMealDetail(pastMeal.id);
        const created = await mealApi.createMeal({
          record_date: recordDate,
          meal_timing: detail.meal_timing,
          meal_name: detail.meal_name,
          calories: detail.calories,
          protein: detail.protein,
          fat: detail.fat,
          carbohydrates: detail.carbohydrates,
          dietary_fiber: detail.dietary_fiber,
          sodium: detail.sodium,
          calcium: detail.calcium,
          iron: detail.iron,
          vitamin_a: detail.vitamin_a,
          vitamin_b1: detail.vitamin_b1,
          vitamin_b2: detail.vitamin_b2,
          vitamin_c: detail.vitamin_c,
          items: detail.items.map(toItemPayload),
        });
        toast.success(`「${created.meal_name}」を記録しました`);
        return created;
      } catch {
        toast.error("記録の再登録に失敗しました");
        return null;
      } finally {
        setIsRepeating(false);
      }
    },
    []
  );

  return { repeatMeal, isRepeating };
}
