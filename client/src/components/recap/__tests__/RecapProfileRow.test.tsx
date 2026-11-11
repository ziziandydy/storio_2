// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';

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
import { dismiss } from '@/lib/recap/entry';

const yearsData = (list: number[], currentCount: number, currentYear = 2026) => ({
  threshold: 3,
  years: list.map((year) => ({ year, count: 5 })),
  current: { year: currentYear, count: currentCount },
});
const set = (years: unknown, loading = false, error = false) => (m.years.current = { years, loading, error });
const OUT = new Date(2026, 5, 1); // 窗口外（6 月）：Profile 列不被置頂卡片取代

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
    render(<RecapProfileRow today={OUT} />);
    expect(screen.getByText(`再收藏 ${needed} 部，就能看到你的 2026`)).toBeTruthy();
    const row = screen.getByTestId('recap-profile-row') as HTMLButtonElement;
    expect(row.disabled).toBe(true);
    fireEvent.click(row);
    expect(m.push).not.toHaveBeenCalled();
  });

  it('全年顯示（標籤「年度 Recap」）', () => {
    set(yearsData([2026], 5));
    render(<RecapProfileRow today={OUT} />);
    expect(screen.getByText('年度 Recap')).toBeTruthy();
  });

  it('只有往年達標、當年不足：顯示鼓勵文案但仍可點入，單一年份直接導向', () => {
    set(yearsData([2025], 1));
    render(<RecapProfileRow today={OUT} />);
    expect(screen.getByText('再收藏 2 部，就能看到你的 2026')).toBeTruthy();
    fireEvent.click(screen.getByTestId('recap-profile-row'));
    expect(m.push).toHaveBeenCalledWith('/recap?year=2025');
  });

  it('當年已達標：不顯示鼓勵文案', () => {
    set(yearsData([2026], 5));
    const { container } = render(<RecapProfileRow today={OUT} />);
    expect(container.textContent).not.toContain('再收藏');
    fireEvent.click(screen.getByTestId('recap-profile-row'));
    expect(m.push).toHaveBeenCalledWith('/recap?year=2026');
  });

  it('多個年份：開年份選單，選 2025 導向 /recap?year=2025', () => {
    set(yearsData([2026, 2025], 5));
    render(<RecapProfileRow today={OUT} />);
    expect(screen.queryByTestId('recap-year-picker')).toBeNull();
    fireEvent.click(screen.getByTestId('recap-profile-row'));
    expect(m.push).not.toHaveBeenCalled();
    expect(screen.getByTestId('recap-year-picker')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /2025/ }));
    expect(m.push).toHaveBeenCalledWith('/recap?year=2025');
  });

  it('年份選單可關閉（點背景）', () => {
    set(yearsData([2026, 2025], 5));
    render(<RecapProfileRow today={OUT} />);
    fireEvent.click(screen.getByTestId('recap-profile-row'));
    fireEvent.click(screen.getByTestId('recap-year-picker-backdrop'));
    expect(screen.queryByTestId('recap-year-picker')).toBeNull();
  });

  it('載入中與失敗：仍顯示列、不崩潰、點擊無反應', () => {
    set(null, true);
    const a = render(<RecapProfileRow today={OUT} />);
    fireEvent.click(a.getByTestId('recap-profile-row'));
    cleanup();
    set(null, false, true);
    const b = render(<RecapProfileRow today={OUT} />);
    expect(b.getByText('年度 Recap')).toBeTruthy();
    fireEvent.click(b.getByTestId('recap-profile-row'));
    expect(m.push).not.toHaveBeenCalled();
  });

  it('英文：鼓勵文案佔位符已被替換', () => {
    m.locale.current = 'en-US';
    set(yearsData([], 1));
    const { container } = render(<RecapProfileRow today={OUT} />);
    expect(container.textContent).toContain('Collect 2 more to unlock your 2026 Recap');
    expect(container.textContent).not.toContain('{n}');
    expect(container.textContent).not.toContain('{year}');
  });

  it('中英文對照：中文介面副標 Year in Review，英文介面副標 年度回顧', () => {
    set(yearsData([2026], 5));
    const zh = render(<RecapProfileRow today={OUT} />);
    expect(zh.getByText('Year in Review')).toBeTruthy();
    cleanup();
    m.locale.current = 'en-US';
    const en = render(<RecapProfileRow today={OUT} />);
    expect(en.getByText('年度回顧')).toBeTruthy();
  });

  describe('限時窗口內', () => {
    const IN = new Date(2026, 11, 5);
    beforeEach(() => localStorage.clear());

    it('置頂卡片還在時，這一列隱藏（避免重複入口）', () => {
      set(yearsData([2026], 5));
      render(<RecapProfileRow today={IN} />);
      expect(screen.queryByTestId('recap-profile-row')).toBeNull();
    });

    it('窗口內但對應年份未達標：照常顯示（沒有置頂卡片）', () => {
      set(yearsData([2025], 1));
      render(<RecapProfileRow today={IN} />);
      expect(screen.getByTestId('recap-profile-row')).toBeTruthy();
    });

    it('已關閉過卡片：這一列顯示，但不跳提示（提示只在當下關閉時出現）', () => {
      localStorage.setItem('storio_recap_dismissed_2026', '1');
      set(yearsData([2026], 5));
      render(<RecapProfileRow today={IN} />);
      expect(screen.getByTestId('recap-profile-row')).toBeTruthy();
      expect(screen.queryByTestId('recap-dismiss-hint')).toBeNull();
    });

    it('同一頁關閉卡片後：這一列出現並跳出提示，點提示可關掉', () => {
      set(yearsData([2026], 5));
      render(<RecapProfileRow today={IN} />);
      expect(screen.queryByTestId('recap-profile-row')).toBeNull();
      act(() => dismiss(2026));
      expect(screen.getByTestId('recap-profile-row')).toBeTruthy();
      expect(screen.getByTestId('recap-dismiss-hint').textContent).toContain('年度 Recap');
      fireEvent.click(screen.getByTestId('recap-dismiss-hint'));
      expect(screen.queryByTestId('recap-dismiss-hint')).toBeNull();
    });

    it('關閉卡片後把這一列捲到畫面中央（這一列在長頁面中段，否則提示會在螢幕外）', () => {
      const scroll = vi.fn();
      Element.prototype.scrollIntoView = scroll;
      set(yearsData([2026], 5));
      render(<RecapProfileRow today={IN} />);
      expect(scroll).not.toHaveBeenCalled();
      act(() => dismiss(2026));
      expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    });

    it('提示 6 秒後自動消失', () => {
      vi.useFakeTimers();
      try {
        set(yearsData([2026], 5));
        render(<RecapProfileRow today={IN} />);
        act(() => dismiss(2026));
        expect(screen.getByTestId('recap-dismiss-hint')).toBeTruthy();
        act(() => {
          vi.advanceTimersByTime(6100);
        });
        expect(screen.queryByTestId('recap-dismiss-hint')).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
