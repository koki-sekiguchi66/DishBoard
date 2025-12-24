import { useState, useEffect } from 'react';
import { Button, Toast, ToastContainer } from 'react-bootstrap';
import { useRegisterSW } from 'virtual:pwa-register/react';

const InstallPWA = () => {
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      console.log('Service Worker registered successfully:', registration);
    },
    onRegisterError(error) {
      console.error('Service Worker registration error:', error);
    },
  });

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
      console.log('PWA install prompt captured');
    };

    const handleAppInstalled = () => {
      console.log('PWA was installed successfully');
      setShowInstallButton(false);
      setShowToast(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  
  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.log('No install prompt available');
      return;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install prompt: ${outcome}`);

      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      setDeferredPrompt(null);
      setShowInstallButton(false);
    } catch (error) {
      console.error('Error during installation:', error);
    }
  };

  const handleUpdateClick = () => {
    console.log('Updating Service Worker...');
    updateServiceWorker(true);
  };

  const handleDismissUpdate = () => {
    console.log('Update dismissed by user');
    setNeedRefresh(false);
  };

  return (
    <>
      {/* インストールボタン */}
      {showInstallButton && (
        <Button
          variant="primary"
          size="sm"
          onClick={handleInstallClick}
          className="position-fixed shadow-lg"
          style={{ 
            bottom: '80px', 
            right: '20px', 
            zIndex: 1000,
            borderRadius: '50px',
            padding: '10px 20px'
          }}
        >
          <i className="bi bi-download me-2"></i>
          アプリをインストール
        </Button>
      )}

      {/* 更新通知バナー */}
      {needRefresh && (
        <div
          className="position-fixed bg-primary text-white p-3 rounded shadow-lg"
          style={{ 
            bottom: '20px', 
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            minWidth: '320px',
            maxWidth: '90%'
          }}
        >
          <div className="d-flex flex-column flex-sm-row align-items-center gap-2">
            <div className="d-flex align-items-center gap-2 flex-grow-1">
              <i className="bi bi-arrow-clockwise fs-5"></i>
              <span className="small">新しいバージョンが利用可能です</span>
            </div>
            <div className="d-flex gap-2">
              <Button
                variant="light"
                size="sm"
                onClick={handleUpdateClick}
              >
                <i className="bi bi-check-circle me-1"></i>
                更新
              </Button>
              <Button
                variant="outline-light"
                size="sm"
                onClick={handleDismissUpdate}
              >
                後で
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* インストール完了 */}
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1050 }}>
        <Toast
          show={showToast}
          onClose={() => setShowToast(false)}
          delay={5000}
          autohide
          bg="success"
        >
          <Toast.Header>
            <i className="bi bi-check-circle-fill text-success me-2"></i>
            <strong className="me-auto">インストール完了</strong>
          </Toast.Header>
          <Toast.Body className="text-white">
            <i className="bi bi-phone me-2"></i>
            KiloGramがホーム画面に追加されました！
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </>
  );
};

export default InstallPWA;