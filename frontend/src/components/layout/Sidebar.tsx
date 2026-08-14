/**
 * Sidebar — DishBoard サイドバーナビゲーション
 *
 * 設計判断:
 *   - Claude スマホアプリのサイドバーを参考にした左スライドイン方式
 *   - shadcn/ui Sheet (side="left") でフォーカストラップ・Esc閉じ・オーバーレイを標準提供
 *   - BottomNav廃止理由: 学食タブ削除で3ページになり、BottomNavの情報密度が過剰
 *   - メニュー項目クリック・オーバーレイクリック・Escキーの3通りで閉じられる
 *
 * PageId: "record" | "analysis" | "settings"
 */
import { UtensilsCrossed, BarChart3, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

/** ページ識別子 */
export type PageId = "record" | "analysis" | "settings";

interface SidebarProps {
  /** Sheet の開閉状態 */
  open: boolean;
  /** Sheet を閉じるコールバック */
  onClose: () => void;
  /** 現在アクティブなページ */
  activePage: PageId;
  /** ページ遷移コールバック */
  onNavigate: (page: PageId) => void;
  /** ログアウトコールバック */
  onLogout: () => void;
}

/** メニュー項目の定義 */
const NAV_ITEMS: { id: PageId; label: string; icon: typeof UtensilsCrossed }[] = [
  { id: "record", label: "記録", icon: UtensilsCrossed },
  { id: "analysis", label: "分析", icon: BarChart3 },
  { id: "settings", label: "設定", icon: Settings },
];

export function Sidebar({
  open,
  onClose,
  activePage,
  onNavigate,
  onLogout,
}: SidebarProps) {
  /** メニュー項目クリック → ページ遷移 + サイドバー閉じ */
  const handleNavigate = (page: PageId) => {
    onNavigate(page);
    onClose();
  };

  /** ログアウト → サイドバー閉じ + ログアウト実行 */
  const handleLogout = () => {
    onClose();
    onLogout();
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side="left"
        className="flex w-72 flex-col bg-background p-0"
      >
        {/* ── ヘッダー: アプリ名 ── */}
        <SheetHeader className="border-b border-border px-6 py-5">
          <SheetTitle className="text-xl font-bold tracking-tight">
            <span className="text-primary">Dish</span>
            <span className="text-foreground">Board</span>
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            栄養管理アプリ
          </SheetDescription>
        </SheetHeader>

        {/* ── ナビゲーションメニュー ── */}
        <nav className="flex-1 px-3 py-4" role="navigation" aria-label="メインメニュー">
          <ul className="space-y-1">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
              const isActive = activePage === id;
              return (
                <li key={id}>
                  <button
                    onClick={() => handleNavigate(id)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ── フッター: ログアウト ── */}
        <div className="border-t border-border px-3 py-4">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            ログアウト
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
