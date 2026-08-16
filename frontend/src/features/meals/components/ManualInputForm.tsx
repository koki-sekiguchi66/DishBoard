/**
 * ManualInputForm — 手動栄養素入力フォーム
 *
 * 基本4栄養素 + 詳細8栄養素の折りたたみ表示。
 * 数値欄は MeasureField に寄せ、Enter で次の欄へ送れるようにしている。
 */
import { useState, type ChangeEvent } from "react";
import { Pencil, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MeasureField, type MeasureAccent } from "@/components/inputs";
import type { FoodSelectionItem } from "@/types";

interface ManualInputFormProps {
  onAdd: (item: FoodSelectionItem) => void;
}

/** 数値欄の定義。FormData のキーと1対1で対応する */
interface NutrientField {
  name: keyof NutrientValues;
  label: string;
  unit: string;
  step: number;
  accent?: MeasureAccent;
}

interface NutrientValues {
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

interface FormData extends NutrientValues {
  meal_name: string;
}

const BASIC_FIELDS: NutrientField[] = [
  { name: "calories", label: "カロリー", unit: "kcal", step: 10, accent: "calories" },
  { name: "protein", label: "タンパク質", unit: "g", step: 1, accent: "protein" },
  { name: "fat", label: "脂質", unit: "g", step: 1, accent: "fat" },
  { name: "carbohydrates", label: "炭水化物", unit: "g", step: 1, accent: "carbs" },
];

const DETAIL_FIELDS: NutrientField[] = [
  { name: "dietary_fiber", label: "食物繊維", unit: "g", step: 0.1 },
  { name: "sodium", label: "食塩相当量", unit: "g", step: 0.1 },
  { name: "calcium", label: "カルシウム", unit: "mg", step: 10 },
  { name: "iron", label: "鉄", unit: "mg", step: 0.1 },
  { name: "vitamin_a", label: "ビタミンA", unit: "μg", step: 10 },
  { name: "vitamin_b1", label: "ビタミンB1", unit: "mg", step: 0.01 },
  { name: "vitamin_b2", label: "ビタミンB2", unit: "mg", step: 0.01 },
  { name: "vitamin_c", label: "ビタミンC", unit: "mg", step: 1 },
];

/** 分量のワンタップ候補。1食ぶんとしてよく使う量 */
const AMOUNT_PRESETS = [50, 100, 150, 200, 300];

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

const toNumber = (value: string): number => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function ManualInputForm({ onAdd }: ManualInputFormProps) {
  const [data, setData] = useState<FormData>({ ...INITIAL_DATA });
  const [showDetails, setShowDetails] = useState(false);

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setData({ ...data, meal_name: e.target.value });
  };

  const setField = (name: keyof NutrientValues, value: string) => {
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    if (!data.meal_name.trim()) return;

    onAdd({
      item_type: "custom",
      item_name: data.meal_name,
      amount_grams: toNumber(data.amount_grams) || 100,
      calories: toNumber(data.calories),
      protein: toNumber(data.protein),
      fat: toNumber(data.fat),
      carbohydrates: toNumber(data.carbohydrates),
      dietary_fiber: toNumber(data.dietary_fiber),
      sodium: toNumber(data.sodium),
      calcium: toNumber(data.calcium),
      iron: toNumber(data.iron),
      vitamin_a: toNumber(data.vitamin_a),
      vitamin_b1: toNumber(data.vitamin_b1),
      vitamin_b2: toNumber(data.vitamin_b2),
      vitamin_c: toNumber(data.vitamin_c),
    });

    setData({ ...INITIAL_DATA });
    setShowDetails(false);
  };

  const renderField = (field: NutrientField) => (
    <MeasureField
      key={field.name}
      label={field.label}
      unit={field.unit}
      step={field.step}
      accent={field.accent}
      value={data[field.name]}
      onChange={(value) => setField(field.name, value)}
    />
  );

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
          onChange={handleNameChange}
          placeholder="例: 自作のお弁当"
        />
      </div>

      {/* 分量 */}
      <MeasureField
        label="分量"
        unit="g"
        step={10}
        value={data.amount_grams}
        onChange={(value) => setField("amount_grams", value)}
        presets={AMOUNT_PRESETS}
      />

      {/* 基本栄養素 */}
      <div className="grid grid-cols-2 gap-2">{BASIC_FIELDS.map(renderField)}</div>

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
        <div className="grid grid-cols-2 gap-2 rounded-md border border-border p-2">
          {DETAIL_FIELDS.map(renderField)}
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
