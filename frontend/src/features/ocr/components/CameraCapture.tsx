import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Camera, AlertTriangle, Info } from 'lucide-react';
import Webcam from 'react-webcam';

/**
 * カメラで撮影して画像全体を返す。
 * 読み取り範囲のトリミングは ImageCropModal の責務。
 */
const CameraCapture = ({ show, onClose, onCapture }: { show: boolean; onClose: () => void; onCapture: (blob: Blob) => void }) => {
  const [error, setError] = useState('');
  const [isReady, setIsReady] = useState(false);

  const webcamRef = useRef<Webcam>(null);

  // OCR の精度は解像度に強く依存するため、取得できる最大解像度を要求する
  const videoConstraints = {
    width: { ideal: 3840 },
    height: { ideal: 2160 },
    facingMode: 'environment',
    aspectRatio: 16 / 9,
  };

  const handleUserMedia = useCallback(() => {
    console.log('Camera is ready');
    setIsReady(true);
    setError('');
  }, []);

  const handleUserMediaError = useCallback((error: string | DOMException) => {
    console.error('Camera error:', error);
    setError('カメラへのアクセスに失敗しました。ブラウザの設定を確認してください。');
    setIsReady(false);
  }, []);

  const handleCapture = useCallback(() => {
    if (!webcamRef.current) return;

    console.log('撮影開始');

    const imageSrc = webcamRef.current.getScreenshot({
      width: 3840,
      height: 2160,
    });

    if (!imageSrc) {
      console.error('Screenshot failed');
      return;
    }

    fetch(imageSrc)
      .then(res => res.blob())
      .then(blob => {
        console.log('撮影完了:', blob.size, 'bytes');
        onCapture(blob);
        handleClose();
      })
      .catch(err => {
        console.error('撮影エラー:', err);
      });
  }, [onCapture]);

  const handleClose = () => {
    setIsReady(false);
    onClose();
  };

  return (
    <Dialog open={show} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-3xl h-[90vh] sm:h-auto p-0">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>
            <span className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              栄養成分表示を撮影
            </span>
          </DialogTitle>
        </DialogHeader>

        <div style={{ backgroundColor: '#000' }}>
          {error && (
            <Alert variant="destructive" className="m-3 mb-0">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div style={{ position: 'relative', minHeight: '500px' }}>
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              screenshotQuality={1.0}
              videoConstraints={videoConstraints}
              onUserMedia={handleUserMedia}
              onUserMediaError={handleUserMediaError}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
              }}
            />

            {!isReady && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10,
                  color: 'white',
                  textAlign: 'center',
                }}
              >
                <Loader2 className="h-4 w-4 animate-spin mb-2 mx-auto" />
                <div>高解像度カメラを起動中...</div>
              </div>
            )}
          </div>

          {/* 撮影のヒント */}
          {isReady && (
            <div
              style={{
                padding: '12px 20px',
                textAlign: 'center',
                color: 'white',
                backgroundColor: '#1a1a1a',
                fontSize: '0.9rem',
                fontWeight: '500',
                borderTop: '1px solid #333',
              }}
            >
              <span className="flex items-center justify-center gap-2">
                <Info className="h-4 w-4" />
                栄養成分表示全体が写るように撮影してください
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-center gap-2 px-4 pb-4">
          <Button
            variant="outline"
            onClick={handleClose}
          >
            キャンセル
          </Button>
          <Button
            size="lg"
            onClick={handleCapture}
            disabled={!isReady || !!error}
            className="px-5"
          >
            <Camera className="h-4 w-4 mr-2" />
            撮影
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CameraCapture;
