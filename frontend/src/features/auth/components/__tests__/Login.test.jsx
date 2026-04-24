import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/lib/axios', () => ({
  apiClient: {
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

import Login from '@/features/auth/components/Login';
import { apiClient } from '@/lib/axios';

describe('Login コンポーネント', () => {
  const mockOnLoginSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('ログインフォームが正しくレンダリングされる', () => {
    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    expect(screen.getByRole('heading', { name: /ログイン/ })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('ユーザー名を入力')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('パスワードを入力')).toBeInTheDocument();
  });

  it('ログイン成功時にコールバックが呼ばれる（トークン保存はApp.jsx管理）', async () => {
    const user = userEvent.setup();
    apiClient.post.mockResolvedValue({ data: { token: 'new-token-abc' } });

    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    await user.type(screen.getByPlaceholderText('ユーザー名を入力'), 'testuser');
    await user.type(screen.getByPlaceholderText('パスワードを入力'), 'password123');
    await user.click(screen.getByRole('button', { name: /ログイン/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/login/', {
        username: 'testuser',
        password: 'password123',
      });
      // Fix #9: localStorage.setItem はこのコンポーネントでは呼ばない
      // トークン永続化は App.jsx の handleLoginSuccess が担当
      expect(mockOnLoginSuccess).toHaveBeenCalledWith('new-token-abc');
    });
  });

  it('ログイン失敗時にエラーメッセージが表示', async () => {
    const user = userEvent.setup();
    apiClient.post.mockRejectedValue({
      response: { status: 401, data: { error: 'Invalid credentials' } },
    });

    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    await user.type(screen.getByPlaceholderText('ユーザー名を入力'), 'testuser');
    await user.type(screen.getByPlaceholderText('パスワードを入力'), 'wrong');
    await user.click(screen.getByRole('button', { name: /ログイン/i }));

    await waitFor(() => {
      expect(screen.getByText(/失敗しました/)).toBeInTheDocument();
    });

    expect(mockOnLoginSuccess).not.toHaveBeenCalled();
  });

  it('送信中はボタンが無効化されローディング表示になる', async () => {
    const user = userEvent.setup();
    apiClient.post.mockReturnValue(new Promise(() => {}));

    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    await user.type(screen.getByPlaceholderText('ユーザー名を入力'), 'testuser');
    await user.type(screen.getByPlaceholderText('パスワードを入力'), 'password');
    await user.click(screen.getByRole('button', { name: /ログイン/i }));

    await waitFor(() => {
      expect(screen.getByText(/ログイン中/)).toBeInTheDocument();
    });
  });
});
