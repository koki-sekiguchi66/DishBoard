import { useState, useEffect, type ChangeEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { CheckCircle2, AlertTriangle, Info, FileText, Plus, Check } from 'lucide-react';
import { MeasureField, type MeasureAccent } from '@/components/inputs';
import type { FullNutrition } from '@/types';
import { FULL_NUTRITION_KEYS } from '@/types';

interface OCRResult {
  success: boolean;
  nutrition: Record<string, number>;
  error?: string;
  detected_texts?: string[];
}

interface NutrientField {
  name: keyof FullNutrition;
  label: string;
  unit: string;
  step: number;
  accent?: MeasureAccent;
}

/** ManualInputForm と同じ定義に揃える。どちらも「100gあたり相当」の値を扱う欄のため */
const BASIC_FIELDS: NutrientField[] = [
  { name: "calories", label: "エネルギー", unit: "kcal", step: 10, accent: "calories" },
  { name: "protein", label: "タンパク質", unit: "g", step: 1, accent: "protein" },
  { name: "fat", label: "脂質", unit: "g", step: 1, accent: "fat" },
  { name: "carbohydrates", label: "炭水化物", unit: "g", step: 1, accent: "carbs" },
];

const ADVANCED_FIELDS: NutrientField[] = [
  { name: "dietary_fiber", label: "食物繊維", unit: "g", step: 0.1 },
  { name: "sodium", label: "ナトリウム", unit: "mg", step: 1 },
  { name: "calcium", label: "カルシウム", unit: "mg", step: 10 },
  { name: "iron", label: "鉄分", unit: "mg", step: 0.1 },
  { name: "vitamin_a", label: "ビタミンA", unit: "μg", step: 10 },
  { name: "vitamin_b1", label: "ビタミンB1", unit: "mg", step: 0.01 },
  { name: "vitamin_b2", label: "ビタミンB2", unit: "mg", step: 0.01 },
  { name: "vitamin_c", label: "ビタミンC", unit: "mg", step: 1 },
];

type NutrientForm = Record<keyof FullNutrition, string>;

const EMPTY_FORM: NutrientForm = Object.fromEntries(
  FULL_NUTRITION_KEYS.map((key) => [key, "0"])
) as NutrientForm;

const toNumber = (value: string): number => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toNutrientForm = (nutrition: Record<string, number>): NutrientForm =>
  Object.fromEntries(
    FULL_NUTRITION_KEYS.map((key) => [key, String(nutrition[key] ?? 0)])
  ) as NutrientForm;

const toNutrition = (form: NutrientForm): Record<string, number> =>
  Object.fromEntries(FULL_NUTRITION_KEYS.map((key) => [key, toNumber(form[key])]));

const OCRResultModal = ({ show, onClose, ocrResult, onConfirm }: {
  show: boolean;
  onClose: () => void;
  ocrResult: OCRResult | null;
  onConfirm: (itemName: string, data: Record<string, number>) => void;
}) => {
  const [itemName, setItemName] = useState('');
  const [nutrition, setNutrition] = useState<NutrientForm>(EMPTY_FORM);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (ocrResult?.nutrition) {
      const form = toNutrientForm(ocrResult.nutrition);
      setNutrition(form);

      // 詳細栄養素が1つでも検出されていたら自動展開
      const hasDetailNutrients = ADVANCED_FIELDS.some(
        (field) => toNumber(form[field.name]) > 0
      );
      setShowAdvanced(hasDetailNutrients);
    }
  }, [ocrResult]);

  const setField = (name: keyof FullNutrition, value: string) => {
    setNutrition((prev) => ({ ...prev, [name]: value }));
  };

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setItemName(e.target.value);
  };

  const handleConfirm = () => {
    onConfirm(itemName.trim(), toNutrition(nutrition));
  };

  if (!ocrResult) return null;

  const detectedBasicCount = BASIC_FIELDS.filter(
    (field) => toNumber(nutrition[field.name]) > 0
  ).length;

  const detectedDetailCount = ADVANCED_FIELDS.filter(
    (field) => toNumber(nutrition[field.name]) > 0
  ).length;

  const canConfirm = detectedBasicCount > 0 && itemName.trim() !== '';

  const renderField = (field: NutrientField) => (
    <MeasureField
      key={field.name}
      label={field.label}
      unit={field.unit}
      step={field.step}
      accent={field.accent}
      value={nutrition[field.name]}
      onChange={(value) => setField(field.name, value)}
    />
  );

  return (
    <Dialog open={show} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              認識結果の確認
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 認識ステータス */}
          {ocrResult.success ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center gap-2">
                  <div>
                    <strong>栄養素情報を認識しました</strong>
                    <div className="text-sm">
                      基本栄養素: {detectedBasicCount}/4項目
                      {detectedDetailCount > 0 && ` | 詳細栄養素: ${detectedDetailCount}/8項目`}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      内容を確認し、必要に応じて修正してください
                    </div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {ocrResult.error || '一部の栄養素を認識できませんでした。手動で入力してください。'}
              </AlertDescription>
            </Alert>
          )}

          {/* デバッグ情報（開発時のみ） */}
          {process.env.NODE_ENV === 'development' && ocrResult.detected_texts && ocrResult.detected_texts.length > 0 && (
            <details className="mb-3">
              <summary className="text-muted-foreground text-sm" style={{ cursor: 'pointer' }}>
                検出されたテキスト（デバッグ用）
              </summary>
              <div className="text-sm text-muted-foreground mt-2 p-2 bg-muted rounded" style={{ maxHeight: '100px', overflowY: 'auto' }}>
                {ocrResult.detected_texts.join(' / ')}
              </div>
            </details>
          )}

          {/* アイテム名 */}
          <div className="space-y-1.5">
            <Label htmlFor="ocr-item-name">
              アイテム名 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ocr-item-name"
              value={itemName}
              onChange={handleNameChange}
              placeholder="例: サラダチキン"
              autoFocus
            />
          </div>

          {/* 栄養素フォーム */}
          <Card>
            <CardHeader className="flex flex-row justify-between items-center py-3">
              <span className="font-bold">
                栄養成分（100gあたり）
              </span>
              <Badge variant={ocrResult.success ? 'default' : 'secondary'}>
                {ocrResult.success ? 'AI認識済み' : '手動入力'}
              </Badge>
            </CardHeader>
            <CardContent>
              {/* 基本栄養素 */}
              <h6 className="mb-3 text-sm font-semibold">基本栄養素（必須）</h6>
              <div className="grid grid-cols-2 gap-2">{BASIC_FIELDS.map(renderField)}</div>

              {/* 詳細栄養素トグル */}
              <div className="flex justify-between items-center mb-2 mt-4">
                <h6 className="mb-0 text-sm font-semibold flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  詳細栄養素（任意）
                  {detectedDetailCount > 0 && (
                    <Badge variant="secondary" className="ml-2">{detectedDetailCount}項目検出</Badge>
                  )}
                </h6>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="no-underline"
                >
                  {showAdvanced ? '詳細を隠す ▲' : '詳細を表示 ▼'}
                </Button>
              </div>

              {showAdvanced && (
                <div>
                  <hr className="mb-3" />
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {ADVANCED_FIELDS.map(renderField)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 注意事項 */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <small>
                <strong>注意:</strong> 基本栄養素（エネルギー、タンパク質、脂質、炭水化物）のうち、
                少なくとも1つの値を入力してください。詳細栄養素は任意です。
              </small>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            <Check className="h-4 w-4 mr-2" />
            この内容でメニューに追加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OCRResultModal;
