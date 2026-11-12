// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';

const m = vi.hoisted(() => ({
  years: { current: { years: null as unknown, loading: false, error: false } },
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('@/hooks/useTranslation', async () => {
  const { translations } = await import('@/i18n/locales');
  return { useTranslation: () => ({ t: translations['zh-TW'], locale: 'zh-TW' }) };
});
vi.mock('@/hooks/useRecap', () => ({ useRecapYears: () => m.years.current }));

import RecapAvatarLink from '../RecapAvatarLink';
import { dismiss } from '@/lib/recap/entry';

const yearsWith = (...years: number[]) => ({
  threshold: 3,
  years: years.map((year) => ({ year, count: 5 })),
  current: { year: 2026, count: 5 },
});
const set = (years: unknown, loading = false, error = false) => (m.years.current = { years, loading, error });
const IN = new Date(2026, 11, 5);

describe('RecapAvatarLink', () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it('窗口內、對應年份達標、未關閉：金色外框加 Recap 膠囊，仍連到 /profile', () => {
    set(yearsWith(2026));
    render(<RecapAvatarLink today={IN} avatarUrl="" />);
    expect(screen.getByTestId('recap-avatar-badge').textContent).toBe('Recap');
    expect(screen.getByTestId('recap-avatar-link').getAttribute('data-recap')).toBe('on');
    expect(screen.getByTestId('recap-avatar-link').getAttribute('href')).toBe('/profile');
  });

  it('窗口外 → 沒有外框與膠囊', () => {
    set(yearsWith(2026));
    render(<RecapAvatarLink today={new Date(2026, 5, 1)} avatarUrl="" />);
    expect(screen.queryByTestId('recap-avatar-badge')).toBeNull();
    expect(screen.getByTestId('recap-avatar-link').getAttribute('data-recap')).toBe('off');
  });

  it('對應年份未達標、載入中、失敗 → 沒有外框與膠囊', () => {
    set(yearsWith(2025));
    render(<RecapAvatarLink today={IN} avatarUrl="" />);
    expect(screen.queryByTestId('recap-avatar-badge')).toBeNull();
    cleanup();
    set(null, true);
    render(<RecapAvatarLink today={IN} avatarUrl="" />);
    expect(screen.queryByTestId('recap-avatar-badge')).toBeNull();
    cleanup();
    set(null, false, true);
    render(<RecapAvatarLink today={IN} avatarUrl="" />);
    expect(screen.queryByTestId('recap-avatar-badge')).toBeNull();
  });

  it('已關閉過 → 沒有外框；同一頁即時關閉 → 外框立刻消失', () => {
    set(yearsWith(2026));
    localStorage.setItem('storio_recap_dismissed_2026', '1');
    render(<RecapAvatarLink today={IN} avatarUrl="" />);
    expect(screen.queryByTestId('recap-avatar-badge')).toBeNull();
    cleanup();
    localStorage.clear();
    render(<RecapAvatarLink today={IN} avatarUrl="" />);
    expect(screen.getByTestId('recap-avatar-badge')).toBeTruthy();
    act(() => dismiss(2026));
    expect(screen.queryByTestId('recap-avatar-badge')).toBeNull();
  });

  it('有頭像網址時顯示頭像圖', () => {
    set(yearsWith(2026));
    const { container } = render(<RecapAvatarLink today={IN} avatarUrl="https://example.com/a.png" />);
    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://example.com/a.png');
  });
});
