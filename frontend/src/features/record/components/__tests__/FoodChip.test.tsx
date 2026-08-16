import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FoodChip } from '../FoodChip';

const mockMeal = {
  id: 1,
  meal_name: '鶏胸肉のグリル',
  meal_timing: 'lunch',
  calories: 250.4,
  protein: 30.5,
  fat: 8.2,
  carbohydrates: 5.1,
};

describe('FoodChip', () => {
  it('食品名が表示される', () => {
    render(<FoodChip meal={mockMeal} />);
    expect(screen.getByText('鶏胸肉のグリル')).toBeInTheDocument();
  });

  it('カロリーが整数で表示される', () => {
    render(<FoodChip meal={mockMeal} />);
    expect(screen.getByText('250kcal')).toBeInTheDocument();
  });

  it('PFC値が表示される', () => {
    render(<FoodChip meal={mockMeal} />);
    expect(screen.getByText('P:30.5g')).toBeInTheDocument();
    expect(screen.getByText('F:8.2g')).toBeInTheDocument();
    expect(screen.getByText('C:5.1g')).toBeInTheDocument();
  });

  it('編集ボタンクリックで onEdit が呼ばれる', async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();

    render(<FoodChip meal={mockMeal} onEdit={onEdit} />);

    await user.click(screen.getByLabelText('鶏胸肉のグリルを編集'));
    expect(onEdit).toHaveBeenCalledWith(mockMeal);
  });

  it('削除ボタンクリックで onDelete が呼ばれる', async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();

    render(<FoodChip meal={mockMeal} onDelete={onDelete} />);

    await user.click(screen.getByLabelText('鶏胸肉のグリルを削除'));
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it('onEdit/onDelete 未指定時はボタンが非表示', () => {
    render(<FoodChip meal={mockMeal} />);

    expect(screen.queryByLabelText('鶏胸肉のグリルを編集')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('鶏胸肉のグリルを削除')).not.toBeInTheDocument();
  });

  it('Myメニュー登録ボタンクリックで onSaveAsMenu が呼ばれる', async () => {
    const onSaveAsMenu = vi.fn();
    const user = userEvent.setup();

    render(<FoodChip meal={mockMeal} onSaveAsMenu={onSaveAsMenu} />);

    await user.click(screen.getByLabelText('鶏胸肉のグリルをMyメニューに登録'));
    expect(onSaveAsMenu).toHaveBeenCalledWith(mockMeal);
  });

  it('アクションボタンは hover なしで常時表示される', () => {
    // スマートフォン（PWA）が主な利用端末で hover が発火しないため、
    // opacity-0 のような hover-reveal クラスが付いていないことを確認する
    const { container } = render(
      <FoodChip meal={mockMeal} onEdit={vi.fn()} onDelete={vi.fn()} onSaveAsMenu={vi.fn()} />
    );

    expect(container.querySelector('.opacity-0')).not.toBeInTheDocument();
  });
});