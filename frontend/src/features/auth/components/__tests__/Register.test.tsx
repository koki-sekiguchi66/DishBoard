/**
 * Register コンポーネントのテスト
 *
 * placeholder / role で要素を特定している。Register.tsx 側の文言と対応させること。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/axios", () => ({
  apiClient: {
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

import Register from "@/features/auth/components/Register";
import { apiClient } from "@/lib/axios";

describe("Register コンポーネント", () => {
  const mockOnRegisterSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("登録フォームが正しくレンダリングされる", () => {
    render(<Register onRegisterSuccess={mockOnRegisterSuccess} />);

    expect(screen.getByText("アカウント作成")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("ユーザー名を入力")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("メールアドレスを入力")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("パスワードを入力")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("パスワードを再入力")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /アカウントを作成/i })
    ).toBeInTheDocument();
  });

  it("パスワード不一致時", async () => {
    const user = userEvent.setup();
    render(<Register onRegisterSuccess={mockOnRegisterSuccess} />);

    await user.type(screen.getByPlaceholderText("ユーザー名を入力"), "newuser");
    await user.type(screen.getByPlaceholderText("パスワードを入力"), "password123");
    await user.type(screen.getByPlaceholderText("パスワードを再入力"), "different123");
    await user.click(screen.getByRole("button", { name: /アカウントを作成/i }));

    await waitFor(() => {
      expect(screen.getByText(/パスワードが一致しません/)).toBeInTheDocument();
    });

    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("登録成功時に自動ログインされコールバックする（トークン保存はApp.tsx管理）", async () => {
    const user = userEvent.setup();

    (apiClient.post as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ data: { id: 1, username: "newuser" } })
      .mockResolvedValueOnce({ data: { token: "new-token-xyz" } });

    render(<Register onRegisterSuccess={mockOnRegisterSuccess} />);

    await user.type(screen.getByPlaceholderText("ユーザー名を入力"), "newuser");
    await user.type(screen.getByPlaceholderText("メールアドレスを入力"), "new@test.com");
    await user.type(screen.getByPlaceholderText("パスワードを入力"), "password123");
    await user.type(screen.getByPlaceholderText("パスワードを再入力"), "password123");
    await user.click(screen.getByRole("button", { name: /アカウントを作成/i }));

    await waitFor(() => {
      // localStorage への保存は App.tsx の責務。ここでは呼ばれない
      expect(mockOnRegisterSuccess).toHaveBeenCalledWith("new-token-xyz");
    });
  });

  it("ユーザー名重複エラーを表示", async () => {
    const user = userEvent.setup();
    (apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValue({
      response: {
        data: {
          username: ["この username はすでに存在します。"],
        },
      },
    });

    render(<Register onRegisterSuccess={mockOnRegisterSuccess} />);

    await user.type(screen.getByPlaceholderText("ユーザー名を入力"), "existing");
    await user.type(screen.getByPlaceholderText("メールアドレスを入力"), "test@test.com");
    await user.type(screen.getByPlaceholderText("パスワードを入力"), "password123");
    await user.type(screen.getByPlaceholderText("パスワードを再入力"), "password123");
    await user.click(screen.getByRole("button", { name: /アカウントを作成/i }));

    await waitFor(() => {
      expect(screen.getByText(/ユーザー名:/)).toBeInTheDocument();
    });
  });

  it("パスワードが短いとエラーメッセージ", async () => {
    const user = userEvent.setup();
    render(<Register onRegisterSuccess={mockOnRegisterSuccess} />);

    await user.type(screen.getByPlaceholderText("ユーザー名を入力"), "newuser");
    await user.type(screen.getByPlaceholderText("パスワードを入力"), "short");
    await user.type(screen.getByPlaceholderText("パスワードを再入力"), "short");
    await user.click(screen.getByRole("button", { name: /アカウントを作成/i }));

    await waitFor(() => {
      expect(screen.getByText(/8文字以上/)).toBeInTheDocument();
    });

    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("送信中はボタンが無効化される", async () => {
    const user = userEvent.setup();
    (apiClient.post as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    render(<Register onRegisterSuccess={mockOnRegisterSuccess} />);

    await user.type(screen.getByPlaceholderText("ユーザー名を入力"), "newuser");
    await user.type(screen.getByPlaceholderText("メールアドレスを入力"), "test@test.com");
    await user.type(screen.getByPlaceholderText("パスワードを入力"), "password123");
    await user.type(screen.getByPlaceholderText("パスワードを再入力"), "password123");
    await user.click(screen.getByRole("button", { name: /アカウントを作成/i }));

    await waitFor(() => {
      expect(screen.getByText(/作成中/)).toBeInTheDocument();
    });
  });
});
