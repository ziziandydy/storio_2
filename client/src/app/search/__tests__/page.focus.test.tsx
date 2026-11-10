// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

const m = vi.hoisted(() => ({ params: { current: new URLSearchParams() } }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => m.params.current,
}));
vi.mock('next/image', () => ({ default: () => null }));
vi.mock('next/link', () => ({ default: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));
vi.mock('@/components/StoryCard', () => ({ default: () => null }));
vi.mock('@/components/AddToFolioModal', () => ({ default: () => null }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ token: 'tok', loading: false }) }));
vi.mock('@/components/ToastProvider', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('@/hooks/useTranslation', async () => {
  const { translations } = await import('@/i18n/locales');
  return { useTranslation: () => ({ t: translations['zh-TW'] }) };
});
vi.mock('@/lib/api', () => ({ getApiUrl: (p: string) => `http://api${p}` }));
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));

import SearchPage from '../page';

describe('搜尋頁 ?focus=1 自動對焦', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('focus=1：當前模式輸入框取得焦點', () => {
    m.params.current = new URLSearchParams('focus=1');
    render(<SearchPage />);
    const active = document.activeElement as HTMLInputElement;
    expect(active.tagName).toBe('INPUT');
    expect(active.disabled).toBe(false);
  });

  it('沒有 focus 參數：不自動對焦', () => {
    m.params.current = new URLSearchParams();
    render(<SearchPage />);
    expect(document.activeElement).toBe(document.body);
  });
});
