import { useState, type ChangeEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Loader2, Plus, Check, AlertTriangle, FileText, TrendingUp, Eye, EyeOff } from 'lucide-react';
import { customFoodApi } from '../api/customFoodApi';
import type { CustomFood } from '@/types';

interface FormData {
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  fat_per_100g: number;
  carbs_per_100g: number;
  fiber_per_100g: number;
  sodium_per_100g: number;
  calcium_per_100g: number;
  iron_per_100g: number;
  vitamin_a_per_100g: number;
  vitamin_b1_per_100g: number;
  vitamin_b2_per_100g: number;
  vitamin_c_per_100g: number;
}

const CustomFoodFormModal = ({ show, onClose, onFoodCreated }: {
  show: boolean;
  onClose: () => void;
  onFoodCreated: (food: CustomFood) => void;
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    calories_per_100g: 0,
    protein_per_100g: 0,
    fat_per_100g: 0,
    carbs_per_100g: 0,
    fiber_per_100g: 0,
    sodium_per_100g: 0,
    calcium_per_100g: 0,
    iron_per_100g: 0,
    vitamin_a_per_100g: 0,
    vitamin_b1_per_100g: 0,
    vitamin_b2_per_100g: 0,
    vitamin_c_per_100g: 0,
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvancedNutrition, setShowAdvancedNutrition] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'name' ? value : parseFloat(value) || 0
    }));
  };

  const handleSubmit = async (e: React.MouseEvent | React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!formData.name.trim()) {
      setError('食品名を入力してください。');
      setIsLoading(false);
      return;
    }

    try {
      const response = await customFoodApi.createCustomFood(formData as unknown as Partial<CustomFood>);
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
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="例: チキンサラダ"
            />
          </div>

          <Card>
            <CardHeader className="flex flex-row justify-between items-center py-3">
              <span className="font-semibold text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                栄養成分（100gあたり）
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedNutrition(!showAdvancedNutrition)}
              >
                {showAdvancedNutrition ? (
                  <><EyeOff className="h-4 w-4 mr-1" />閉じる</>
                ) : (
                  <><Eye className="h-4 w-4 mr-1" />詳細な栄養素を表示</>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>カロリー (kcal)</Label>
                  <Input
                    type="number"
                    name="calories_per_100g"
                    value={formData.calories_per_100g}
                    onChange={handleChange}
                    step="0.1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>タンパク質 (g)</Label>
                  <Input
                    type="number"
                    name="protein_per_100g"
                    value={formData.protein_per_100g}
                    onChange={handleChange}
                    step="0.1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>脂質 (g)</Label>
                  <Input
                    type="number"
                    name="fat_per_100g"
                    value={formData.fat_per_100g}
                    onChange={handleChange}
                    step="0.1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>炭水化物 (g)</Label>
                  <Input
                    type="number"
                    name="carbs_per_100g"
                    value={formData.carbs_per_100g}
                    onChange={handleChange}
                    step="0.1"
                  />
                </div>
              </div>

              {showAdvancedNutrition && (
                <>
                  <hr className="my-3" />
                  <div className="grid grid-cols-1 gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                    <div className="space-y-2">
                      <Label>食物繊維 (g)</Label>
                      <Input
                        type="number"
                        name="fiber_per_100g"
                        value={formData.fiber_per_100g}
                        onChange={handleChange}
                        step="0.1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>ナトリウム (mg)</Label>
                      <Input
                        type="number"
                        name="sodium_per_100g"
                        value={formData.sodium_per_100g}
                        onChange={handleChange}
                        step="0.1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>カルシウム (mg)</Label>
                      <Input
                        type="number"
                        name="calcium_per_100g"
                        value={formData.calcium_per_100g}
                        onChange={handleChange}
                        step="0.1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>鉄分 (mg)</Label>
                      <Input
                        type="number"
                        name="iron_per_100g"
                        value={formData.iron_per_100g}
                        onChange={handleChange}
                        step="0.01"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>ビタミンA (μg)</Label>
                      <Input
                        type="number"
                        name="vitamin_a_per_100g"
                        value={formData.vitamin_a_per_100g}
                        onChange={handleChange}
                        step="0.1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>ビタミンB1 (mg)</Label>
                      <Input
                        type="number"
                        name="vitamin_b1_per_100g"
                        value={formData.vitamin_b1_per_100g}
                        onChange={handleChange}
                        step="0.01"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>ビタミンB2 (mg)</Label>
                      <Input
                        type="number"
                        name="vitamin_b2_per_100g"
                        value={formData.vitamin_b2_per_100g}
                        onChange={handleChange}
                        step="0.01"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>ビタミンC (mg)</Label>
                      <Input
                        type="number"
                        name="vitamin_c_per_100g"
                        value={formData.vitamin_c_per_100g}
                        onChange={handleChange}
                        step="0.1"
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

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
