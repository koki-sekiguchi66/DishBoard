import { useState, type ChangeEvent } from "react";
import {
  Pencil,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Loader2,
  BookmarkPlus,
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
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MeasureField, type MeasureAccent } from "@/components/inputs";
import { useSaveMealAsMenu } from "@/features/customMenus";
import { mealApi } from "../api/mealApi";
import type { FullNutrition, MealRecord } from "@/types";
import { FULL_NUTRITION_KEYS } from "@/types";

interface EditMealModalProps {
  meal: MealRecord;
  show: boolean;
  onClose: () => void;
  onMealUpdated: (meal: MealRecord) => void;
}

interface NutrientField {
  name: keyof FullNutrition;
  label: string;
  unit: string;
  step: number;
  accent?: MeasureAccent;
}

const BASIC_FIELDS: NutrientField[] = [
  { name: "calories", label: "カロリー", unit: "kcal", step: 10, accent: "calories" },
  { name: "protein", label: "タンパク質", unit: "g", step: 1, accent: "protein" },
  { name: "fat", label: "脂質", unit: "g", step: 1, accent: "fat" },
  { name: "carbohydrates", label: "炭水化物", unit: "g", step: 1, accent: "carbs" },
];

const ADVANCED_FIELDS: NutrientField[] = [
  { name: "dietary_fiber", label: "食物繊維", unit: "g", step: 0.1 },
  { name: "sodium", label: "食塩相当量", unit: "g", step: 0.1 },
  { name: "calcium", label: "カルシウム", unit: "mg", step: 10 },
  { name: "iron", label: "鉄", unit: "mg", step: 0.1 },
  { name: "vitamin_a", label: "ビタミンA", unit: "μg", step: 10 },
  { name: "vitamin_b1", label: "ビタミンB1", unit: "mg", step: 0.01 },
  { name: "vitamin_b2", label: "ビタミンB2", unit: "mg", step: 0.01 },
  { name: "vitamin_c", label: "ビタミンC", unit: "mg", step: 1 },
];

/** MeasureField は文字列で値を持つため、編集フォームだけの表現として栄養素を文字列化する */
type NutrientForm = Record<keyof FullNutrition, string>;

const toNutrientForm = (meal: MealRecord): NutrientForm =>
  Object.fromEntries(
    FULL_NUTRITION_KEYS.map((key) => [key, String(meal[key] ?? 0)])
  ) as NutrientForm;

const toNumber = (value: string): number => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toNutrition = (form: NutrientForm): FullNutrition =>
  Object.fromEntries(
    FULL_NUTRITION_KEYS.map((key) => [key, toNumber(form[key])])
  ) as unknown as FullNutrition;

export default function EditMealModal({
  meal,
  show,
  onClose,
  onMealUpdated,
}: EditMealModalProps) {
  const [mealName, setMealName] = useState(meal.meal_name);
  const [nutrition, setNutrition] = useState<NutrientForm>(() => toNutrientForm(meal));
  const [showAdvancedNutrition, setShowAdvancedNutrition] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [saveAsMenu, setSaveAsMenu] = useState(false);
  const [menuName, setMenuName] = useState(meal.meal_name);
  const [menuDescription, setMenuDescription] = useState("");
  const { saveMealAsMenu, isSaving } = useSaveMealAsMenu();

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setMealName(e.target.value);
  };

  const setNutrientField = (name: keyof FullNutrition, value: string) => {
    setNutrition((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!mealName.trim()) {
      setError("食事名を入力してください。");
      return;
    }
    if (saveAsMenu && !menuName.trim()) {
      setError("Myメニューとして保存する場合は名前が必要です。");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const updated = await mealApi.updateMeal(meal.id, {
        // record_date / meal_timing はこのフォームでは編集させないが、
        // PUT は非部分更新のため必須項目として送る必要がある
        // （meal_timing はモデルに default がなく、省略すると 400 になる）
        record_date: meal.record_date,
        meal_timing: meal.meal_timing,
        meal_name: mealName,
        ...toNutrition(nutrition),
      });

      if (saveAsMenu && menuName.trim()) {
        await saveMealAsMenu(meal.id, menuName.trim(), menuDescription.trim());
      }

      onMealUpdated(updated);
      onClose();
    } catch {
      setError("更新に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const isSubmitting = isLoading || isSaving;

  const renderField = (field: NutrientField) => (
    <MeasureField
      key={field.name}
      label={field.label}
      unit={field.unit}
      step={field.step}
      accent={field.accent}
      value={nutrition[field.name]}
      onChange={(value) => setNutrientField(field.name, value)}
    />
  );

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
            <Input name="meal_name" value={mealName} onChange={handleNameChange} />
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

            <div className="grid grid-cols-2 gap-2">{BASIC_FIELDS.map(renderField)}</div>

            {/* 詳細栄養素 */}
            {showAdvancedNutrition && (
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3">
                {ADVANCED_FIELDS.map(renderField)}
              </div>
            )}
          </div>

          {/* Myメニューとして保存 */}
          <div className="rounded-lg border border-border p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={saveAsMenu}
                onChange={(e) => setSaveAsMenu(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <BookmarkPlus className="h-4 w-4" />
              Myメニューとしても保存する
            </label>

            {saveAsMenu && (
              <div className="mt-3 space-y-2">
                <div className="space-y-1">
                  <Label htmlFor="edit-meal-menu-name" className="text-xs">
                    メニュー名 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-meal-menu-name"
                    value={menuName}
                    onChange={(e) => setMenuName(e.target.value)}
                    className="h-8 text-sm"
                    placeholder="例: いつもの朝食"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-meal-menu-description" className="text-xs">
                    説明（任意）
                  </Label>
                  <Textarea
                    id="edit-meal-menu-description"
                    value={menuDescription}
                    onChange={(e) => setMenuDescription(e.target.value)}
                    rows={2}
                    className="text-sm"
                    placeholder="例: パン + サラダ + コーヒー"
                  />
                </div>
              </div>
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
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
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
