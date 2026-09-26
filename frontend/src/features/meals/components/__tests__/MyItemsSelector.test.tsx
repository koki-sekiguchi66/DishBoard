import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MyItemsSelector from '../MyItemsSelector';
import { mealApi } from '../../api/mealApi';
import { createMockCustomFood } from '@/test/helpers';

vi.mock('../../api/mealApi', () => ({ mealApi: { getCustomFoods: vi.fn() } }));

describe('Myアイテムの1食分と検証状態', () => {
  it('未検証バッジと1食分を表示し、実重量と食品IDを選択する', async () => {
    const food = createMockCustomFood({
      id: 42, name: 'プロテイン', calories_per_100g: 117 * 100 / 28,
      nutrition_basis: 'per_serving', serving_size_g: 28, is_verified: false,
    });
    vi.mocked(mealApi.getCustomFoods).mockResolvedValue([food]);
    const select = vi.fn();
    render(<MyItemsSelector onItemSelected={select} />);
    expect(await screen.findByText('未検証')).toBeInTheDocument();
    expect(screen.getByText('1食（28g）・117kcal')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('listitem'));
    expect(select).toHaveBeenCalledWith(expect.objectContaining({ item_id: 42, amount: 28 }));
  });
});
