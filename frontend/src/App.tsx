import { useState, useEffect } from "react";
import { HeartPulse, UserPlus, LogIn } from "lucide-react";
import { Login, Register } from "@/features/auth";
import { Dashboard } from "@/features/dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";

type AuthView = "login" | "register";

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

  if (token) {
    return (
      <>
        <Dashboard handleLogout={handleLogout} />
        <Toaster />
      </>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="flex items-center justify-center gap-2 text-4xl font-bold tracking-tight">
            <HeartPulse className="h-8 w-8 text-primary" />
            <span className="text-primary">Dish</span>
            <span className="text-foreground">Board</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">栄養管理アプリ</p>
        </div>

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
