/**
 * AppShell — DishBoard アプリケーションシェル
 *
 * アーキテクチャ上の位置づけ:
 *   App.tsx (認証) → Dashboard.tsx → AppShell (レイアウト + ページルーティング)
 *
 * 設計判断:
 *   React Router は導入せず、useState によるページ切り替えで SPA 感を実現。
 *   理由: DishBoard は記録特化アプリであり、ブラウザ履歴やURL永続化は不要。
 */
import { useState, type ReactNode } from "react";
import { Header } from "./Header";
import { Sidebar, type PageId } from "./Sidebar";

interface AppShellProps {
  /** ログアウトハンドラー（App.tsx から渡される） */
  onLogout: () => void;
  /** 記録ページのコンテンツ */
  recordContent: ReactNode;
  /** 分析ページのコンテンツ */
  analysisContent?: ReactNode;
  /** 設定ページのコンテンツ */
  settingsContent?: ReactNode;
}

/** 未実装ページのプレースホルダー */
function PagePlaceholder({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <p className="text-lg font-medium">{title}</p>
      <p className="mt-1 text-sm">Coming Soon...</p>
    </div>
  );
}

export function AppShell({
  onLogout,
  recordContent,
  analysisContent,
  settingsContent,
}: AppShellProps) {
  const [activePage, setActivePage] = useState<PageId>("record");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /** ページIDに対応するコンテンツを返す */
  const renderContent = (): ReactNode => {
    switch (activePage) {
      case "record":
        return recordContent;
      case "analysis":
        return analysisContent ?? <PagePlaceholder title="分析" />;
      case "settings":
        return settingsContent ?? <PagePlaceholder title="設定" />;
      default:
        return recordContent;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header onMenuOpen={() => setSidebarOpen(true)} />
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activePage={activePage}
        onNavigate={setActivePage}
        onLogout={onLogout}
      />
      <main className="mx-auto max-w-lg px-4 pt-4">
        {renderContent()}
      </main>
    </div>
  );
}
