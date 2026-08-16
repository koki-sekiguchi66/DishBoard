import { useState, type ChangeEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Check, AlertTriangle, FileText } from 'lucide-react';
import { customFoodApi } from '../api/customFoodApi';
import CustomFoodNutritionFields, {
  EMPTY_PER_100G_VALUES,
  toPer100gNumbers,
  type Per100gFormValues,
} from './CustomFoodNutritionFields';
import type { CustomFood, Per100gField } from '@/types';

const CustomFoodFormModal = ({ show, onClose, onFoodCreated }: {
  show: boolean;
  onClose: () => void;
  onFoodCreated: (food: CustomFood) => void;
}) => {
  const [name, setName] = useState('');
  const [nutrition, setNutrition] = useState<Per100gFormValues>({ ...EMPTY_PER_100G_VALUES });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvancedNutrition, setShowAdvancedNutrition] = useState(false);

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

    try {
      const response = await customFoodApi.createCustomFood({
        name,
        ...toPer100gNumbers(nutrition),
      });
      onFoodCreated(response);
      onClose();
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { name?: string[] } } };
      if (axiosError.response?.data?.name?.includes('already exists')) {
        setError('この食品名は既に登録されています。');
      } else {
        setError('保存に失敗しました。');
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
              <Plus className="h-4 w-4" />
              Myアイテムを新規作成
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
                保存中...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                保存する
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomFoodFormModal;
