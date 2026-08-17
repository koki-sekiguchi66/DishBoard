import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MealTimingTabs } from '../MealTimingTabs';

const mockMeals = [
  { id: 1, meal_name: '白米', meal_timing: 'breakfast', calories: 252, protein: 3.8, fat: 0.5, carbohydrates: 55.7 },
  { id: 2, meal_name: '味噌汁', meal_timing: 'breakfast', calories: 40, protein: 2.1, fat: 0.8, carbohydrates: 5.2 },
  { id: 3, meal_name: 'カレーライス', meal_timing: 'lunch', calories: 600, protein: 15, fat: 20, carbohydrates: 85 },
  { id: 4, meal_name: 'チョコレート', meal_timing: 'snack', calories: 280, protein: 3.5, fat: 16, carbohydrates: 30 },
];

describe('MealTimingTabs', () => {
  // 初期選択タブは現在時刻から決まるため、実行時刻に依存しないよう朝の時刻に固定する。
  // vi.useFakeTimers() は user-event の内部待機（クリック間のイベントループ解決）と
  // 衝突してテストがタイムアウトするため、Date.prototype.getHours だけを差し替える
  beforeEach(() => {
    vi.spyOn(Date.prototype, 'getHours').mockReturnValue(7);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('4つのタブが表示される', () => {
    render(<MealTimingTabs meals={mockMeals} />);

    expect(screen.getByText('朝食')).toBeInTheDocument();
    expect(screen.getByText('昼食')).toBeInTheDocument();
    expect(screen.getByText('夕食')).toBeInTheDocument();
    expect(screen.getByText('間食')).toBeInTheDocument();
  });

  it('デフォルトで朝食タブが選択され、朝食の記録が表示される', () => {
    render(<MealTimingTabs meals={mockMeals} />);

    expect(screen.getByText('白米')).toBeInTheDocument();
    expect(screen.getByText('味噌汁')).toBeInTheDocument();
  });

  it('記録件数バッジが表示される', () => {
    render(<MealTimingTabs meals={mockMeals} />);

    // 朝食2件
    const breakfastTab = screen.getByText('朝食').closest('button');
    expect(breakfastTab).toHaveTextContent('2');
  });

  it('タブ切替で対応する食事が表示される', async () => {
    const user = userEvent.setup();
    render(<MealTimingTabs meals={mockMeals} />);

    await user.click(screen.getByText('昼食'));

    expect(screen.getByText('カレーライス')).toBeInTheDocument();
    expect(screen.queryByText('白米')).not.toBeInTheDocument();
  });

  it('記録がないタブでは空メッセージが表示される', async () => {
    const user = userEvent.setup();
    render(<MealTimingTabs meals={mockMeals} />);

    await user.click(screen.getByText('夕食'));

    expect(screen.getByText('夕食の記録がありません')).toBeInTheDocument();
  });

  it('onRepeatMeal を渡すとよく記録するメニューのチップを表示する', () => {
    const frequentMeal = { id: 99, meal_name: 'いつもの朝食', meal_timing: 'breakfast', calories: 400, protein: 10, fat: 5, carbohydrates: 60 };
    render(
      <MealTimingTabs
        meals={mockMeals}
        frequentMeals={{ breakfast: [frequentMeal], lunch: [], dinner: [], snack: [] } as never}
        onRepeatMeal={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'いつもの朝食' })).toBeInTheDocument();
  });

  it('onRepeatMeal を渡さなければチップを表示しない', () => {
    render(<MealTimingTabs meals={mockMeals} />);

    expect(screen.queryByText('よく記録するメニュー')).not.toBeInTheDocument();
  });
});