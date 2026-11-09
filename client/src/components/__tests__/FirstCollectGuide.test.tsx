// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

const m = vi.hoisted(() => ({
  push: vi.fn(),
  count: { current: { count: null as number | null, loading: false } },
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: m.push }) }));
vi.mock('@/hooks/useTranslation', async () => {
  const { translations } = await import('@/i18n/locales');
  return { useTranslation: () => ({ t: translations['zh-TW'] }) };
});
vi.mock('@/hooks/useCollectionCount', () => ({ useCollectionCount: () => m.count.current }));
vi.mock('@/components/HomeStats', () => ({ default: () => <div data-testid="home-stats" /> }));

import FirstCollectGuide, { HomeCollectionArea } from '../FirstCollectGuide';

describe('FirstCollectGuide', () => {
  beforeEach(() => m.push.mockReset());
  afterEach(cleanup);

  it('顯示 eyebrow、標題、按鈕與提示', () => {
    render(<FirstCollectGuide />);
    expect(screen.getByText('FIRST STORY')).toBeTruthy();
    expect(screen.getByText('收藏你的第一部作品')).toBeTruthy();
    expect(screen.getByRole('button', { name: /搜尋你近期看過的作品/ })).toBeTruthy();
    expect(screen.getByText('或直接點下方的熱門海報收藏')).toBeTruthy();
  });

  it('點擊按鈕導向 /search?focus=1', () => {
    render(<FirstCollectGuide />);
    fireEvent.click(screen.getByRole('button', { name: /搜尋你近期看過的作品/ }));
    expect(m.push).toHaveBeenCalledWith('/search?focus=1');
  });

  it('沒有 input（搜尋入口是按鈕）', () => {
    const { container } = render(<FirstCollectGuide />);
    expect(container.querySelector('input')).toBeNull();
  });
});

describe('HomeCollectionArea 首頁 gating', () => {
  afterEach(cleanup);
  const set = (count: number | null, loading = false) => (m.count.current = { count, loading });

  it('count===0：顯示引導區，無 HomeStats 與「檢視」按鈕', () => {
    set(0);
    render(<HomeCollectionArea />);
    expect(screen.getByText('收藏你的第一部作品')).toBeTruthy();
    expect(screen.queryByTestId('home-stats')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it.each([1, 9])('count=%i：與現況一致（統計＋檢視按鈕，無引導區）', (n) => {
    set(n);
    render(<HomeCollectionArea />);
    expect(screen.getByTestId('home-stats')).toBeTruthy();
    expect(screen.getByRole('link').getAttribute('href')).toBe('/collection');
    expect(screen.queryByText('收藏你的第一部作品')).toBeNull();
  });

  it('loading：引導區與統計皆不顯示', () => {
    set(null, true);
    render(<HomeCollectionArea />);
    expect(screen.queryByText('收藏你的第一部作品')).toBeNull();
    expect(screen.queryByTestId('home-stats')).toBeNull();
  });

  it('失敗（count null）：回退現況，不顯示引導區', () => {
    set(null, false);
    render(<HomeCollectionArea />);
    expect(screen.queryByText('收藏你的第一部作品')).toBeNull();
    expect(screen.getByTestId('home-stats')).toBeTruthy();
    expect(screen.getByRole('link')).toBeTruthy();
  });
});
