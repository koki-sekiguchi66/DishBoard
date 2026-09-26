import { useState, type ChangeEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { MeasureField } from '@/components/inputs';
import { Loader2, Check, AlertTriangle, FileText, Pencil } from 'lucide-react';
import { customFoodApi } from '../api/customFoodApi';
import CustomFoodNutritionFields, {
  toPer100gFormValues,
  toPer100gNumbers,
  type Per100gFormValues,
} from './CustomFoodNutritionFields';
import type { CustomFood, Per100gField } from '@/types';

const EditCustomFoodModal = ({ show, food, onClose, onFoodUpdated }: {
  show: boolean;
  food: CustomFood;
  onClose: () => void;
  onFoodUpdated: (food: CustomFood) => void;
}) => {
  const [name, setName] = useState(food.name);
  const [nutrition, setNutrition] = useState<Per100gFormValues>(() => toPer100gFormValues(food));
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvancedNutrition, setShowAdvancedNutrition] = useState(false);
  const [basis, setBasis] = useState(food.nutrition_basis ?? 'per_100g');
  const [servingSize, setServingSize] = useState(String(food.serving_size_g ?? ''));
  const [sourceUrl, setSourceUrl] = useState(food.source_url ?? '');
  const [verified, setVerified] = useState(food.is_verified ?? false);

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setVerified(false);
  };

  const handleNutritionChange = (field: Per100gField, value: string) => {
    setNutrition(prev => ({ ...prev, [field]: value }));
    setVerified(false);
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
    const size = servingSize.trim() ? Number(servingSize) : null;
    if ((basis === 'per_serving' && size === null) ||
        (size !== null && (!Number.isFinite(size) || size <= 0))) {
      setError('1食分の重量を0より大きい数で入力してください。');
      setIsLoading(false);
      return;
    }

    try {
      const response = await customFoodApi.updateCustomFood(food.id, {
        name,
        ...toPer100gNumbers(nutrition),
        nutrition_basis: basis,
        serving_size_g: size,
        source: sourceUrl.trim() ? 'url' : 'manual',
        source_url: sourceUrl.trim(),
        is_verified: verified,
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
            <Label htmlFor="custom-food-basis">表示・追加する量</Label>
            <select id="custom-food-basis" className="w-full rounded border border-border bg-background p-2"
              value={basis} onChange={(event) => {
                setBasis(event.target.value === 'per_serving' ? 'per_serving' : 'per_100g');
                setVerified(false);
              }}>
              <option value="per_100g">100g</option>
              <option value="per_serving">1食分</option>
            </select>
            <MeasureField label="1食分の重量" unit="g" value={servingSize}
              onChange={(value) => { setServingSize(value); setVerified(false); }} step={1} />
            <p className="text-sm text-muted-foreground">栄養成分の入力値は100gあたりです。1食分は重量から換算します。</p>
            <Label htmlFor="custom-food-source">出典URL（ラベルから手入力した場合は空欄）</Label>
            <Input id="custom-food-source" type="url" value={sourceUrl}
              onChange={(event) => { setSourceUrl(event.target.value); setVerified(false); }} />
            <div className="flex items-center gap-2">
              <Switch id="custom-food-verified" checked={verified} onCheckedChange={setVerified} />
              <Label htmlFor="custom-food-verified">出典と栄養値を確認済み</Label>
            </div>
          </div>

          <CustomFoodNutritionFields
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
