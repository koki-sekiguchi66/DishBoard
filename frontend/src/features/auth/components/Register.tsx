/**
 * Register — ユーザー登録フォーム
 *
 * トークン永続化の責務は App.tsx に一元化している。
 *   登録成功後の自動ログインで取得したトークンを onRegisterSuccess 経由で
 *   親に渡すのみ。localStorage への保存は行わない。
 *
 * テストが placeholder / role / 文言で要素を特定している。変更するとテストが落ちる:
 *   - placeholder: "ユーザー名を入力" "メールアドレスを入力"
 *                  "パスワードを入力" "パスワードを再入力"
 *   - heading: "アカウント作成"
 *   - button: "アカウントを作成" / 送信中 "作成中..."
 */
import { useState, type ChangeEvent, type FormEvent } from "react";
import { UserPlus, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { apiClient } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RegisterProps {
  onRegisterSuccess: (token: string | null) => void;
}

interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
}

/** パスワード最小文字数。マジックナンバー排除のため定数化 */
const MIN_PASSWORD_LENGTH = 8;

const Register = ({ onRegisterSuccess }: RegisterProps) => {
  const [formData, setFormData] = useState<RegisterFormData>({
    username: "",
    email: "",
    password: "",
    confirm_password: "",
  });
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (formData.password !== formData.confirm_password) {
      setMessage("パスワードが一致しません。");
      return;
    }

    if (formData.password.length < MIN_PASSWORD_LENGTH) {
      setMessage(`パスワードは${MIN_PASSWORD_LENGTH}文字以上で入力してください。`);
      return;
    }

    setIsLoading(true);

    try {
      await apiClient.post("/register/", {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        confirm_password: formData.confirm_password,
      });

      const loginResponse = await apiClient.post("/login/", {
        username: formData.username,
        password: formData.password,
      });

      if (loginResponse.data.token) {
        // localStorage への保存は App.tsx に委譲
        onRegisterSuccess(loginResponse.data.token);
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: Record<string, string[] | string> } };
      console.error("Registration error:", err.response?.data);

      const errors = err.response?.data;
      if (errors) {
        // DRF スタイルのエラーレスポンスを順に確認
        if (errors.username) {
          setMessage(`ユーザー名: ${(errors.username as string[])[0]}`);
        } else if (errors.password) {
          setMessage(`パスワード: ${(errors.password as string[])[0]}`);
        } else if (errors.confirm_password) {
          setMessage(`確認パスワード: ${(errors.confirm_password as string[])[0]}`);
        } else if (errors.non_field_errors) {
          setMessage((errors.non_field_errors as string[])[0]);
        } else {
          setMessage("アカウントの作成に失敗しました。入力内容を確認してください。");
        }
      } else {
        setMessage("アカウントの作成に失敗しました。入力内容を確認してください。");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isSuccess = message.includes("成功");

  return (
    <div>
      <h3 className="mb-4 flex items-center justify-center gap-2 text-center text-xl font-bold text-foreground">
        <UserPlus className="h-5 w-5 text-primary" />
        アカウント作成
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="register-username">ユーザー名</Label>
          <Input
            id="register-username"
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            placeholder="ユーザー名を入力"
            autoComplete="username"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="register-email">メールアドレス</Label>
          <Input
            id="register-email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="メールアドレスを入力"
            autoComplete="email"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="register-password">パスワード</Label>
          <Input
            id="register-password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            placeholder="パスワードを入力"
            autoComplete="new-password"
          />
          <p className="text-xs text-muted-foreground">
            最低{MIN_PASSWORD_LENGTH}文字必要
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="register-confirm-password">パスワード（確認）</Label>
          <Input
            id="register-confirm-password"
            type="password"
            name="confirm_password"
            value={formData.confirm_password}
            onChange={handleChange}
            required
            placeholder="パスワードを再入力"
            autoComplete="new-password"
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              作成中...
            </>
          ) : (
            <>
              <UserPlus className="mr-2 h-4 w-4" />
              アカウントを作成
            </>
          )}
        </Button>
      </form>

      {message && (
        <Alert
          variant={isSuccess ? "success" : "destructive"}
          className="mt-4"
        >
          {isSuccess ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default Register;
