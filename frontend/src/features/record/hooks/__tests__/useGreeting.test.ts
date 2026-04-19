import { describe, it, expect } from 'vitest';
import { getGreetingForHour } from '../useGreeting';

describe('getGreetingForHour', () => {
  it('5時: 朝の挨拶', () => {
    const result = getGreetingForHour(5);
    expect(result.emoji).toBe('☀️');
    expect(result.message).toContain('朝食');
  });

  it('8時: 朝の挨拶', () => {
    const result = getGreetingForHour(8);
    expect(result.emoji).toBe('☀️');
  });

  it('9時: 午前中の挨拶', () => {
    const result = getGreetingForHour(9);
    expect(result.emoji).toBe('🌤️');
    expect(result.message).toContain('午前中');
  });

  it('12時: ランチタイム', () => {
    const result = getGreetingForHour(12);
    expect(result.emoji).toBe('🌞');
    expect(result.message).toContain('昼食');
  });

  it('15時: 午後の挨拶', () => {
    const result = getGreetingForHour(15);
    expect(result.emoji).toBe('⛅');
    expect(result.message).toContain('間食');
  });

  it('19時: 夕方の挨拶', () => {
    const result = getGreetingForHour(19);
    expect(result.emoji).toBe('🌅');
    expect(result.message).toContain('夕食');
  });

  it('23時: 夜の挨拶', () => {
    const result = getGreetingForHour(23);
    expect(result.emoji).toBe('🌙');
    expect(result.message).toContain('お疲れさま');
  });

  it('0時: 深夜は夜の挨拶（日跨ぎ対応）', () => {
    const result = getGreetingForHour(0);
    expect(result.emoji).toBe('🌙');
  });

  it('3時: 深夜は夜の挨拶', () => {
    const result = getGreetingForHour(3);
    expect(result.emoji).toBe('🌙');
  });
});