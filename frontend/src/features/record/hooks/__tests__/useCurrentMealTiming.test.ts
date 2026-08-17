import { describe, it, expect } from 'vitest';
import { getMealTimingForHour } from '../useCurrentMealTiming';

describe('getMealTimingForHour', () => {
  it('7時: 朝食', () => {
    expect(getMealTimingForHour(7)).toBe('breakfast');
  });

  it('12時: 昼食', () => {
    expect(getMealTimingForHour(12)).toBe('lunch');
  });

  it('16時: 間食', () => {
    expect(getMealTimingForHour(16)).toBe('snack');
  });

  it('19時: 夕食', () => {
    expect(getMealTimingForHour(19)).toBe('dinner');
  });

  it('23時: 深夜は夕食（日跨ぎ対応）', () => {
    expect(getMealTimingForHour(23)).toBe('dinner');
  });

  it('2時: 深夜は夕食', () => {
    expect(getMealTimingForHour(2)).toBe('dinner');
  });

  it('境界値 4時は朝食の開始', () => {
    expect(getMealTimingForHour(4)).toBe('breakfast');
  });

  it('境界値 3時59分相当(3時)はまだ夕食側', () => {
    expect(getMealTimingForHour(3)).toBe('dinner');
  });
});
