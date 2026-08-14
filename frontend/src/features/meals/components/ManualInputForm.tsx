/**
 * ManualInputForm — 手動栄養素入力フォーム
 *
 * 基本4栄養素 + 詳細8栄養素の折りたたみ表示。
 */
import { useState, type ChangeEvent } from "react";
import { Pencil, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FoodSelectionItem } from "@/types";

interface ManualInputFormProps {
  onAdd: (item: FoodSelectionItem) => void;
}

interface FormData {
  meal_name: string;
  calories: string;
  protein: string;
  fat: string;
  carbohydrates: string;
  dietary_fiber: string;
  sodium: string;
  calcium: string;
  iron: string;
  vitamin_a: string;
  vitamin_b1: string;
  vitamin_b2: string;
  vitamin_c: string;
  amount_grams: string;
}

const INITIAL_DATA: FormData = {
  meal_name: "",
  calories: "",
  protein: "",
  fat: "",
  carbohydrates: "",
  dietary_fiber: "",
  sodium: "",
  calcium: "",
  iron: "",
  vitamin_a: "",
  vitamin_b1: "",
  vitamin_b2: "",
  vitamin_c: "",
  amount_grams: "100",
};

export default function ManualInputForm({ onAdd }: ManualInputFormProps) {
  const [data, setData] = useState<FormData>({ ...INITIAL_DATA });
  const [showDetails, setShowDetails] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    if (!data.meal_name.trim()) return;

    onAdd({
      item_type: "custom",
      item_name: data.meal_name,
      amount_grams: parseFloat(data.amount_grams) || 100,
      calories: parseFloat(data.calories) || 0,
      protein: parseFloat(data.protein) || 0,
      fat: parseFloat(data.fat) || 0,
      carbohydrates: parseFloat(data.carbohydrates) || 0,
      dietary_fiber: parseFloat(data.dietary_fiber) || 0,
      sodium: parseFloat(data.sodium) || 0,
      calcium: parseFloat(data.calcium) || 0,
      iron: parseFloat(data.iron) || 0,
      vitamin_a: parseFloat(data.vitamin_a) || 0,
      vitamin_b1: parseFloat(data.vitamin_b1) || 0,
      vitamin_b2: parseFloat(data.vitamin_b2) || 0,
      vitamin_c: parseFloat(data.vitamin_c) || 0,
    });

    setData({ ...INITIAL_DATA });
    setShowDetails(false);
  };

  return (
    <div className="space-y-3">
      <h6 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Pencil className="h-4 w-4" />
        手動入力
      </h6>

      {/* 食事名 */}
      <div className="space-y-1">
        <Label>
          食事名 <span className="text-destructive">*</span>
        </Label>
        <Input
          name="meal_name"
          value={data.meal_name}
          onChange={handleChange}
          placeholder="例: 自作のお弁当"
        />
      </div>

      {/* 分量 */}
      <div className="space-y-1">
        <Label className="text-xs">分量 (g)</Label>
        <Input
          type="number"
          name="amount_grams"
          value={data.amount_grams}
          onChange={handleChange}
          className="h-8 text-sm"
        />
      </div>

      {/* 基本栄養素 (2列グリッド) */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { name: "calories", label: "カロリー(kcal)" },
          { name: "protein", label: "タンパク質(g)" },
          { name: "fat", label: "脂質(g)" },
          { name: "carbohydrates", label: "炭水化物(g)" },
        ].map((field) => (
          <div key={field.name} className="space-y-1">
            <Label className="text-xs">{field.label}</Label>
            <Input
              type="number"
              name={field.name}
              value={data[field.name as keyof FormData]}
              onChange={handleChange}
              className="h-8 text-sm"
            />
          </div>
        ))}
      </div>

      {/* 詳細トグル */}
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-muted-foreground"
        >
          {showDetails ? (
            <>
              <ChevronUp className="mr-1 h-3 w-3" />
              閉じる
            </>
          ) : (
            <>
              <ChevronDown className="mr-1 h-3 w-3" />
              詳細な栄養素
            </>
          )}
        </Button>
      </div>

      {/* 詳細栄養素 */}
      {showDetails && (
        <div className="grid grid-cols-2 gap-2 rounded-md border border-border p-3">
          {[
            { name: "dietary_fiber", label: "食物繊維(g)" },
            { name: "sodium", label: "食塩相当量(g)" },
            { name: "calcium", label: "カルシウム(mg)" },
            { name: "iron", label: "鉄(mg)" },
            { name: "vitamin_a", label: "ビタミンA(μg)" },
            { name: "vitamin_b1", label: "ビタミンB1(mg)" },
            { name: "vitamin_b2", label: "ビタミンB2(mg)" },
            { name: "vitamin_c", label: "ビタミンC(mg)" },
          ].map((field) => (
            <div key={field.name} className="space-y-1">
              <Label className="text-xs">{field.label}</Label>
              <Input
                type="number"
                name={field.name}
                value={data[field.name as keyof FormData]}
                onChange={handleChange}
                className="h-8 text-sm"
                step="0.01"
              />
            </div>
          ))}
        </div>
      )}

      {/* 追加ボタン */}
      <Button
        type="button"
        onClick={handleSubmit}
        disabled={!data.meal_name.trim()}
        className="w-full"
      >
        <Plus className="mr-2 h-4 w-4" />
        メニューに追加
      </Button>
    </div>
  );
}
