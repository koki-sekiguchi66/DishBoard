// kilogram-app/src/features/ocr/components/CameraCapture.jsx
import { useState, useRef, useCallback } from 'react';
import { Modal, Button, Alert, Spinner } from 'react-bootstrap';
import Webcam from 'react-webcam';

/**
 * カメラキャプチャコンポーネント（シンプル版）
 * 
 * 役割：
 * - カメラで撮影して全体画像を返すだけ
 * - トリミングは別コンポーネント（ImageCropModal）で行う
 */
const CameraCapture = ({ show, onClose, onCapture }) => {
  const [error, setError] = useState('');
  const [isReady, setIsReady] = useState(false);
  
  const webcamRef = useRef(null);
  
  // 高解像度のビデオ設定（4K対応）
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
  
  const handleUserMediaError = useCallback((error) => {
    console.error('Camera error:', error);
    setError('カメラへのアクセスに失敗しました。ブラウザの設定を確認してください。');
    setIsReady(false);
  }, []);
  
  /**
   * 撮影処理
   */
  const handleCapture = useCallback(() => {
    if (!webcamRef.current) return;
    
    console.log('撮影開始');
    
    // 最高品質でスクリーンショット取得
    const imageSrc = webcamRef.current.getScreenshot({
      width: 3840,
      height: 2160,
    });
    
    if (!imageSrc) {
      console.error('Screenshot failed');
      return;
    }
    
    // Base64からBlobに変換
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
    <Modal 
      show={show} 
      onHide={handleClose} 
      size="lg" 
      centered
      fullscreen="sm-down"
    >
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-camera me-2"></i>
          栄養成分表示を撮影
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body className="p-0" style={{ backgroundColor: '#000' }}>
        {error && (
          <Alert variant="danger" className="m-3 mb-0">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
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
              <Spinner animation="border" className="mb-2" />
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
            <i className="bi bi-info-circle me-2"></i>
            栄養成分表示全体が写るように撮影してください
          </div>
        )}
      </Modal.Body>
      
      <Modal.Footer className="justify-content-center">
        <Button 
          variant="outline-secondary" 
          onClick={handleClose}
        >
          キャンセル
        </Button>
        <Button 
          variant="primary"
          size="lg"
          onClick={handleCapture}
          disabled={!isReady || !!error}
          className="px-5"
        >
          <i className="bi bi-camera-fill me-2"></i>
          撮影
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CameraCapture;