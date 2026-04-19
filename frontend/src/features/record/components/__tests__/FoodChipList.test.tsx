import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FoodChipList } from '../FoodChipList';

const mockMeals = [
  { id: 1, meal_name: '白米', meal_timing: 'lunch', calories: 252, protein: 3.8, fat: 0.5, carbohydrates: 55.7 },
  { id: 2, meal_name: '鶏胸肉', meal_timing: 'lunch', calories: 191, protein: 23.3, fat: 7.8, carbohydrates: 0 },
];

describe('FoodChipList', () => {
  it('全ての食事記録がチップとして表示される', () => {
    render(<FoodChipList meals={mockMeals} />);

    expect(screen.getByText('白米')).toBeInTheDocument();
    expect(screen.getByText('鶏胸肉')).toBeInTheDocument();
  });

  it('0件の場合は空メッセージが表示される', () => {
    render(<FoodChipList meals={[]} />);

    expect(screen.getByText('記録がありません')).toBeInTheDocument();
  });

  it('カスタム空メッセージが表示される', () => {
    render(<FoodChipList meals={[]} emptyMessage="朝食の記録がありません" />);

    expect(screen.getByText('朝食の記録がありません')).toBeInTheDocument();
  });

  it('onEdit/onDelete が各チップに渡される', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(<FoodChipList meals={mockMeals} onEdit={onEdit} onDelete={onDelete} />);

    expect(screen.getByLabelText('白米を編集')).toBeInTheDocument();
    expect(screen.getByLabelText('鶏胸肉を削除')).toBeInTheDocument();
  });
});