import { describe, it, expect } from 'vitest';
import { formatDuration, eraRange, fill, durationText } from '../format';

describe('fill', () => {
  it('替換所有佔位符', () => {
    expect(fill('再收藏 {n} 部，就能看到你的 {year}', { n: 2, year: 2026 })).toBe('再收藏 2 部，就能看到你的 2026');
    expect(fill('{n} + {n}', { n: 1 })).toBe('1 + 1');
  });

  it('沒有對應變數的佔位符保持原樣（不變成 undefined）', () => {
    expect(fill('{a} {b}', { a: 'x' })).toBe('x {b}');
  });
});

describe('durationText', () => {
  const zh = { hours: '{n} 小時', hoursOne: '{n} 小時', minutes: '{n} 分鐘', minutesOne: '{n} 分鐘' };
  const en = { hours: '{n} hours', hoursOne: '{n} hour', minutes: '{n} minutes', minutesOne: '{n} minute' };

  it('3907 分鐘 → 65 小時 / 65 hours', () => {
    expect(durationText(zh, 3907)).toBe('65 小時');
    expect(durationText(en, 3907)).toBe('65 hours');
  });

  it('單數：60 分鐘 → 1 hour；1 分鐘 → 1 minute', () => {
    expect(durationText(en, 60)).toBe('1 hour');
    expect(durationText(en, 1)).toBe('1 minute');
  });

  it('不到 60 分鐘用分鐘', () => {
    expect(durationText(zh, 45)).toBe('45 分鐘');
    expect(durationText(en, 45)).toBe('45 minutes');
  });
});

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

describe('eraRange', () => {
  it('十年的起訖年份，中英文相同', () => {
    expect(eraRange(1990)).toBe('1990–1999');
    expect(eraRange(2020)).toBe('2020–2029');
  });
});
