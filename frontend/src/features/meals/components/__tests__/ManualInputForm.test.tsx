import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/features/customFoods/api/customFoodApi', () => ({
  customFoodApi: {
    createCustomFood: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import ManualInputForm from '@/features/meals/components/ManualInputForm';

describe('ManualInputForm コンポーネント', () => {
  const mockOnAdd = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('フォームが正しくレンダリングされる', () => {
    render(<ManualInputForm onAdd={mockOnAdd} />);

    expect(screen.getByText(/手動入力/)).toBeInTheDocument();
  });

  it('基本栄養素フィールドが表示される', () => {
    render(<ManualInputForm onAdd={mockOnAdd} />);

    expect(screen.getByText(/カロリー/)).toBeInTheDocument();
    expect(screen.getByText(/タンパク質/)).toBeInTheDocument();
    expect(screen.getByText(/脂質/)).toBeInTheDocument();
    expect(screen.getByText(/炭水化物/)).toBeInTheDocument();
  });

  it('食品名と栄養素を入力してメニューに追加', async () => {
    const user = userEvent.setup();
    render(<ManualInputForm onAdd={mockOnAdd} />);

    const nameInput = screen.getByPlaceholderText(/お弁当/);
    await user.type(nameInput, 'テスト食品');

    const addButton = screen.getByRole('button', { name: /^メニューに追加$/ });

    if (addButton) {
      await user.click(addButton);

      await waitFor(() => {
        expect(mockOnAdd).toHaveBeenCalled();
      });
    }
  });

  it('食品名が空の場合はコールバックしない', async () => {
    const user = userEvent.setup();
    render(<ManualInputForm onAdd={mockOnAdd} />);

    const addButton = screen.getByRole('button', { name: /^メニューに追加$/ });

    if (addButton) {
      await user.click(addButton);

      expect(mockOnAdd).not.toHaveBeenCalled();
    }
  });
});
