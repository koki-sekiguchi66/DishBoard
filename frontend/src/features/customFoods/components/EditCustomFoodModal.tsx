import { useState, type ChangeEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MeasureField } from '@/components/inputs';
import { Loader2, Check, AlertTriangle, FileText, Pencil } from 'lucide-react';
import { customFoodApi } from '../api/customFoodApi';
import CustomFoodNutritionFields, {
  EMPTY_PER_100G_VALUES,
  toPer100gNumbers,
  type Per100gFormValues,
} from './CustomFoodNutritionFields';
import type { CustomFood, Per100gField } from '@/types';
import { EMPTY_NUTRITION, FULL_NUTRITION_KEYS, PER_100G_FIELD } from '@/types';

const EditCustomFoodModal = ({ show, food, onClose, onFoodUpdated }: {
  show: boolean;
  food: CustomFood;
  onClose: () => void;
  onFoodUpdated: (food: CustomFood) => void;
}) => {
  const [name, setName] = useState(food.name);
  const [nutrition, setNutrition] = useState<Per100gFormValues>(() => Object.fromEntries(FULL_NUTRITION_KEYS.map(key => [
    PER_100G_FIELD[key], String(food.nutrition_per_serving?.[key] ??
      ((food[PER_100G_FIELD[key]] ?? 0) * (food.nutrition_basis === 'per_serving' ? (food.serving_size_g ?? 100) / 100 : 1))),
  ])) as Per100gFormValues);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvancedNutrition, setShowAdvancedNutrition] = useState(false);
  const [basis, setBasis] = useState(food.nutrition_basis ?? 'per_100g');
  const [servingSize, setServingSize] = useState(String(food.serving_size_g ?? ''));
  const [sourceUrl, setSourceUrl] = useState(food.source_url ?? '');

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  const handleNutritionChange = (field: Per100gField, value: string) => {
    setNutrition(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.MouseEvent | React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!name.trim()) {
      setError('食品名を入力してください。');
      setIsLoading(false);
      return;
    }
    if ((['calories', 'protein', 'fat', 'carbohydrates'] as const).some(key => {
      const value = nutrition[PER_100G_FIELD[key]];
      return !value.trim() || !Number.isFinite(Number(value)) || Number(value) < 0;
    })) {
      setError('カロリーとPFCを0以上の数で入力してください。');
      setIsLoading(false);
      return;
    }
    const size = servingSize.trim() ? Number(servingSize) : null;
    if (size !== null && (!Number.isFinite(size) || size <= 0)) {
      setError('1食分の重量を0より大きい数で入力してください。');
      setIsLoading(false);
      return;
    }

    try {
      const response = await customFoodApi.updateCustomFood(food.id, {
        name,
        nutrition: FULL_NUTRITION_KEYS.reduce((values, key) => {
          values[key] = toPer100gNumbers(nutrition)[PER_100G_FIELD[key]];
          return values;
        }, { ...EMPTY_NUTRITION }),
        nutrition_basis: basis,
        serving_size_g: size,
        source: sourceUrl.trim() ? 'url' : 'manual',
        source_url: sourceUrl.trim(),
      });
      onFoodUpdated(response);
      onClose();
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { name?: string[] } } };
      if (axiosError.response?.data?.name?.includes('already exists')) {
        setError('この食品名は既に登録されています。');
      } else {
        setError('更新に失敗しました。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={show} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            <span className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              Myアイテムを編集
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="font-bold flex items-center gap-2">
              <FileText className="h-4 w-4" />
              食品名
            </Label>
            <Input
              type="text"
              name="name"
              value={name}
              onChange={handleNameChange}
              required
              placeholder="例: チキンサラダ"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom-food-basis">栄養成分の基準</Label>
            <select id="custom-food-basis" className="w-full rounded border border-border bg-background p-2"
              value={basis} onChange={(event) => {
                const next = event.target.value === 'per_serving' ? 'per_serving' : 'per_100g';
                const size = Number(servingSize);
                if (size > 0 && Number.isFinite(size)) {
                  const factor = next === 'per_serving' ? size / 100 : 100 / size;
                  setNutrition(Object.fromEntries(Object.entries(nutrition).map(([key, value]) =>
                    [key, value === '' ? '' : String(Number(value) * factor)])) as Per100gFormValues);
                } else {
                  setNutrition(EMPTY_PER_100G_VALUES);
                  setError('重量が未設定のため換算できません。選択した基準で栄養成分を入力してください。');
                }
                setBasis(next);
              }}>
              <option value="per_100g">100g</option>
              <option value="per_serving">1食分</option>
            </select>
            <MeasureField label="1食分の重量（任意）" unit="g" value={servingSize}
              onChange={(value) => { setServingSize(value); }} step={1} />
            <p className="text-sm text-muted-foreground">1食分の重量が不明な場合は空欄にできます。その場合は食数で記録します。</p>
            <Label htmlFor="custom-food-source">出典URL（ラベルから手入力した場合は空欄）</Label>
            <Input id="custom-food-source" type="url" value={sourceUrl}
              onChange={(event) => { setSourceUrl(event.target.value); }} />
          </div>

          <CustomFoodNutritionFields
            basisLabel={basis === "per_serving" ? "1食あたり" : "100gあたり"}
            values={nutrition}
            onChange={handleNutritionChange}
            showAdvanced={showAdvancedNutrition}
            onToggleAdvanced={() => setShowAdvancedNutrition(!showAdvancedNutrition)}
          />

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                更新中...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                更新する
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditCustomFoodModal;
