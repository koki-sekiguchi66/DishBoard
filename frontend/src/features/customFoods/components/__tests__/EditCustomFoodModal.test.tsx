import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import EditCustomFoodModal from '../EditCustomFoodModal';
import { customFoodApi } from '../../api/customFoodApi';
import { createMockCustomFood } from '@/test/helpers';

vi.mock('../../api/customFoodApi', () => ({ customFoodApi: { updateCustomFood: vi.fn() } }));

describe('Myアイテムの出典確認', () => {
  it('出典と基準を保持して利用者の確認状態を保存する', async () => {
    const food = createMockCustomFood({
      nutrition_basis: 'per_serving', serving_size_g: 28,
      source: 'url', source_url: 'https://example.com/nutrition', is_verified: false,
    });
    vi.mocked(customFoodApi.updateCustomFood).mockResolvedValue({ ...food, is_verified: true });
    render(<EditCustomFoodModal show food={food} onClose={vi.fn()} onFoodUpdated={vi.fn()} />);
    fireEvent.click(screen.getByRole('switch', { name: '出典と栄養値を確認済み' }));
    fireEvent.click(screen.getByRole('button', { name: '更新する' }));
    await waitFor(() => expect(customFoodApi.updateCustomFood).toHaveBeenCalledWith(food.id,
      expect.objectContaining({
        nutrition_basis: 'per_serving', serving_size_g: 28, source: 'url',
        source_url: 'https://example.com/nutrition', is_verified: true,
        calories_per_100g: food.calories_per_100g,
      })));
  });
});
