import { useMenuBuilder } from "../hooks/useMenuBuilder";
import MenuBuilderPanel from "./MenuBuilderPanel";
import MenuPreviewPanel from "./MenuPreviewPanel";
import type { MealRecord } from "@/types";

interface MealFormProps {
  onMealCreated: (meal: MealRecord) => void;
}

export default function MealForm({ onMealCreated }: MealFormProps) {
  const menuBuilder = useMenuBuilder(onMealCreated);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
      <div className="lg:col-span-4">
        <MenuBuilderPanel menuBuilder={menuBuilder} />
      </div>
      <div className="lg:col-span-3">
        <div className="sticky top-5">
          <MenuPreviewPanel menuBuilder={menuBuilder} />
        </div>
      </div>
    </div>
  );
}
