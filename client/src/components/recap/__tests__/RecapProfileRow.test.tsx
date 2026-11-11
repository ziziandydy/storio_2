// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

const m = vi.hoisted(() => ({
  push: vi.fn(),
  locale: { current: 'zh-TW' as 'zh-TW' | 'en-US' },
  years: { current: { years: null as unknown, loading: false, error: false } },
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: m.push }) }));
vi.mock('@/hooks/useTranslation', async () => {
  const { translations } = await import('@/i18n/locales');
  return { useTranslation: () => ({ t: translations[m.locale.current], locale: m.locale.current }) };
});
vi.mock('@/hooks/useRecap', () => ({ useRecapYears: () => m.years.current }));

import RecapProfileRow from '../RecapProfileRow';

const yearsData = (list: number[], currentCount: number, currentYear = 2026) => ({
  threshold: 3,
  years: list.map((year) => ({ year, count: 5 })),
  current: { year: currentYear, count: currentCount },
});
const set = (years: unknown, loading = false, error = false) => (m.years.current = { years, loading, error });

describe('RecapProfileRow', () => {
  beforeEach(() => {
    m.push.mockReset();
    m.locale.current = 'zh-TW';
  });
  afterEach(cleanup);

  it.each([
    [0, 3],
    [1, 2],
    [2, 1],
  ])('當年 %i 部且沒有任何達標年份：顯示還差 %i 部，且不可點入', (count, needed) => {
    set(yearsData([], count));
    render(<RecapProfileRow />);
    expect(screen.getByText(`再收藏 ${needed} 部，就能看到你的 2026`)).toBeTruthy();
    const row = screen.getByTestId('recap-profile-row') as HTMLButtonElement;
    expect(row.disabled).toBe(true);
    fireEvent.click(row);
    expect(m.push).not.toHaveBeenCalled();
  });

  it('全年顯示（標籤「年度 Recap」）', () => {
    set(yearsData([2026], 5));
    render(<RecapProfileRow />);
    expect(screen.getByText('年度 Recap')).toBeTruthy();
  });

  it('只有往年達標、當年不足：顯示鼓勵文案但仍可點入，單一年份直接導向', () => {
    set(yearsData([2025], 1));
    render(<RecapProfileRow />);
    expect(screen.getByText('再收藏 2 部，就能看到你的 2026')).toBeTruthy();
    fireEvent.click(screen.getByTestId('recap-profile-row'));
    expect(m.push).toHaveBeenCalledWith('/recap?year=2025');
  });

  it('當年已達標：不顯示鼓勵文案', () => {
    set(yearsData([2026], 5));
    const { container } = render(<RecapProfileRow />);
    expect(container.textContent).not.toContain('再收藏');
    fireEvent.click(screen.getByTestId('recap-profile-row'));
    expect(m.push).toHaveBeenCalledWith('/recap?year=2026');
  });

  it('多個年份：開年份選單，選 2025 導向 /recap?year=2025', () => {
    set(yearsData([2026, 2025], 5));
    render(<RecapProfileRow />);
    expect(screen.queryByTestId('recap-year-picker')).toBeNull();
    fireEvent.click(screen.getByTestId('recap-profile-row'));
    expect(m.push).not.toHaveBeenCalled();
    expect(screen.getByTestId('recap-year-picker')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /2025/ }));
    expect(m.push).toHaveBeenCalledWith('/recap?year=2025');
  });

  it('年份選單可關閉（點背景）', () => {
    set(yearsData([2026, 2025], 5));
    render(<RecapProfileRow />);
    fireEvent.click(screen.getByTestId('recap-profile-row'));
    fireEvent.click(screen.getByTestId('recap-year-picker-backdrop'));
    expect(screen.queryByTestId('recap-year-picker')).toBeNull();
  });

  it('載入中與失敗：仍顯示列、不崩潰、點擊無反應', () => {
    set(null, true);
    const a = render(<RecapProfileRow />);
    fireEvent.click(a.getByTestId('recap-profile-row'));
    cleanup();
    set(null, false, true);
    const b = render(<RecapProfileRow />);
    expect(b.getByText('年度 Recap')).toBeTruthy();
    fireEvent.click(b.getByTestId('recap-profile-row'));
    expect(m.push).not.toHaveBeenCalled();
  });

  it('英文：鼓勵文案佔位符已被替換', () => {
    m.locale.current = 'en-US';
    set(yearsData([], 1));
    const { container } = render(<RecapProfileRow />);
    expect(container.textContent).toContain('Collect 2 more to unlock your 2026 Recap');
    expect(container.textContent).not.toContain('{n}');
    expect(container.textContent).not.toContain('{year}');
  });
});
