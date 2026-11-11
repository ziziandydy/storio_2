// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

const m = vi.hoisted(() => ({
  push: vi.fn(),
  years: { current: { years: null as unknown, loading: false, error: false } },
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: m.push }) }));
vi.mock('@/hooks/useTranslation', async () => {
  const { translations } = await import('@/i18n/locales');
  return { useTranslation: () => ({ t: translations['zh-TW'], locale: 'zh-TW' }) };
});
vi.mock('@/hooks/useRecap', () => ({ useRecapYears: () => m.years.current }));

import RecapHomeCard from '../RecapHomeCard';

const yearsWith = (...years: number[]) => ({
  threshold: 3,
  years: years.map((year) => ({ year, count: 5 })),
  current: { year: 2026, count: 5 },
});
const set = (years: unknown, loading = false, error = false) => (m.years.current = { years, loading, error });
const d = (y: number, mo: number, day: number) => new Date(y, mo - 1, day);

describe('RecapHomeCard', () => {
  beforeEach(() => {
    m.push.mockReset();
    localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('12 月 5 日且當年達標 → 顯示卡片', () => {
    set(yearsWith(2026));
    render(<RecapHomeCard today={d(2026, 12, 5)} />);
    expect(screen.getByTestId('recap-home-card')).toBeTruthy();
    expect(screen.getByText('2026 年，你的故事回顧')).toBeTruthy();
  });

  it('1 月看去年：顯示 2026 年卡片', () => {
    set(yearsWith(2026));
    render(<RecapHomeCard today={d(2027, 1, 10)} />);
    expect(screen.getByText('2026 年，你的故事回顧')).toBeTruthy();
  });

  it('窗口外（3 月 1 日）即使往年達標也不顯示', () => {
    set(yearsWith(2025, 2026));
    render(<RecapHomeCard today={d(2027, 3, 1)} />);
    expect(screen.queryByTestId('recap-home-card')).toBeNull();
  });

  it('窗口內但對應年份未達標（不在清單）→ 不顯示', () => {
    set(yearsWith(2025));
    render(<RecapHomeCard today={d(2026, 12, 5)} />);
    expect(screen.queryByTestId('recap-home-card')).toBeNull();
  });

  it('載入中或失敗 → 不顯示', () => {
    set(null, true);
    const a = render(<RecapHomeCard today={d(2026, 12, 5)} />);
    expect(a.queryByTestId('recap-home-card')).toBeNull();
    cleanup();
    set(null, false, true);
    const b = render(<RecapHomeCard today={d(2026, 12, 5)} />);
    expect(b.queryByTestId('recap-home-card')).toBeNull();
  });

  it('點卡片導向 /recap?year=2026', () => {
    set(yearsWith(2026));
    render(<RecapHomeCard today={d(2026, 12, 5)} />);
    fireEvent.click(screen.getByRole('button', { name: /看我的 Recap/ }));
    expect(m.push).toHaveBeenCalledWith('/recap?year=2026');
  });

  it('關閉後立即隱藏、重新渲染不再出現；隔年（2027）窗口再次出現', () => {
    set(yearsWith(2026, 2027));
    const first = render(<RecapHomeCard today={d(2026, 12, 5)} />);
    fireEvent.click(screen.getByRole('button', { name: '關閉' }));
    expect(screen.queryByTestId('recap-home-card')).toBeNull();
    expect(m.push).not.toHaveBeenCalled();
    first.unmount();

    render(<RecapHomeCard today={d(2026, 12, 6)} />);
    expect(screen.queryByTestId('recap-home-card')).toBeNull();
    cleanup();

    render(<RecapHomeCard today={d(2027, 11, 2)} />);
    expect(screen.getByText('2027 年，你的故事回顧')).toBeTruthy();
  });

  it('localStorage 拋例外時仍顯示，點關閉不報錯且本次隱藏', () => {
    set(yearsWith(2026));
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    render(<RecapHomeCard today={d(2026, 12, 5)} />);
    expect(screen.getByTestId('recap-home-card')).toBeTruthy();
    expect(() => fireEvent.click(screen.getByRole('button', { name: '關閉' }))).not.toThrow();
    expect(screen.queryByTestId('recap-home-card')).toBeNull();
  });
});
