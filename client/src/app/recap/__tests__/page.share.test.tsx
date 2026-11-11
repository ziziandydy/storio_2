// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { makeRecap } from '@/lib/recap/__tests__/fixtures';
import type { RecapData } from '@/lib/recap/types';

const m = vi.hoisted(() => ({
  track: vi.fn(),
  recap: { current: { data: null as unknown, status: 'idle', needed: null as number | null } },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams('year=2026'),
}));
vi.mock('@/hooks/useTranslation', async () => {
  const { translations } = await import('@/i18n/locales');
  return { useTranslation: () => ({ t: translations['zh-TW'], locale: 'zh-TW' }) };
});
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { is_anonymous: false } }) }));
vi.mock('@/hooks/useRecap', () => ({ useRecap: () => ({ ...m.recap.current, retry: vi.fn() }) }));
vi.mock('@/lib/analytics', () => ({ track: m.track }));
vi.mock('@/components/recap/RecapGuestHint', () => ({ default: () => null }));
vi.mock('@/components/recap/RecapShareSheet', () => ({
  default: (props: { isOpen: boolean; reflectionIndex: number; locale: string }) => (
    <div data-testid="share-sheet-mock" data-open={String(props.isOpen)} data-reflection={props.reflectionIndex} data-locale={props.locale} />
  ),
}));

import RecapPage from '../page';

const ready = (data: RecapData) => (m.recap.current = { data, status: 'ready', needed: null });

describe('Recap 預覽頁：分享與事件', () => {
  beforeEach(() => {
    m.track.mockReset();
    m.recap.current = { data: null, status: 'idle', needed: null };
  });
  afterEach(cleanup);

  it('ready → 記錄 recap_opened 恰一次，即使資料因 metadata_pending 重取而換新物件', () => {
    ready(makeRecap({ metadata_pending: 2 }));
    const view = render(<RecapPage />);
    expect(m.track).toHaveBeenCalledTimes(1);
    expect(m.track).toHaveBeenCalledWith('recap_opened', { year: 2026 });

    ready(makeRecap({ metadata_pending: 0, total_count: 99 })); // 重取後的新物件
    view.rerender(<RecapPage />);
    expect(m.track).toHaveBeenCalledTimes(1);
  });

  it.each(['loading', 'not_enough', 'error', 'forbidden'])('%s 不記錄 recap_opened', (status) => {
    m.recap.current = { data: null, status, needed: 2 };
    render(<RecapPage />);
    expect(m.track).not.toHaveBeenCalled();
  });

  it('按「分享」開啟面板，並傳入目前的心得索引與語系', () => {
    ready(makeRecap());
    render(<RecapPage />);
    expect(screen.getByTestId('share-sheet-mock').getAttribute('data-open')).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: '分享' }));
    const sheet = screen.getByTestId('share-sheet-mock');
    expect(sheet.getAttribute('data-open')).toBe('true');
    expect(sheet.getAttribute('data-reflection')).toBe('0');
    expect(sheet.getAttribute('data-locale')).toBe('zh-TW');
  });

  it('預覽換句後再開面板，收到更新後的心得索引', () => {
    ready(makeRecap());
    render(<RecapPage />);
    fireEvent.click(screen.getByRole('button', { name: '換一句' }));
    fireEvent.click(screen.getByRole('button', { name: '分享' }));
    expect(screen.getByTestId('share-sheet-mock').getAttribute('data-reflection')).toBe('1');
  });

  it('forbidden／error／not_enough 沒有分享按鈕', () => {
    for (const status of ['forbidden', 'error', 'not_enough']) {
      m.recap.current = { data: null, status, needed: 1 };
      render(<RecapPage />);
      expect(screen.queryByRole('button', { name: '分享' })).toBeNull();
      cleanup();
    }
  });
});
