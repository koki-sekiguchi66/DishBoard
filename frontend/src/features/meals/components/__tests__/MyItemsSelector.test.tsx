import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MyItemsSelector from '../MyItemsSelector';
import { mealApi } from '../../api/mealApi';
import { createMockCustomFood } from '@/test/helpers';
import { EMPTY_NUTRITION } from '@/types';
import { toMenuItemPayload } from '../MenuBuilderPanel';

vi.mock('../../api/mealApi', () => ({ mealApi: { getCustomFoods: vi.fn() } }));

describe('Myアイテムの1食分', () => {
  it('1食分を表示し、実重量と食品IDを選択する', async () => {
    const food = createMockCustomFood({
      id: 42, name: 'プロテイン', calories_per_100g: 117 * 100 / 28,
      nutrition_basis: 'per_serving', serving_size_g: 28,
    });
    vi.mocked(mealApi.getCustomFoods).mockResolvedValue([food]);
    const select = vi.fn();
    render(<MyItemsSelector onItemSelected={select} />);
    expect(await screen.findByText('1食（28g）・117kcal')).toBeInTheDocument();
    expect(screen.queryByText('未検証')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('listitem'));
    expect(select).toHaveBeenCalledWith(expect.objectContaining({ item_id: 42, amount: 28 }));
  });

  it('重量不明の場合は記録用データまで食数と栄養値を保持する', async () => {
    const food = createMockCustomFood({ id: 43, name: 'サンド', nutrition_basis: 'per_serving',
      serving_size_g: null, calories_per_100g: null,
      nutrition_per_serving: { ...EMPTY_NUTRITION, calories: 250, protein: 10 },
    });
    vi.mocked(mealApi.getCustomFoods).mockResolvedValue([food]);
    const select = vi.fn();
    render(<MyItemsSelector onItemSelected={item => select(toMenuItemPayload(item))} />);
    expect(await screen.findByText('1食あたり・250kcal（重量未設定）')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('listitem'));
    expect(select).toHaveBeenCalledWith(expect.objectContaining({ item_id: 43, amount_grams: null,
      servings: 1, calories: 250, protein: 10 }));
  });
});
