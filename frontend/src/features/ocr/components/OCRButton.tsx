import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Camera } from 'lucide-react';
import { toast } from 'sonner';
import CameraCapture from './CameraCapture';
import ImageCropModal from './ImageCropModal';
import OCRResultModal from './OCRResultModal';
import { ocrApi } from '../api/ocrApi';
import type { FoodSelectionItem } from '@/types';

const OCRButton = ({ onNutritionDetected }: { onNutritionDetected: (item: FoodSelectionItem) => void }) => {
  const [showCamera, setShowCamera] = useState(false);
  const [showCrop, setShowCrop] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [capturedImage, setCapturedImage] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);

  const handleCapture = (imageBlob: Blob) => {
    setCapturedImage(imageBlob);
    setShowCrop(true);
  };

  const handleCrop = async (croppedBlob: Blob) => {
    setIsProcessing(true);

    try {
      if (!croppedBlob || croppedBlob.size === 0) {
        throw new Error('無効な画像データです');
      }

      const imageFile = new File(
        [croppedBlob],
        `nutrition-label-${Date.now()}.jpg`,
        { type: 'image/jpeg' }
      );

      toast.loading('画像を解析中...', { id: 'ocr-processing' });

      const result = await ocrApi.processNutritionLabel(imageFile);

      toast.dismiss('ocr-processing');

      if (result.success) {
        toast.success('栄養素情報を認識しました！');
      } else {
        toast.warning('一部の情報を認識できませんでした');
      }

      setOcrResult(result);
      setShowResult(true);

    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number; data?: unknown }; message?: string };

      toast.dismiss('ocr-processing');

      if (axiosError.response?.status === 400) {
        toast.error('画像形式が正しくありません');
      } else if (axiosError.response?.status === 413) {
        toast.error('画像サイズが大きすぎます（10MB以下にしてください）');
      } else if (axiosError.response?.status === 422) {
        toast.error('栄養素情報を認識できませんでした');
      } else {
        toast.error('画像の解析に失敗しました');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = (nutritionData: Record<string, number>) => {
    const menuItem = {
      item_type: 'standard',
      item_id: 0,
      item_name: 'OCR認識アイテム',
      amount_grams: 100,
      calories: nutritionData.calories || 0,
      protein: nutritionData.protein || 0,
      fat: nutritionData.fat || 0,
      carbohydrates: nutritionData.carbohydrates || 0,
      dietary_fiber: nutritionData.dietary_fiber || 0,
      sodium: nutritionData.sodium || 0,
      calcium: nutritionData.calcium || 0,
      iron: nutritionData.iron || 0,
      vitamin_a: nutritionData.vitamin_a || 0,
      vitamin_b1: nutritionData.vitamin_b1 || 0,
      vitamin_b2: nutritionData.vitamin_b2 || 0,
      vitamin_c: nutritionData.vitamin_c || 0,
    };

    onNutritionDetected(menuItem);

    if (capturedImage) {
      URL.revokeObjectURL(URL.createObjectURL(capturedImage));
      setCapturedImage(null);
    }
    setShowResult(false);
    setOcrResult(null);
    toast.success('メニューに追加しました');
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setShowCamera(true)}
        disabled={isProcessing}
        className="w-full"
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            解析中...
          </>
        ) : (
          <>
            <Camera className="h-4 w-4 mr-2" />
            パッケージを撮影して追加
          </>
        )}
      </Button>

      <CameraCapture
        show={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleCapture}
      />

      <ImageCropModal
        show={showCrop}
        imageBlob={capturedImage}
        onClose={() => {
          setShowCrop(false);
          if (capturedImage) {
            URL.revokeObjectURL(URL.createObjectURL(capturedImage));
            setCapturedImage(null);
          }
        }}
        onCrop={handleCrop}
      />

      <OCRResultModal
        show={showResult}
        onClose={() => setShowResult(false)}
        ocrResult={ocrResult}
        onConfirm={handleConfirm}
      />
    </>
  );
};

export default OCRButton;
