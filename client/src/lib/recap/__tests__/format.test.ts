import { describe, it, expect } from 'vitest';
import { formatDuration, decadeLabel } from '../format';

describe('formatDuration', () => {
  it('90 分鐘 → 四捨五入成 2 小時', () => {
    expect(formatDuration(90, 'zh-TW')).toEqual({ value: 2, unit: 'h' });
  });

  it('不到 60 分鐘用分鐘', () => {
    expect(formatDuration(45, 'zh-TW')).toEqual({ value: 45, unit: 'm' });
  });

  it('整 60 分鐘 → 1 小時', () => {
    expect(formatDuration(60, 'en-US')).toEqual({ value: 1, unit: 'h' });
  });

  it('3907 分鐘 → 65 小時', () => {
    expect(formatDuration(3907, 'zh-TW')).toEqual({ value: 65, unit: 'h' });
  });

  it('0 分鐘 → 0 分鐘', () => {
    expect(formatDuration(0, 'en-US')).toEqual({ value: 0, unit: 'm' });
  });
});

describe('decadeLabel', () => {
  it('zh-TW：1990 → 90 年代、2010 → 10 年代、2000 → 00 年代', () => {
    expect(decadeLabel(1990, 'zh-TW')).toBe('90 年代');
    expect(decadeLabel(2010, 'zh-TW')).toBe('10 年代');
    expect(decadeLabel(2000, 'zh-TW')).toBe('00 年代');
  });

  it('en-US：2010 → 2010s、1990 → 1990s', () => {
    expect(decadeLabel(2010, 'en-US')).toBe('2010s');
    expect(decadeLabel(1990, 'en-US')).toBe('1990s');
  });
});
