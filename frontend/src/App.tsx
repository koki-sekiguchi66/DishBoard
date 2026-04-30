/**
 * App — DishBoard ルートコンポーネント（Phase 4 TSX + Tailwind 版）
 *
 * Phase 4 変更点:
 *   - JSX → TSX
 *   - react-bootstrap Container/Row/Col/Card/Button → Tailwind flex + shadcn/ui Card
 *   - Bootstrap Icons → lucide-react
 *   - Dark Pop テーマ適用（bg-background, text-foreground）
 *   - Sonner Toaster をルートに配置（InstallPWA, 将来の通知用）
 *
 * 責務（変更なし）:
 *   - 認証状態管理（token state）
 *   - localStorage トークン永続化（Fix #9 の責務集約）
 *   - 未認証時: Login/Register の切り替え表示
 *   - 認証済み: Dashboard を表示
 *
 * 設計判断:
 *   - max-w-md で中央寄せ。モバイルファーストで読みやすい幅
 *   - Card 内に Login/Register をスロット配置
 *   - 切り替えボタンは shadcn/ui Button の variant="outline"
 *   - Toaster は dishboard-app スコープの内側に置く（テーマ継承のため）
 */
import { useState, useEffect } from "react";
import { HeartPulse, UserPlus, LogIn } from "lucide-react";
import { Login, Register } from "@/features/auth";
import { Dashboard } from "@/features/dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";

/** 認証画面のビュー識別子 */
type AuthView = "login" | "register";

/** localStorage キー。マジックストリング排除 */
const TOKEN_STORAGE_KEY = "token";

function App() {
  const [token, setToken] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<AuthView>("login");

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  // Fix #9: トークン永続化はここに集約
  const handleLoginSuccess = (newToken: string) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    setToken(newToken);
  };

  const handleRegisterSuccess = (tokenOrNull: string | null) => {
    if (tokenOrNull) {
      localStorage.setItem(TOKEN_STORAGE_KEY, tokenOrNull);
      setToken(tokenOrNull);
    } else {
      setCurrentView("login");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setCurrentView("login");
  };

  const switchToRegister = () => setCurrentView("register");
  const switchToLogin = () => setCurrentView("login");

  // 認証済み → Dashboard 表示
  if (token) {
    return (
      <>
        <Dashboard handleLogout={handleLogout} />
        <Toaster />
      </>
    );
  }

  // 未認証 → 認証画面
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        {/* ヘッダー: アプリ名 */}
        <div className="mb-6 text-center">
          <h1 className="flex items-center justify-center gap-2 text-4xl font-bold tracking-tight">
            <HeartPulse className="h-8 w-8 text-primary" />
            <span className="text-primary">Dish</span>
            <span className="text-foreground">Board</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">栄養管理アプリ</p>
        </div>

        {/* 認証フォーム */}
        <Card>
          <CardContent className="p-6">
            {currentView === "login" ? (
              <>
                <Login onLoginSuccess={handleLoginSuccess} />

                <Separator className="my-6" />

                <div className="text-center">
                  <p className="mb-3 text-sm text-muted-foreground">
                    まだアカウントをお持ちでないですか？
                  </p>
                  <Button
                    variant="outline"
                    onClick={switchToRegister}
                    className="w-full"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    新規登録
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Register onRegisterSuccess={handleRegisterSuccess} />

                <Separator className="my-6" />

                <div className="text-center">
                  <p className="mb-3 text-sm text-muted-foreground">
                    すでにアカウントをお持ちですか？
                  </p>
                  <Button
                    variant="outline"
                    onClick={switchToLogin}
                    className="w-full"
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    ログイン
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Toaster />
    </div>
  );
}

export default App;
