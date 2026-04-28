/**
 * MealForm — 食事記録フォーム（Tailwind版）
 *
 * Phase 3: Bootstrap Row/Col → Tailwind grid。
 * react-hot-toast は Phase 4 で sonner に置換予定。現時点では維持。
 *
 * アーキテクチャ:
 *   MealForm はプレゼンテーション層のみ。
 *   ビジネスロジック（カート管理・送信）は useMenuBuilder フックに委譲。
 */
import { useMenuBuilder } from "../hooks/useMenuBuilder";
import MenuBuilderPanel from "./MenuBuilderPanel";
import MenuPreviewPanel from "./MenuPreviewPanel";
import { Toaster } from "react-hot-toast";
import type { MealRecord } from "@/types";

interface MealFormProps {
  onMealCreated: (meal: MealRecord) => void;
}

export default function MealForm({ onMealCreated }: MealFormProps) {
  const menuBuilder = useMenuBuilder(onMealCreated);

  return (
    <>
      <Toaster position="top-right" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
        {/* 左側: メニュービルダー */}
        <div className="lg:col-span-4">
          <MenuBuilderPanel menuBuilder={menuBuilder} />
        </div>

        {/* 右側: プレビュー */}
        <div className="lg:col-span-3">
          <div className="sticky top-5">
            <MenuPreviewPanel menuBuilder={menuBuilder} />
          </div>
        </div>
      </div>
    </>
  );
}
