// kilogram-app/src/features/ocr/components/OCRResultModal.tsx
import { useState, useEffect, type ChangeEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { CheckCircle2, AlertTriangle, Info, FileText, Plus, Check } from 'lucide-react';

interface OCRResult {
  success: boolean;
  nutrition: Record<string, number>;
  error?: string;
  detected_texts?: string[];
}

const OCRResultModal = ({ show, onClose, ocrResult, onConfirm }: {
  show: boolean;
  onClose: () => void;
  ocrResult: OCRResult | null;
  onConfirm: (data: Record<string, number>) => void;
}) => {
  const [nutritionData, setNutritionData] = useState({
    calories: 0,
    protein: 0,
    fat: 0,
    carbohydrates: 0,
    dietary_fiber: 0,
    sodium: 0,
    calcium: 0,
    iron: 0,
    vitamin_a: 0,
    vitamin_b1: 0,
    vitamin_b2: 0,
    vitamin_c: 0,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (ocrResult?.nutrition) {
      console.log('OCR結果を設定:', ocrResult.nutrition);
      setNutritionData(ocrResult.nutrition as typeof nutritionData);

      // 詳細栄養素が1つでも検出されていたら自動展開
      const hasDetailNutrients =
        ocrResult.nutrition.dietary_fiber > 0 ||
        ocrResult.nutrition.sodium > 0 ||
        ocrResult.nutrition.calcium > 0 ||
        ocrResult.nutrition.iron > 0 ||
        ocrResult.nutrition.vitamin_a > 0 ||
        ocrResult.nutrition.vitamin_b1 > 0 ||
        ocrResult.nutrition.vitamin_b2 > 0 ||
        ocrResult.nutrition.vitamin_c > 0;

      setShowAdvanced(hasDetailNutrients);
    }
  }, [ocrResult]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = parseFloat(value) || 0;
    setNutritionData(prev => ({
      ...prev,
      [name]: numValue
    }));
  };

  const handleConfirm = () => {
    console.log('確認ボタン押下:', nutritionData);

    // 基本栄養素が1つでも入力されているか確認
    const hasBasicNutrient =
      nutritionData.calories > 0 ||
      nutritionData.protein > 0 ||
      nutritionData.fat > 0 ||
      nutritionData.carbohydrates > 0;

    if (!hasBasicNutrient) {
      alert('基本的な栄養素（エネルギー、タンパク質、脂質、炭水化物）を少なくとも1つ入力してください。');
      return;
    }

    onConfirm(nutritionData);
  };

  if (!ocrResult) return null;

  // 検出された基本栄養素の数
  const detectedBasicCount = [
    nutritionData.calories,
    nutritionData.protein,
    nutritionData.fat,
    nutritionData.carbohydrates,
  ].filter(v => v > 0).length;

  // 検出された詳細栄養素の数
  const detectedDetailCount = [
    nutritionData.dietary_fiber,
    nutritionData.sodium,
    nutritionData.calcium,
    nutritionData.iron,
    nutritionData.vitamin_a,
    nutritionData.vitamin_b1,
    nutritionData.vitamin_b2,
    nutritionData.vitamin_c,
  ].filter(v => v > 0).length;

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
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>
                    エネルギー (kcal)
                    {nutritionData.calories > 0 && <CheckCircle2 className="h-4 w-4 text-green-500 inline ml-2" />}
                  </Label>
                  <Input
                    type="number"
                    name="calories"
                    value={nutritionData.calories}
                    onChange={handleChange}
                    step="0.1"
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    タンパク質 (g)
                    {nutritionData.protein > 0 && <CheckCircle2 className="h-4 w-4 text-green-500 inline ml-2" />}
                  </Label>
                  <Input
                    type="number"
                    name="protein"
                    value={nutritionData.protein}
                    onChange={handleChange}
                    step="0.1"
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    脂質 (g)
                    {nutritionData.fat > 0 && <CheckCircle2 className="h-4 w-4 text-green-500 inline ml-2" />}
                  </Label>
                  <Input
                    type="number"
                    name="fat"
                    value={nutritionData.fat}
                    onChange={handleChange}
                    step="0.1"
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    炭水化物 (g)
                    {nutritionData.carbohydrates > 0 && <CheckCircle2 className="h-4 w-4 text-green-500 inline ml-2" />}
                  </Label>
                  <Input
                    type="number"
                    name="carbohydrates"
                    value={nutritionData.carbohydrates}
                    onChange={handleChange}
                    step="0.1"
                    min="0"
                  />
                </div>
              </div>

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
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    <div className="space-y-2">
                      <Label className="text-sm">
                        食物繊維 (g)
                        {nutritionData.dietary_fiber > 0 && <CheckCircle2 className="h-4 w-4 text-green-500 inline ml-1" />}
                      </Label>
                      <Input
                        type="number"
                        name="dietary_fiber"
                        value={nutritionData.dietary_fiber}
                        onChange={handleChange}
                        step="0.1"
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">
                        ナトリウム (mg)
                        {nutritionData.sodium > 0 && <CheckCircle2 className="h-4 w-4 text-green-500 inline ml-1" />}
                      </Label>
                      <Input
                        type="number"
                        name="sodium"
                        value={nutritionData.sodium}
                        onChange={handleChange}
                        step="0.1"
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">
                        カルシウム (mg)
                        {nutritionData.calcium > 0 && <CheckCircle2 className="h-4 w-4 text-green-500 inline ml-1" />}
                      </Label>
                      <Input
                        type="number"
                        name="calcium"
                        value={nutritionData.calcium}
                        onChange={handleChange}
                        step="0.1"
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">
                        鉄分 (mg)
                        {nutritionData.iron > 0 && <CheckCircle2 className="h-4 w-4 text-green-500 inline ml-1" />}
                      </Label>
                      <Input
                        type="number"
                        name="iron"
                        value={nutritionData.iron}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">
                        ビタミンA (μg)
                        {nutritionData.vitamin_a > 0 && <CheckCircle2 className="h-4 w-4 text-green-500 inline ml-1" />}
                      </Label>
                      <Input
                        type="number"
                        name="vitamin_a"
                        value={nutritionData.vitamin_a}
                        onChange={handleChange}
                        step="0.1"
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">
                        ビタミンB1 (mg)
                        {nutritionData.vitamin_b1 > 0 && <CheckCircle2 className="h-4 w-4 text-green-500 inline ml-1" />}
                      </Label>
                      <Input
                        type="number"
                        name="vitamin_b1"
                        value={nutritionData.vitamin_b1}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">
                        ビタミンB2 (mg)
                        {nutritionData.vitamin_b2 > 0 && <CheckCircle2 className="h-4 w-4 text-green-500 inline ml-1" />}
                      </Label>
                      <Input
                        type="number"
                        name="vitamin_b2"
                        value={nutritionData.vitamin_b2}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">
                        ビタミンC (mg)
                        {nutritionData.vitamin_c > 0 && <CheckCircle2 className="h-4 w-4 text-green-500 inline ml-1" />}
                      </Label>
                      <Input
                        type="number"
                        name="vitamin_c"
                        value={nutritionData.vitamin_c}
                        onChange={handleChange}
                        step="0.1"
                        min="0"
                      />
                    </div>
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
            disabled={detectedBasicCount === 0}
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
