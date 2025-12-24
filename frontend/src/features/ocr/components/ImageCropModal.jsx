// kilogram-app/src/features/ocr/components/ImageCropModal.jsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { Modal, Button, Spinner } from 'react-bootstrap';

/**
 * 画像トリミングモーダル
 * 
 * 役割：
 * - 撮影した画像を表示
 * - リサイズ可能な枠を表示
 * - 枠内を切り取ってOCR処理に送る
 */
const ImageCropModal = ({ show, imageBlob, onClose, onCrop }) => {
  const [imageUrl, setImageUrl] = useState('');
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  
  // 選択枠の状態（ピクセル値）
  const [cropBox, setCropBox] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  
  // ドラッグ状態
  const [dragState, setDragState] = useState({
    isDragging: false,
    isResizing: false,
    handle: null,
    startX: 0,
    startY: 0,
    startBox: null,
  });
  
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  
  // 画像URLの生成
  useEffect(() => {
    if (imageBlob) {
      const url = URL.createObjectURL(imageBlob);
      setImageUrl(url);
      console.log('Image URL created');
      
      return () => {
        URL.revokeObjectURL(url);
        console.log('Image URL revoked');
      };
    }
  }, [imageBlob]);
  
  // コンテナサイズの監視と初期枠の設定
  useEffect(() => {
    if (!show || !containerRef.current || !imageUrl) return;
    
    const updateSize = () => {
      const rect = containerRef.current.getBoundingClientRect();
      console.log('Container size:', rect.width, rect.height);
      
      setContainerSize({
        width: rect.width,
        height: rect.height,
      });
      
      // 初期枠を設定（中央に大きめの枠）
      const initialBox = {
        x: rect.width * 0.1,
        y: rect.height * 0.15,
        width: rect.width * 0.8,
        height: rect.height * 0.7,
      };
      
      console.log('Setting initial crop box:', initialBox);
      setCropBox(initialBox);
    };
    
    // 画像読み込み完了を待つ
    if (imageRef.current && imageRef.current.complete) {
      setTimeout(updateSize, 100);
    } else if (imageRef.current) {
      imageRef.current.onload = () => {
        setTimeout(updateSize, 100);
      };
    }
    
    window.addEventListener('resize', updateSize);
    
    return () => {
      window.removeEventListener('resize', updateSize);
    };
  }, [show, imageUrl]);
  
  const getEventPosition = (e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };
  
  const handleBoxMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const pos = getEventPosition(e);
    setDragState({
      isDragging: true,
      isResizing: false,
      handle: null,
      startX: pos.x,
      startY: pos.y,
      startBox: { ...cropBox },
    });
  };
  
  const handleResizeMouseDown = (handle) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const pos = getEventPosition(e);
    setDragState({
      isDragging: false,
      isResizing: true,
      handle,
      startX: pos.x,
      startY: pos.y,
      startBox: { ...cropBox },
    });
  };
  
  const handleMouseMove = useCallback((e) => {
    if (!dragState.isDragging && !dragState.isResizing) return;
    if (!dragState.startBox || !containerRef.current) return;
    
    e.preventDefault();
    
    const pos = getEventPosition(e);
    const deltaX = pos.x - dragState.startX;
    const deltaY = pos.y - dragState.startY;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    
    if (dragState.isDragging) {
      let newX = dragState.startBox.x + deltaX;
      let newY = dragState.startBox.y + deltaY;
      
      newX = Math.max(0, Math.min(newX, containerRect.width - dragState.startBox.width));
      newY = Math.max(0, Math.min(newY, containerRect.height - dragState.startBox.height));
      
      setCropBox({
        ...dragState.startBox,
        x: newX,
        y: newY,
      });
    } else if (dragState.isResizing) {
      let newBox = { ...dragState.startBox };
      
      switch (dragState.handle) {
        case 'tl':
          newBox.x = dragState.startBox.x + deltaX;
          newBox.y = dragState.startBox.y + deltaY;
          newBox.width = dragState.startBox.width - deltaX;
          newBox.height = dragState.startBox.height - deltaY;
          break;
        case 'tr':
          newBox.y = dragState.startBox.y + deltaY;
          newBox.width = dragState.startBox.width + deltaX;
          newBox.height = dragState.startBox.height - deltaY;
          break;
        case 'bl':
          newBox.x = dragState.startBox.x + deltaX;
          newBox.width = dragState.startBox.width - deltaX;
          newBox.height = dragState.startBox.height + deltaY;
          break;
        case 'br':
          newBox.width = dragState.startBox.width + deltaX;
          newBox.height = dragState.startBox.height + deltaY;
          break;
      }
      
      newBox.width = Math.max(100, Math.min(newBox.width, containerRect.width - newBox.x));
      newBox.height = Math.max(100, Math.min(newBox.height, containerRect.height - newBox.y));
      newBox.x = Math.max(0, Math.min(newBox.x, containerRect.width - newBox.width));
      newBox.y = Math.max(0, Math.min(newBox.y, containerRect.height - newBox.height));
      
      setCropBox(newBox);
    }
  }, [dragState]);
  
  const handleMouseUp = useCallback(() => {
    setDragState({
      isDragging: false,
      isResizing: false,
      handle: null,
      startX: 0,
      startY: 0,
      startBox: null,
    });
  }, []);
  
  /**
   * 枠内を切り取ってOCR処理に送る
   */
  const handleCropAndProcess = useCallback(async () => {
    if (!imageRef.current || cropBox.width === 0) return;
    
    setIsProcessing(true);
    console.log('トリミング開始');
    
    try {
      const img = imageRef.current;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', {
        alpha: false,
        desynchronized: true,
      });
      
      // 画像スムージングを無効化
      ctx.imageSmoothingEnabled = false;
      
      // 表示サイズと実際の画像サイズの比率
      const scaleX = img.naturalWidth / img.offsetWidth;
      const scaleY = img.naturalHeight / img.offsetHeight;
      
      console.log('Scale factors:', scaleX, scaleY);
      console.log('Crop box:', cropBox);
      
      // 切り取り領域を実際の画像サイズに変換
      const cropX = Math.round(cropBox.x * scaleX);
      const cropY = Math.round(cropBox.y * scaleY);
      const cropWidth = Math.round(cropBox.width * scaleX);
      const cropHeight = Math.round(cropBox.height * scaleY);
      
      console.log('Actual crop region:', cropX, cropY, cropWidth, cropHeight);
      
      // Canvasサイズを切り取り領域に設定
      canvas.width = cropWidth;
      canvas.height = cropHeight;
      
      // 切り取り領域を描画
      ctx.drawImage(
        img,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
      );
      
      // Blobに変換
      canvas.toBlob((blob) => {
        if (blob) {
          console.log('Cropped blob size:', blob.size, 'bytes');
          onCrop(blob);
          handleClose();
        }
        setIsProcessing(false);
      }, 'image/jpeg', 0.98);
      
    } catch (error) {
      console.error('トリミングエラー:', error);
      setIsProcessing(false);
    }
  }, [cropBox, onCrop]);
  
  const handleClose = () => {
    setCropBox({ x: 0, y: 0, width: 0, height: 0 });
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
          <i className="bi bi-crop me-2"></i>
          認識範囲を調整
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body className="p-0" style={{ backgroundColor: '#000' }}>
        <div 
          ref={containerRef}
          style={{ 
            position: 'relative',
            width: '100%',
            minHeight: '500px',
            backgroundColor: '#000',
            overflow: 'hidden',
            touchAction: 'none',
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
        >
          {/* 撮影した画像 */}
          {imageUrl && (
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Captured"
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
              }}
            />
          )}
          
          {/* 選択枠オーバーレイ */}
          {cropBox.width > 0 && cropBox.height > 0 && (
            <>
              {/* 暗いオーバーレイ（4分割） */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${cropBox.y}px`,
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  pointerEvents: 'none',
                  zIndex: 98,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: `${cropBox.y}px`,
                  left: 0,
                  width: `${cropBox.x}px`,
                  height: `${cropBox.height}px`,
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  pointerEvents: 'none',
                  zIndex: 98,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: `${cropBox.y}px`,
                  left: `${cropBox.x + cropBox.width}px`,
                  width: `calc(100% - ${cropBox.x + cropBox.width}px)`,
                  height: `${cropBox.height}px`,
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  pointerEvents: 'none',
                  zIndex: 98,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: `${cropBox.y + cropBox.height}px`,
                  left: 0,
                  width: '100%',
                  height: `calc(100% - ${cropBox.y + cropBox.height}px)`,
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  pointerEvents: 'none',
                  zIndex: 98,
                }}
              />
              
              {/* 選択枠本体 */}
              <div
                style={{
                  position: 'absolute',
                  left: `${cropBox.x}px`,
                  top: `${cropBox.y}px`,
                  width: `${cropBox.width}px`,
                  height: `${cropBox.height}px`,
                  border: '4px solid #ffc107',
                  boxSizing: 'border-box',
                  cursor: dragState.isDragging ? 'grabbing' : 'grab',
                  pointerEvents: 'auto',
                  zIndex: 99,
                  backgroundColor: 'transparent',
                }}
                onMouseDown={handleBoxMouseDown}
                onTouchStart={handleBoxMouseDown}
              >
                {/* リサイズハンドル */}
                {[
                  { id: 'tl', top: '-14px', left: '-14px', cursor: 'nwse-resize' },
                  { id: 'tr', top: '-14px', right: '-14px', cursor: 'nesw-resize' },
                  { id: 'bl', bottom: '-14px', left: '-14px', cursor: 'nesw-resize' },
                  { id: 'br', bottom: '-14px', right: '-14px', cursor: 'nwse-resize' },
                ].map((handle) => (
                  <div
                    key={handle.id}
                    style={{
                      position: 'absolute',
                      width: '32px',
                      height: '32px',
                      backgroundColor: '#ffc107',
                      border: '4px solid white',
                      borderRadius: '50%',
                      top: handle.top,
                      bottom: handle.bottom,
                      left: handle.left,
                      right: handle.right,
                      cursor: handle.cursor,
                      pointerEvents: 'auto',
                      touchAction: 'none',
                      zIndex: 100,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    }}
                    onMouseDown={handleResizeMouseDown(handle.id)}
                    onTouchStart={handleResizeMouseDown(handle.id)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
        
        {/* 操作説明 */}
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
          枠をドラッグして移動 | 角をドラッグしてサイズ変更
        </div>
      </Modal.Body>
      
      <Modal.Footer className="justify-content-center">
        <Button 
          variant="outline-secondary" 
          onClick={handleClose}
          disabled={isProcessing}
        >
          キャンセル
        </Button>
        <Button 
          variant="success"
          size="lg"
          onClick={handleCropAndProcess}
          disabled={isProcessing || cropBox.width === 0}
          className="px-5"
        >
          {isProcessing ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              処理中...
            </>
          ) : (
            <>
              <i className="bi bi-check-circle me-2"></i>
              この範囲で認識
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ImageCropModal;