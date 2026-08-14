/**
 * CurrentMenuDisplay — メニュービルダー内のアイテムリスト
 */
import { X } from "lucide-react";
import type { MenuBuilderReturn } from "../hooks/useMenuBuilder";

interface CurrentMenuDisplayProps {
  menuBuilder: MenuBuilderReturn;
}

export default function CurrentMenuDisplay({
  menuBuilder,
}: CurrentMenuDisplayProps) {
  const { menuItems, removeMenuItem } = menuBuilder;

  return (
    <div className="divide-y divide-border">
      {menuItems.map((item) => (
        <div key={item.tempId} className="flex items-start justify-between px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground">
              {item.item_name}
            </p>
            <p className="text-xs text-muted-foreground">
              {item.amount_grams}g
              <span className="mx-1.5">|</span>
              {Math.round(item.calories)}kcal
            </p>
            <p className="text-[11px] text-muted-foreground">
              P:{(item.protein ?? 0).toFixed(1)}g F:{(item.fat ?? 0).toFixed(1)}g C:
              {(item.carbohydrates ?? 0).toFixed(1)}g
            </p>
          </div>
          <button
            type="button"
            onClick={() => removeMenuItem(item.tempId)}
            className="ml-2 shrink-0 rounded-md p-1 text-destructive hover:bg-destructive/10"
            aria-label={`${item.item_name}を削除`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
