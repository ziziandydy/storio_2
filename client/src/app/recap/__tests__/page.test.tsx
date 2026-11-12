// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { makeRecap } from '@/lib/recap/__tests__/fixtures';
import { buildScenes } from '@/lib/recap/scenes';
import type { RecapData } from '@/lib/recap/types';

const m = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  retry: vi.fn(),
  search: { current: new URLSearchParams('year=2026') },
  recap: {
    current: { data: null as unknown, status: 'idle', needed: null as number | null },
  },
  user: { current: { is_anonymous: false } },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: m.push, replace: m.replace, back: m.back }),
  useSearchParams: () => m.search.current,
}));
vi.mock('@/hooks/useTranslation', async () => {
  const { translations } = await import('@/i18n/locales');
  return { useTranslation: () => ({ t: translations['zh-TW'], locale: 'zh-TW' }) };
});
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: m.user.current }) }));
vi.mock('@/hooks/useRecap', () => ({ useRecap: () => ({ ...m.recap.current, retry: m.retry }) }));
vi.mock('@/components/recap/RecapGuestHint', () => ({ default: () => <div data-testid="guest-hint" /> }));
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));
vi.mock('@/components/recap/RecapShareSheet', () => ({ default: () => null }));

import RecapPage from '../page';

const ready = (data: RecapData) => (m.recap.current = { data, status: 'ready', needed: null });
const stage = () => screen.getByTestId('story-stage');
/** 像用戶一樣點右側翻頁，翻到指定場景（'continue' 為最後一頁） */
const goTo = (recap: RecapData, key: string) => {
  const scenes = buildScenes(recap, { forShare: false });
  const target = key === 'continue' ? scenes.length : scenes.indexOf(key as never);
  for (let i = 0; i < target; i++) fireEvent.click(stage(), { clientX: 900 });
};

