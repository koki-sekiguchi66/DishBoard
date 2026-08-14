import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Crop, Check, Info } from 'lucide-react';

interface DragState {
  isDragging: boolean;
  isResizing: boolean;
  handle: string | null;
  startX: number;
  startY: number;
  startBox: { x: number; y: number; width: number; height: number } | null;
}

/** 撮影画像の上でリサイズ可能な枠を操作させ、枠内を切り出して OCR に渡す。 */
const ImageCropModal = ({ show, imageBlob, onClose, onCrop }: { show: boolean; imageBlob: Blob | null; onClose: () => void; onCrop: (blob: Blob) => void }) => {
  const [imageUrl, setImageUrl] = useState('');
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  const [cropBox, setCropBox] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    isResizing: false,
    handle: null,
    startX: 0,
    startY: 0,
    startBox: null,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const MIN_OUTPUT_WIDTH = 1200;
  const MIN_OUTPUT_HEIGHT = 900;

  useEffect(() => {
    if (imageBlob) {
      const url = URL.createObjectURL(imageBlob);
      setImageUrl(url);
      console.log('[ImageCropModal] Image URL created, blob size:', imageBlob.size);

      return () => {
        URL.revokeObjectURL(url);
        console.log('[ImageCropModal] Image URL revoked');
      };
    }
  }, [imageBlob]);

  useEffect(() => {
    if (!show || !containerRef.current || !imageUrl) return;

    const updateSize = () => {
      const rect = containerRef.current!.getBoundingClientRect();
      console.log('[ImageCropModal] Container size:', rect.width, rect.height);

      setContainerSize({
        width: rect.width,
        height: rect.height,
      });

      const initialBox = {
        x: rect.width * 0.1,
        y: rect.height * 0.15,
        width: rect.width * 0.8,
        height: rect.height * 0.7,
      };

      console.log('[ImageCropModal] Setting initial crop box:', initialBox);
      setCropBox(initialBox);
    };

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

  const getEventPosition = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };

    const touch = (e as React.TouchEvent).touches?.[0];
    const clientX = touch ? touch.clientX : (e as React.MouseEvent).clientX;
    const clientY = touch ? touch.clientY : (e as React.MouseEvent).clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent, handle: string | null = null) => {
    e.preventDefault();
    const pos = getEventPosition(e);

    if (handle) {
      setDragState({
        isDragging: false,
        isResizing: true,
        handle,
        startX: pos.x,
        startY: pos.y,
        startBox: { ...cropBox },
      });
    } else {
      setDragState({
        isDragging: true,
        isResizing: false,
        handle: null,
        startX: pos.x,
        startY: pos.y,
        startBox: { ...cropBox },
      });
    }
  }, [cropBox]);

  const handleMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!dragState.isDragging && !dragState.isResizing) return;

    const pos = getEventPosition(e);
    const deltaX = pos.x - dragState.startX;
    const deltaY = pos.y - dragState.startY;

    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    if (dragState.isDragging) {
      let newX = dragState.startBox!.x + deltaX;
      let newY = dragState.startBox!.y + deltaY;

      newX = Math.max(0, Math.min(newX, containerRect.width - cropBox.width));
      newY = Math.max(0, Math.min(newY, containerRect.height - cropBox.height));

      setCropBox(prev => ({
        ...prev,
        x: newX,
        y: newY,
      }));
    } else if (dragState.isResizing) {
      const newBox = { ...dragState.startBox! };

      switch (dragState.handle) {
        case 'tl':
          newBox.x = dragState.startBox!.x + deltaX;
          newBox.y = dragState.startBox!.y + deltaY;
          newBox.width = dragState.startBox!.width - deltaX;
          newBox.height = dragState.startBox!.height - deltaY;
          break;
        case 'tr':
          newBox.y = dragState.startBox!.y + deltaY;
          newBox.width = dragState.startBox!.width + deltaX;
          newBox.height = dragState.startBox!.height - deltaY;
          break;
        case 'bl':
          newBox.x = dragState.startBox!.x + deltaX;
          newBox.width = dragState.startBox!.width - deltaX;
          newBox.height = dragState.startBox!.height + deltaY;
          break;
        case 'br':
          newBox.width = dragState.startBox!.width + deltaX;
          newBox.height = dragState.startBox!.height + deltaY;
          break;
      }

      newBox.width = Math.max(100, Math.min(newBox.width, containerRect.width - newBox.x));
      newBox.height = Math.max(100, Math.min(newBox.height, containerRect.height - newBox.y));
      newBox.x = Math.max(0, Math.min(newBox.x, containerRect.width - newBox.width));
      newBox.y = Math.max(0, Math.min(newBox.y, containerRect.height - newBox.height));

      setCropBox(newBox);
    }
  }, [dragState, cropBox.width, cropBox.height]);

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
   * 枠内を切り出し、最小 1200x900px まで拡大してから JPEG で出力する。
   * 小さい画像のままでは OCR がラベルの細かい文字を読めないため、拡大が必要。
   */
  const handleCropAndProcess = useCallback(async () => {
    console.log('[ImageCropModal] ===== トリミング処理開始 =====');

    if (!imageRef.current) {
      console.error('[ImageCropModal] imageRef.current is null');
      return;
    }

    if (cropBox.width === 0 || cropBox.height === 0) {
      console.error('[ImageCropModal] cropBox has zero size:', cropBox);
      return;
    }

    setIsProcessing(true);

    try {
      const img = imageRef.current;

      console.log('[ImageCropModal] Image natural size:', img.naturalWidth, 'x', img.naturalHeight);
      console.log('[ImageCropModal] Image display size:', img.offsetWidth, 'x', img.offsetHeight);
      console.log('[ImageCropModal] Crop box (display):', cropBox);

      const scaleX = img.naturalWidth / img.offsetWidth;
      const scaleY = img.naturalHeight / img.offsetHeight;

      console.log('[ImageCropModal] Scale factors:', { scaleX, scaleY });

      const cropX = Math.round(cropBox.x * scaleX);
      const cropY = Math.round(cropBox.y * scaleY);
      const cropWidth = Math.round(cropBox.width * scaleX);
      const cropHeight = Math.round(cropBox.height * scaleY);

      console.log('[ImageCropModal] Actual crop region:', { cropX, cropY, cropWidth, cropHeight });

      if (cropWidth <= 0 || cropHeight <= 0) {
        console.error('[ImageCropModal] Invalid crop dimensions');
        setIsProcessing(false);
        return;
      }

      // 拡大倍率を計算
      const scaleForWidth = cropWidth < MIN_OUTPUT_WIDTH ? MIN_OUTPUT_WIDTH / cropWidth : 1;
      const scaleForHeight = cropHeight < MIN_OUTPUT_HEIGHT ? MIN_OUTPUT_HEIGHT / cropHeight : 1;
      const upscaleFactor = Math.max(scaleForWidth, scaleForHeight);

      const outputWidth = Math.round(cropWidth * upscaleFactor);
      const outputHeight = Math.round(cropHeight * upscaleFactor);

      console.log('[ImageCropModal] Upscale calculation:', {
        MIN_OUTPUT_WIDTH,
        MIN_OUTPUT_HEIGHT,
        scaleForWidth: scaleForWidth.toFixed(2),
        scaleForHeight: scaleForHeight.toFixed(2),
        upscaleFactor: upscaleFactor.toFixed(2),
      });
      console.log('[ImageCropModal] Output size:', outputWidth, 'x', outputHeight);

      const canvas = document.createElement('canvas');
      canvas.width = outputWidth;
      canvas.height = outputHeight;

      const ctx = canvas.getContext('2d', {
        alpha: false,
        desynchronized: true,
      });

      ctx!.imageSmoothingEnabled = true;
      ctx!.imageSmoothingQuality = 'high';

      // 透明部分が黒く落ちると OCR の誤認識が増えるため白で塗る
      ctx!.fillStyle = '#FFFFFF';
      ctx!.fillRect(0, 0, outputWidth, outputHeight);

      ctx!.drawImage(
        img,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, outputWidth, outputHeight
      );

      console.log('[ImageCropModal] Canvas drawing completed');

      canvas.toBlob(
        (blob) => {
          if (blob) {
            console.log('[ImageCropModal] ===== トリミング成功 =====');
            console.log('[ImageCropModal] Original crop size:', cropWidth, 'x', cropHeight);
            console.log('[ImageCropModal] Output size:', outputWidth, 'x', outputHeight);
            console.log('[ImageCropModal] Upscale factor:', upscaleFactor.toFixed(2) + 'x');
            console.log('[ImageCropModal] Cropped blob size:', blob.size, 'bytes', '(' + (blob.size / 1024).toFixed(1) + ' KB)');
            console.log('[ImageCropModal] Cropped blob type:', blob.type);

            onCrop(blob);
            handleClose();
          } else {
            console.error('[ImageCropModal] Failed to create blob from canvas');
          }
          setIsProcessing(false);
        },
        'image/jpeg',
        0.95
      );

    } catch (error) {
      console.error('[ImageCropModal] トリミングエラー:', error);
      setIsProcessing(false);
    }
  }, [cropBox, onCrop]);

  const handleClose = () => {
    setCropBox({ x: 0, y: 0, width: 0, height: 0 });
    onClose();
  };

  const handleStyle: React.CSSProperties = {
    position: 'absolute',
    width: '24px',
    height: '24px',
    backgroundColor: 'hsl(var(--primary))',
    border: '2px solid white',
    borderRadius: '50%',
    cursor: 'pointer',
    zIndex: 10,
  };

  return (
    <Dialog open={show} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-3xl h-[90vh] sm:h-auto p-0">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>
            <span className="flex items-center gap-2">
              <Crop className="h-4 w-4" />
              認識範囲を調整
            </span>
          </DialogTitle>
        </DialogHeader>

        <div style={{ backgroundColor: '#000' }}>
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
                crossOrigin="anonymous"
              />
            )}

            {/* 選択枠オーバーレイ */}
            {cropBox.width > 0 && cropBox.height > 0 && (
              <>
                {/* 暗いオーバーレイ（4分割） */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: cropBox.y,
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  pointerEvents: 'none',
                }} />
                <div style={{
                  position: 'absolute',
                  top: cropBox.y,
                  left: 0,
                  width: cropBox.x,
                  height: cropBox.height,
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  pointerEvents: 'none',
                }} />
                <div style={{
                  position: 'absolute',
                  top: cropBox.y,
                  left: cropBox.x + cropBox.width,
                  right: 0,
                  height: cropBox.height,
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  pointerEvents: 'none',
                }} />
                <div style={{
                  position: 'absolute',
                  top: cropBox.y + cropBox.height,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  pointerEvents: 'none',
                }} />

                {/* 選択枠 */}
                <div
                  style={{
                    position: 'absolute',
                    left: cropBox.x,
                    top: cropBox.y,
                    width: cropBox.width,
                    height: cropBox.height,
                    border: '3px solid hsl(var(--primary))',
                    boxShadow: '0 0 10px rgba(0, 123, 255, 0.5)',
                    cursor: 'move',
                  }}
                  onMouseDown={(e) => handleMouseDown(e)}
                  onTouchStart={(e) => handleMouseDown(e)}
                >
                  {/* コーナーハンドル */}
                  <div
                    style={{ ...handleStyle, top: -12, left: -12 }}
                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'tl'); }}
                    onTouchStart={(e) => { e.stopPropagation(); handleMouseDown(e, 'tl'); }}
                  />
                  <div
                    style={{ ...handleStyle, top: -12, right: -12 }}
                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'tr'); }}
                    onTouchStart={(e) => { e.stopPropagation(); handleMouseDown(e, 'tr'); }}
                  />
                  <div
                    style={{ ...handleStyle, bottom: -12, left: -12 }}
                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'bl'); }}
                    onTouchStart={(e) => { e.stopPropagation(); handleMouseDown(e, 'bl'); }}
                  />
                  <div
                    style={{ ...handleStyle, bottom: -12, right: -12 }}
                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'br'); }}
                    onTouchStart={(e) => { e.stopPropagation(); handleMouseDown(e, 'br'); }}
                  />
                </div>
              </>
            )}
          </div>

          {/* 説明テキスト */}
          <div className="text-center text-white py-2" style={{ backgroundColor: '#333' }}>
            <small className="flex items-center justify-center gap-1">
              <Info className="h-4 w-4" />
              栄養成分表示の部分を枠で囲んでください（自動拡大されます）
            </small>
          </div>
        </div>

        <DialogFooter className="px-4 pb-4">
          <Button variant="secondary" onClick={handleClose} disabled={isProcessing}>
            キャンセル
          </Button>
          <Button
            onClick={handleCropAndProcess}
            disabled={isProcessing || cropBox.width === 0}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                処理中...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                この範囲で解析
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageCropModal;
