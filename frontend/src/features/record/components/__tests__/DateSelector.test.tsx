import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateSelector } from '../DateSelector';

describe('DateSelector', () => {
  const today = new Date().toISOString().split('T')[0];

  it('選択日付が日本語形式で表示される', () => {
    render(<DateSelector selectedDate="2026-03-04" onDateChange={vi.fn()} />);

    expect(screen.getByText('3月4日（水）')).toBeInTheDocument();
  });

  it('前日ボタンで1日前の日付が渡される', async () => {
    const onDateChange = vi.fn();
    const user = userEvent.setup();

    render(<DateSelector selectedDate="2026-03-04" onDateChange={onDateChange} />);

    await user.click(screen.getByLabelText('前日'));
    expect(onDateChange).toHaveBeenCalledWith('2026-03-03');
  });

  it('翌日ボタンで1日後の日付が渡される', async () => {
    const onDateChange = vi.fn();
    const user = userEvent.setup();

    render(<DateSelector selectedDate="2026-03-03" onDateChange={onDateChange} />);

    await user.click(screen.getByLabelText('翌日'));
    expect(onDateChange).toHaveBeenCalledWith('2026-03-04');
  });

  it('今日の場合は TODAY バッジが表示される', () => {
    render(<DateSelector selectedDate={today} onDateChange={vi.fn()} />);

    expect(screen.getByText('TODAY')).toBeInTheDocument();
  });

  it('今日でない場合は「今日」ボタンが表示される', () => {
    render(<DateSelector selectedDate="2026-01-01" onDateChange={vi.fn()} />);

    expect(screen.getByText('今日')).toBeInTheDocument();
  });

  it('「今日」ボタンクリックで今日の日付が渡される', async () => {
    const onDateChange = vi.fn();
    const user = userEvent.setup();

    render(<DateSelector selectedDate="2026-01-01" onDateChange={onDateChange} />);

    await user.click(screen.getByText('今日'));
    expect(onDateChange).toHaveBeenCalledWith(today);
  });

  it('今日の場合は翌日ボタンが無効', () => {
    render(<DateSelector selectedDate={today} onDateChange={vi.fn()} />);

    expect(screen.getByLabelText('翌日')).toBeDisabled();
  });
});