describe('Recap 預覽頁', () => {
  beforeEach(() => {
    Object.values({ a: m.push, b: m.replace, c: m.back, d: m.retry }).forEach((f) => f.mockReset());
    m.search.current = new URLSearchParams('year=2026');
    m.user.current = { is_anonymous: false };
    m.recap.current = { data: null, status: 'idle', needed: null };
  });
  afterEach(cleanup);

  it('ready：渲染 buildScenes 的場景數，且沒有結尾場景，最後一頁是「繼續收藏」', () => {
    const recap = makeRecap();
    ready(recap);
    render(<RecapPage />);
    expect(screen.getAllByTestId('recap-slide')).toHaveLength(buildScenes(recap, { forShare: false }).length);
    expect(screen.queryByTestId('scene-closing')).toBeNull();
    expect(screen.getByTestId('recap-continue')).toBeTruthy();
  });

  it('場景為 null 的不渲染（沒有電影場景）', () => {
    ready(makeRecap({ movies: null }));
    render(<RecapPage />);
    expect(screen.queryByTestId('scene-movies')).toBeNull();
    expect(screen.getByTestId('scene-total')).toBeTruthy();
  });

  it('只有開場與總數的資料也不崩潰', () => {
    ready(makeRecap({
      movies: null, series: null, books: null, genres: null, eras: null, title: null, monthly: null,
      peak_month: null, months_active: null, top_rated: null, first_last: null, reflection: null,
    }));
    render(<RecapPage />);
    expect(screen.getAllByTestId('recap-slide')).toHaveLength(2);
  });

  it('is_partial 時頁首顯示「今年到目前為止」徽章，否則沒有', () => {
    ready(makeRecap({ is_partial: true }));
    const a = render(<RecapPage />);
    expect(a.getByTestId('recap-partial-badge').textContent).toBe('今年到目前為止');
    cleanup();
    ready(makeRecap({ is_partial: false }));
    const b = render(<RecapPage />);
    expect(b.queryByTestId('recap-partial-badge')).toBeNull();
  });

  it('點「繼續收藏」導向 /search?focus=1', () => {
    const recap = makeRecap();
    ready(recap);
    render(<RecapPage />);
    goTo(recap, 'continue');
    fireEvent.click(screen.getByRole('button', { name: /繼續收藏/ }));
    expect(m.push).toHaveBeenCalledWith('/search?focus=1');
  });

  it('not_enough：顯示鼓勵文案（含還差幾部），不責備', () => {
    m.recap.current = { data: null, status: 'not_enough', needed: 2 };
    const { container } = render(<RecapPage />);
    expect(container.textContent).toContain('再收藏 2 部，就能看到你的 Recap');
    for (const banned of ['還沒', '尚未', '你沒有']) expect(container.textContent).not.toContain(banned);
  });

  it('error 與 forbidden：顯示重試並呼叫 retry', () => {
    for (const status of ['error', 'forbidden']) {
      m.recap.current = { data: null, status, needed: null };
      render(<RecapPage />);
      fireEvent.click(screen.getByRole('button', { name: '重試' }));
      cleanup();
    }
    expect(m.retry).toHaveBeenCalledTimes(2);
  });

  it('loading：顯示載入文案（不是空白）', () => {
    m.recap.current = { data: null, status: 'loading', needed: null };
    const { container } = render(<RecapPage />);
    expect(container.textContent).toContain('正在整理你的一年');
  });

  it('year 缺漏或不是數字 → 導回 /profile', () => {
    m.search.current = new URLSearchParams('');
    render(<RecapPage />);
    expect(m.replace).toHaveBeenCalledWith('/profile');
    cleanup();
    m.replace.mockReset();
    m.search.current = new URLSearchParams('year=abc');
    render(<RecapPage />);
    expect(m.replace).toHaveBeenCalledWith('/profile');
  });

  it('心得「換一句」：兩則時顯示並切換，只有一則時沒有按鈕', () => {
    const recap = makeRecap();
    ready(recap);
    const { container } = render(<RecapPage />);
    goTo(recap, 'reflection');
    expect(container.textContent).toContain('很棒');
    fireEvent.click(screen.getByRole('button', { name: '換一句' }));
    expect(container.textContent).toContain('還行');
    fireEvent.click(screen.getByRole('button', { name: '換一句' }));
    expect(container.textContent).toContain('很棒'); // 循環
    cleanup();

    const single = makeRecap({ reflection: { count: 1, candidates: [{ id: 'r1', title: 'T', poster_path: null, rating: 9, text: '唯一' }] } });
    ready(single);
    render(<RecapPage />);
    goTo(single, 'reflection');
    expect(screen.queryByRole('button', { name: '換一句' })).toBeNull();
  });

  it('訪客顯示登入提示，正式用戶不顯示', () => {
    ready(makeRecap());
    m.user.current = { is_anonymous: true };
    const a = render(<RecapPage />);
    expect(a.getByTestId('guest-hint')).toBeTruthy();
    cleanup();
    m.user.current = { is_anonymous: false };
    const b = render(<RecapPage />);
    expect(b.queryByTestId('guest-hint')).toBeNull();
  });

  it('限時動態式：整頁固定不可上下捲動，頂端有分段進度條（每場景＋最後一頁各一段），不再有圓點', () => {
    const recap = makeRecap();
    ready(recap);
    render(<RecapPage />);
    expect(screen.getByTestId('story-viewer').className).toContain('overflow-hidden');
    expect(screen.getAllByTestId('story-progress-fill')).toHaveLength(buildScenes(recap, { forShare: false }).length + 1);
    expect(screen.queryAllByTestId('recap-dot')).toHaveLength(0);
  });

  it('點右側翻頁、點左側回上一頁（回到開場）', () => {
    const recap = makeRecap();
    ready(recap);
    render(<RecapPage />);
    expect(screen.getByTestId('story-slide-0').style.visibility).toBe('visible');
    fireEvent.click(stage(), { clientX: 900 });
    expect(screen.getByTestId('story-slide-1').style.visibility).toBe('visible');
    fireEvent.click(stage(), { clientX: 5 });
    expect(screen.getByTestId('story-slide-0').style.visibility).toBe('visible');
  });

  it('頁首的返回與頁尾的分享按鈕不會被當成翻頁點擊', () => {
    ready(makeRecap());
    render(<RecapPage />);
    fireEvent.click(screen.getByRole('button', { name: '分享' }), { clientX: 900 });
    expect(screen.getByTestId('story-slide-0').style.visibility).toBe('visible');
  });

  it('預留分享入口位置（2B 接上）', () => {
    ready(makeRecap());
    render(<RecapPage />);
    expect(screen.getByTestId('recap-footer-slot')).toBeTruthy();
  });
});
