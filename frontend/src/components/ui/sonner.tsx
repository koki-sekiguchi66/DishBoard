/**
 * shadcn/ui Sonner Toaster — Toast 通知の Toaster ラッパー
 *
 * sonner ライブラリの Toaster を Dark Pop テーマに統合する。
 * App.tsx に1度だけ配置し、どこからでも `toast()` を呼び出せる。
 *
 * 設計判断:
 *   - theme="dark" 固定（DishBoard は Dark Pop 統一テーマ）
 *   - position="top-right" は InstallPWA の旧 ToastContainer と同じ位置
 *   - CSS 変数で popover トークンに連動
 *
 * 使用例:
 *   import { toast } from "sonner";
 *   toast.success("保存しました");
 *   toast.error("エラーが発生しました");
 */
import { Toaster as SonnerToaster, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <SonnerToaster
      theme="dark"
      className="toaster group"
      position="top-right"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
