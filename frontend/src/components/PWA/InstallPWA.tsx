/**
 * InstallPWA — PWA インストール促進 + Service Worker 更新通知
 *
 * Service Worker の更新検知は virtual:pwa-register/react の useRegisterSW を使う。
 *
 * 設計判断:
 *   - Toaster 自体は App.tsx で配置済み。ここでは toast() を呼ぶだけ
 *   - インストールボタンは fixed bottom-20 right-4（モバイルで親指が届く位置）
 *   - 更新バナーは fixed bottom-4 中央寄せ（インストールボタンと干渉しない）
 *   - z-index: ボタン z-40、バナー z-40（Header の sticky と同等）
 */
import { useState, useEffect } from "react";
import { Download, RefreshCw, CheckCircle } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** beforeinstallprompt イベント型（標準型定義に含まれないため自前で定義） */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallPWA = () => {
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      console.log("Service Worker registered successfully:", registration);
    },
    onRegisterError(error) {
      console.error("Service Worker registration error:", error);
    },
  });

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallButton(true);
      console.log("PWA install prompt captured");
    };

    const handleAppInstalled = () => {
      console.log("PWA was installed successfully");
      setShowInstallButton(false);
      setDeferredPrompt(null);

      toast.success("インストール完了", {
        description: "DishBoardがホーム画面に追加されました！",
        icon: <CheckCircle className="h-4 w-4" />,
        duration: 5000,
      });
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.log("No install prompt available");
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install prompt: ${outcome}`);

      setDeferredPrompt(null);
      setShowInstallButton(false);
    } catch (error) {
      console.error("Error during installation:", error);
    }
  };

  const handleUpdateClick = () => {
    console.log("Updating Service Worker...");
    updateServiceWorker(true);
  };

  const handleDismissUpdate = () => {
    console.log("Update dismissed by user");
    setNeedRefresh(false);
  };

  return (
    <>
      {/* インストールボタン: 右下に丸いカプセル型ボタン */}
      {showInstallButton && (
        <Button
          onClick={handleInstallClick}
          className="fixed bottom-20 right-4 z-40 h-auto rounded-full px-5 py-2.5 shadow-lg"
          size="sm"
        >
          <Download className="mr-2 h-4 w-4" />
          アプリをインストール
        </Button>
      )}

      {/* 更新通知バナー: 画面下部中央 */}
      {needRefresh && (
        <div
          className="fixed bottom-4 left-1/2 z-40 flex min-w-[320px] max-w-[90%] -translate-x-1/2 flex-col items-center gap-2 rounded-lg bg-primary p-3 text-primary-foreground shadow-lg sm:flex-row"
          role="alert"
        >
          <div className="flex flex-grow items-center gap-2">
            <RefreshCw className="h-5 w-5 shrink-0" />
            <span className="text-sm">新しいバージョンが利用可能です</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleUpdateClick}
            >
              <CheckCircle className="mr-1 h-3.5 w-3.5" />
              更新
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismissUpdate}
              className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              後で
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default InstallPWA;
