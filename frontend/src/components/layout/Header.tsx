/**
 * Header — DishBoard アプリヘッダー（Phase 1.5 更新版）
 *
 * 変更点:
 *   - 左側にハンバーガーメニューボタン追加（サイドバー開閉トリガー）
 *   - ログアウトボタンをヘッダーから削除（サイドバー下部に移動）
 *   - 右側は将来的に通知アイコン等を配置する余白として確保
 *
 * 設計判断:
 *   Claude スマホアプリと同様、ヘッダー左上のハンバーガーアイコンで
 *   サイドバーを開閉する。モバイルファーストのナビゲーションパターン。
 */
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  /** サイドバーを開くコールバック */
  onMenuOpen: () => void;
}

export function Header({ onMenuOpen }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
        {/* 左: ハンバーガーメニュー + アプリ名 */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuOpen}
            aria-label="メニューを開く"
            className="text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold tracking-tight">
            <span className="text-primary">Dish</span>
            <span className="text-foreground">Board</span>
          </h1>
        </div>

        {/* 右: 将来的に通知アイコン等を配置 */}
        <div className="w-10" />
      </div>
    </header>
  );
}
