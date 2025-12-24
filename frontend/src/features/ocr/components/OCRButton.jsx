// kilogram-app/src/features/ocr/components/OCRButton.jsx
import { useState } from 'react';
import { Button, Spinner } from 'react-bootstrap';
import { toast } from 'react-hot-toast';
import CameraCapture from './CameraCapture';
import ImageCropModal from './ImageCropModal';
import OCRResultModal from './OCRResultModal';
import { ocrApi } from '../api/ocrApi';

/**
 * OCRボタンコンポーネント
 * 
 * ワークフロー:
 * 1. カメラ起動
 * 2. 撮影
 * 3. トリミング画面（新規）
 * 4. OCR処理
 * 5. 結果確認
 * 6. メニューに追加
 */
const OCRButton = ({ onNutritionDetected }) => {
  const [showCamera, setShowCamera] = useState(false);
  const [showCrop, setShowCrop] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  
  /**
   * カメラで撮影完了
   */
  const handleCapture = (imageBlob) => {
    console.log('=== 撮影完了 ===');
    console.log('撮影Blob:', {
      size: imageBlob.size,
      type: imageBlob.type,
    });
    
    setCapturedImage(imageBlob);
    setShowCrop(true);  // トリミング画面を表示
  };
  
  /**
   * トリミング完了 → OCR処理開始
   */
  const handleCrop = async (croppedBlob) => {
    console.log('=== トリミング完了 → OCR処理開始 ===');
    console.log('トリミングBlob:', {
      size: croppedBlob.size,
      type: croppedBlob.type,
    });
    
    setIsProcessing(true);
    
    try {
      // Blobが有効か確認
      if (!croppedBlob || croppedBlob.size === 0) {
        throw new Error('無効な画像データです');
      }
      
      // 画像ファイルに変換
      const timestamp = Date.now();
      const imageFile = new File(
        [croppedBlob], 
        `nutrition-label-${timestamp}.jpg`, 
        { type: 'image/jpeg' }
      );
      
      console.log('作成したFile:', {
        name: imageFile.name,
        size: imageFile.size,
        type: imageFile.type,
      });
      
      toast.loading('画像を解析中...', { id: 'ocr-processing' });
      
      // OCR処理を実行
      console.log('APIリクエスト送信開始...');
      const result = await ocrApi.processNutritionLabel(imageFile);
      
      console.log('APIレスポンス受信:', result);
      
      toast.dismiss('ocr-processing');
      
      if (result.success) {
        console.log('✓ OCR成功:', result.nutrition);
        toast.success('栄養素情報を認識しました！');
      } else {
        console.warn('⚠ OCR部分的失敗:', result.error);
        toast('一部の情報を認識できませんでした', { icon: '⚠️' });
      }
      
      setOcrResult(result);
      setShowResult(true);
      
    } catch (error) {
      console.error('❌ OCRエラー:', error);
      console.error('エラー詳細:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      toast.dismiss('ocr-processing');
      
      if (error.response?.status === 400) {
        toast.error('画像形式が正しくありません');
      } else if (error.response?.status === 413) {
        toast.error('画像サイズが大きすぎます（10MB以下にしてください）');
      } else if (error.response?.status === 422) {
        toast.error('栄養素情報を認識できませんでした');
      } else {
        toast.error('画像の解析に失敗しました');
      }
    } finally {
      setIsProcessing(false);
      console.log('=== OCR処理終了 ===');
    }
  };
  
  /**
   * OCR結果確認 → メニューに追加
   */
  const handleConfirm = (nutritionData) => {
    console.log('確認された栄養データ:', nutritionData);
    
    // メニューに追加（100gあたりのデータとして扱う）
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
    
    console.log('メニューに追加:', menuItem);
    onNutritionDetected(menuItem);
    
    // クリーンアップ
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
      setCapturedImage(null);
    }
    setShowResult(false);
    setOcrResult(null);
    toast.success('メニューに追加しました');
  };
  
  return (
    <>
      <Button
        variant="outline-primary"
        onClick={() => {
          console.log('カメラを起動');
          setShowCamera(true);
        }}
        disabled={isProcessing}
        className="w-100"
      >
        {isProcessing ? (
          <>
            <Spinner animation="border" size="sm" className="me-2" />
            解析中...
          </>
        ) : (
          <>
            <i className="bi bi-camera me-2"></i>
            パッケージを撮影して追加
          </>
        )}
      </Button>
      
      {/* ステップ1: カメラ撮影 */}
      <CameraCapture
        show={showCamera}
        onClose={() => {
          console.log('カメラを閉じる');
          setShowCamera(false);
        }}
        onCapture={handleCapture}
      />
      
      {/* ステップ2: トリミング */}
      <ImageCropModal
        show={showCrop}
        imageBlob={capturedImage}
        onClose={() => {
          console.log('トリミング画面を閉じる');
          setShowCrop(false);
          if (capturedImage) {
            URL.revokeObjectURL(capturedImage);
            setCapturedImage(null);
          }
        }}
        onCrop={handleCrop}
      />
      
      {/* ステップ3: OCR結果確認 */}
      <OCRResultModal
        show={showResult}
        onClose={() => {
          console.log('結果モーダルを閉じる');
          setShowResult(false);
        }}
        ocrResult={ocrResult}
        onConfirm={handleConfirm}
      />
    </>
  );
};

export default OCRButton;