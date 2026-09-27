import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import EditCustomFoodModal from '../EditCustomFoodModal';
import { customFoodApi } from '../../api/customFoodApi';
import { createMockCustomFood } from '@/test/helpers';
import { EMPTY_NUTRITION } from '@/types';

vi.mock('../../api/customFoodApi', () => ({ customFoodApi: { updateCustomFood: vi.fn() } }));

describe('Myアイテムの1食分編集', () => {
  it('重量不明の食品は1食分の値と空欄の重量をそのまま保存する', async () => {
    const food = createMockCustomFood({
      nutrition_basis: 'per_serving', serving_size_g: null,
      nutrition_per_serving: { ...EMPTY_NUTRITION, calories: 250, protein: 10 },
      calories_per_100g: null,
      source: 'url', source_url: 'https://example.com/nutrition',
    });
    vi.mocked(customFoodApi.updateCustomFood).mockResolvedValue(food);
    render(<EditCustomFoodModal show food={food} onClose={vi.fn()} onFoodUpdated={vi.fn()} />);
    expect(screen.getByText('栄養成分（1食あたり）')).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '更新する' }));
    await waitFor(() => expect(customFoodApi.updateCustomFood).toHaveBeenCalledWith(food.id,
      expect.objectContaining({
        nutrition_basis: 'per_serving', serving_size_g: null, source: 'url',
        source_url: 'https://example.com/nutrition', nutrition: food.nutrition_per_serving,
      })));
  });

  it('重量が分かる食品は100g値を1食分へ換算して送信する', async () => {
    const food = createMockCustomFood({ nutrition_basis: 'per_serving', serving_size_g: 50, calories_per_100g: 200 });
    vi.mocked(customFoodApi.updateCustomFood).mockResolvedValue(food);
    render(<EditCustomFoodModal show food={food} onClose={vi.fn()} onFoodUpdated={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '更新する' }));
    await waitFor(() => expect(customFoodApi.updateCustomFood).toHaveBeenCalledWith(food.id,
      expect.objectContaining({ nutrition: expect.objectContaining({ calories: 100 }), serving_size_g: 50 })));
  });
});
