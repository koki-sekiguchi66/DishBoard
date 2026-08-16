/**
 * useSaveMealAsMenu — 既存の食事記録を Myメニューとして保存する
 *
 * 食事記録の一覧・編集画面が持つのは集計値のみで、明細（items）は
 * 一覧APIのレスポンスに含まれない（MealRecordListSerializer が明細を返さないため）。
 * そのため保存の直前に詳細を取得し直し、明細から Myメニューを組み立てる。
 */
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { mealApi } from "@/features/meals/api/mealApi";
import { customMenuApi } from "../api/customMenuApi";
import type { CustomMenu, MealRecordItem } from "@/types";

const toMenuItemPayload = (item: MealRecordItem, index: number) => ({
  item_type: item.item_type,
  item_id: item.item_id,
  item_name: item.item_name,
  amount_grams: item.amount_grams,
  display_order: index + 1,
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

export function useSaveMealAsMenu() {
  const [isSaving, setIsSaving] = useState(false);

  const saveMealAsMenu = useCallback(
    async (
      mealId: number,
      name: string,
      description = ""
    ): Promise<CustomMenu | null> => {
      setIsSaving(true);
      try {
        const detail = await mealApi.getMealDetail(mealId);
        if (!detail.items || detail.items.length === 0) {
          toast.error("この記録には明細がないため、Myメニューとして保存できません");
          return null;
        }

        const menu = await customMenuApi.createMenu({
          name,
          description,
          items: detail.items.map(toMenuItemPayload),
        });
        toast.success(`Myメニュー「${menu.name}」として保存しました`);
        return menu;
      } catch {
        toast.error("Myメニューの保存に失敗しました");
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  return { saveMealAsMenu, isSaving };
}
