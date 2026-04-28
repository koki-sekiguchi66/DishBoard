/**
 * EditMealModal — 食事記録編集モーダル（Tailwind + shadcn/ui版）
 *
 * Phase 3: Bootstrap Modal → shadcn/ui Dialog。
 * @radix-ui/react-dialog は Sheet 用に導入済みのため追加インストール不要。
 */
import { useState, type ChangeEvent } from "react";
import {
  Pencil,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { mealApi } from "../api/mealApi";
import type { MealRecord } from "@/types";

interface EditMealModalProps {
  meal: MealRecord;
  show: boolean;
  onClose: () => void;
  onMealUpdated: (meal: MealRecord) => void;
}

export default function EditMealModal({
  meal,
  show,
  onClose,
  onMealUpdated,
}: EditMealModalProps) {
  const [mealData, setMealData] = useState({ ...meal });
  const [showAdvancedNutrition, setShowAdvancedNutrition] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setMealData((prev) => ({
      ...prev,
      [name]: name === "meal_name" ? value : parseFloat(value) || 0,
    }));
  };

  const handleSubmit = async () => {
    if (!mealData.meal_name.trim()) {
      setError("食事名を入力してください。");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const updated = await mealApi.updateMeal(meal.id, mealData);
      onMealUpdated(updated);
      onClose();
    } catch {
      setError("更新に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const BASIC_FIELDS = [
    { name: "calories", label: "カロリー (kcal)", step: "0.1" },
    { name: "protein", label: "タンパク質 (g)", step: "0.1" },
    { name: "fat", label: "脂質 (g)", step: "0.1" },
    { name: "carbohydrates", label: "炭水化物 (g)", step: "0.1" },
  ];

  const ADVANCED_FIELDS = [
    { name: "dietary_fiber", label: "食物繊維 (g)", step: "0.1" },
    { name: "sodium", label: "ナトリウム (mg)", step: "0.1" },
    { name: "calcium", label: "カルシウム (mg)", step: "0.1" },
    { name: "iron", label: "鉄分 (mg)", step: "0.01" },
    { name: "vitamin_a", label: "ビタミンA (μg)", step: "0.1" },
    { name: "vitamin_b1", label: "ビタミンB1 (mg)", step: "0.01" },
    { name: "vitamin_b2", label: "ビタミンB2 (mg)", step: "0.01" },
    { name: "vitamin_c", label: "ビタミンC (mg)", step: "0.1" },
  ];

  return (
    <Dialog open={show} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            食事記録を編集
          </DialogTitle>
          <DialogDescription>栄養素の値を修正できます</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 食事名 */}
          <div className="space-y-1.5">
            <Label>食事名</Label>
            <Input
              name="meal_name"
              value={mealData.meal_name}
              onChange={handleChange}
            />
          </div>

          {/* 基本栄養素 */}
          <div className="rounded-lg border border-border p-3">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-medium">栄養成分</h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvancedNutrition(!showAdvancedNutrition)}
                className="text-xs"
              >
                {showAdvancedNutrition ? (
                  <>
                    <ChevronUp className="mr-1 h-3 w-3" />
                    閉じる
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-1 h-3 w-3" />
                    詳細な栄養素を表示
                  </>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {BASIC_FIELDS.map((field) => (
                <div key={field.name} className="space-y-1">
                  <Label className="text-xs">{field.label}</Label>
                  <Input
                    type="number"
                    name={field.name}
                    value={mealData[field.name as keyof typeof mealData] ?? 0}
                    onChange={handleChange}
                    step={field.step}
                    className="h-8 text-sm"
                  />
                </div>
              ))}
            </div>

            {/* 詳細栄養素 */}
            {showAdvancedNutrition && (
              <>
                <div className="my-3 h-px bg-border" />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {ADVANCED_FIELDS.map((field) => (
                    <div key={field.name} className="space-y-1">
                      <Label className="text-xs">{field.label}</Label>
                      <Input
                        type="number"
                        name={field.name}
                        value={
                          mealData[field.name as keyof typeof mealData] ?? 0
                        }
                        onChange={handleChange}
                        step={field.step}
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* エラー */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                更新中...
              </>
            ) : (
              "更新する"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
