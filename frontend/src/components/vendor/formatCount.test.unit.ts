import { describe, it, expect } from 'vitest';
import { formatCount } from './formatCount';

describe('formatCount', () => {
  it('should return the number as-is for values under 1000', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(1)).toBe('1');
    expect(formatCount(999)).toBe('999');
  });

  it('should format thousands as "k"', () => {
    expect(formatCount(1000)).toBe('1k');
    expect(formatCount(1500)).toBe('1.5k');
    expect(formatCount(2000)).toBe('2k');
    expect(formatCount(15432)).toBe('15.4k');
  });

  it('should format millions as "M"', () => {
    expect(formatCount(1_000_000)).toBe('1M');
    expect(formatCount(2_500_000)).toBe('2.5M');
  });

  it('should handle edge cases', () => {
    expect(formatCount(999_999)).toBe('1000k');
    expect(formatCount(1_100_000)).toBe('1.1M');
  });
});
