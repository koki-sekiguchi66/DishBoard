import { useState, useMemo } from "react";
import { mealApi } from "../api/mealApi";
import { customMenuApi } from "@/features/customMenus/api/customMenuApi";
import { toast } from "sonner";
import type {
  FullNutrition,
  MealTiming,
  MenuBuilderItem,
  CustomMenu,
  ItemType,
  MealRecord,
} from "@/types";
import { EMPTY_NUTRITION, FULL_NUTRITION_KEYS } from "@/types";

type InputMethod = "search" | "myItems" | "myMenus" | "cafeteria" | "ocr" | "manual";

export interface MenuBuilderReturn {
  recordDate: string;
  setRecordDate: (date: string) => void;
  mealTiming: MealTiming;
  setMealTiming: (timing: MealTiming) => void;
  activeInputMethod: InputMethod;
  setActiveInputMethod: (method: InputMethod) => void;
  menuItems: MenuBuilderItem[];
  totalNutrition: FullNutrition;
  addMenuItem: (item: Record<string, unknown>) => void;
  removeMenuItem: (tempId: number) => void;
  loadFromCustomMenu: (menuDetail: CustomMenu) => void;
  handleClearMenu: () => void;
  saveAsMenu: boolean;
  setSaveAsMenu: (v: boolean) => void;
  menuName: string;
  setMenuName: (v: string) => void;
  menuDescription: string;
  setMenuDescription: (v: string) => void;
  handleSubmit: () => Promise<void>;
  isSubmitting: boolean;
}

export const useMenuBuilder = (
  onMealCreated: (meal: MealRecord) => void
): MenuBuilderReturn => {
  const [recordDate, setRecordDate] = useState(
    () => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
  );
  const [mealTiming, setMealTiming] = useState<MealTiming>("breakfast");
  const [activeInputMethod, setActiveInputMethod] = useState<InputMethod>("search");
  const [menuItems, setMenuItems] = useState<MenuBuilderItem[]>([]);
  const [saveAsMenu, setSaveAsMenu] = useState(false);
  const [menuName, setMenuName] = useState("");
  const [menuDescription, setMenuDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalNutrition = useMemo<FullNutrition>(() => {
    return menuItems.reduce<FullNutrition>((acc, item) => {
      const result = { ...acc };
      for (const key of FULL_NUTRITION_KEYS) {
        result[key] = (result[key] || 0) + (item[key] || 0);
      }
      return result;
    }, { ...EMPTY_NUTRITION });
  }, [menuItems]);

  const addMenuItem = (item: Record<string, unknown>) => {
    const newItem: MenuBuilderItem = {
      ...(item as unknown as MenuBuilderItem),
      tempId: Date.now() + Math.random(),
      display_order: menuItems.length + 1,
    };
    setMenuItems([...menuItems, newItem]);
    toast.success(`${item.item_name as string}を追加しました`);
  };

  const removeMenuItem = (tempId: number) => {
    setMenuItems(menuItems.filter((item) => item.tempId !== tempId));
  };

  const loadFromCustomMenu = (menuDetail: CustomMenu) => {
    const items = menuDetail.items ?? [];
    const newItems: MenuBuilderItem[] = items.map((item) => ({
      ...item,
      tempId: Date.now() + Math.random() + item.id,
      display_order: menuItems.length + item.display_order,
      item_type: item.item_type as ItemType,
    }));
    setMenuItems([...menuItems, ...newItems]);
    toast.success(`メニュー「${menuDetail.name}」を読み込みました`);
  };

  const handleClearMenu = () => {
    if (window.confirm("現在のメニューをクリアしますか？")) {
      setMenuItems([]);
      setMenuName("");
      setMenuDescription("");
      setSaveAsMenu(false);
    }
  };

  const handleSubmit = async () => {
    if (menuItems.length === 0) {
      toast.error("アイテムを追加してください");
      return;
    }
    if (saveAsMenu && !menuName.trim()) {
      toast.error("Myメニューとして保存する場合は名前が必要です");
      return;
    }

    setIsSubmitting(true);
    try {
      const finalMealName = saveAsMenu
        ? menuName
        : menuItems[0].item_name + (menuItems.length > 1 ? " 他" : "");

      const mealRecordData = {
        record_date: recordDate,
        meal_timing: mealTiming,
        meal_name: finalMealName,
        ...totalNutrition,
        items: menuItems.map((item, index) => ({
          item_type: item.item_type || "standard",
          item_id: item.item_id || 0,
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
        })),
      };

      const createdMeal = await mealApi.createMeal(mealRecordData);

      if (saveAsMenu && menuName.trim()) {
        try {
          await customMenuApi.createMenu({
            name: menuName,
            description: menuDescription,
            items: menuItems.map((item, index) => ({
              item_type: item.item_type || "standard",
              item_id: item.item_id || 0,
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
            })),
          });
          toast.success("Myメニューも保存しました");
        } catch {
          toast.error("Myメニューの保存に失敗しました");
        }
      }

      toast.success("食事記録を登録しました！");
      onMealCreated(createdMeal);

      setMenuItems([]);
      setMenuName("");
      setMenuDescription("");
      setSaveAsMenu(false);
    } catch {
      toast.error("食事記録の登録に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    recordDate,
    setRecordDate,
    mealTiming,
    setMealTiming,
    activeInputMethod,
    setActiveInputMethod,
    menuItems,
    totalNutrition,
    addMenuItem,
    removeMenuItem,
    loadFromCustomMenu,
    handleClearMenu,
    saveAsMenu,
    setSaveAsMenu,
    menuName,
    setMenuName,
    menuDescription,
    setMenuDescription,
    handleSubmit,
    isSubmitting,
  };
};
