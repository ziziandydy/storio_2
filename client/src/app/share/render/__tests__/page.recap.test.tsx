// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { makeRecap } from '@/lib/recap/__tests__/fixtures';
import type { RenderPayload } from '../page';

const signIn = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { signInAnonymously: signIn, getSession: vi.fn() } },
  getURL: (p: string) => p,
}));

import ShareRenderPage from '../page';

type RenderWindow = Window & { __RENDER_DATA__?: RenderPayload; __RENDER_READY__?: boolean };

function inject(payload: RenderPayload) {
  (window as RenderWindow).__RENDER_DATA__ = payload;
}

const recapPayload = (over: Partial<RenderPayload['item']> = {}, settings: RenderPayload['settings'] = {}): RenderPayload => ({
  template: 'recap-scene',
  item: { recap: makeRecap(), sceneKey: 'total', ...over },
  settings,
});

describe('/share/render：recap-scene', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    (window as RenderWindow).__RENDER_READY__ = false;
  });
  afterEach(() => {
    cleanup();
    (window as unknown as { __RENDER_DATA__?: RenderPayload }).__RENDER_DATA__ = undefined;
    vi.unstubAllGlobals();
  });

  it('預設語系 zh-TW 渲染出場景', async () => {
    inject(recapPayload());
    render(<ShareRenderPage />);
    await waitFor(() => expect(screen.getByTestId('scene-frame')).toBeTruthy(), { timeout: 3000 });
    expect(document.body.textContent).toContain('部作品');
  });

  it('settings.locale 為 en-US 時用英文文案', async () => {
    inject(recapPayload({}, { locale: 'en-US' }));
    render(<ShareRenderPage />);
    await waitFor(() => expect(document.body.textContent).toContain('This year, you collected'), { timeout: 3000 });
  });

  it('aspectRatio 4:5 → frame 高 500；9:16 → 711', async () => {
    inject(recapPayload({}, { aspectRatio: '4:5' }));
    const a = render(<ShareRenderPage />);
    await waitFor(() => expect(a.getByTestId('scene-frame')).toBeTruthy(), { timeout: 3000 });
    expect((a.getByTestId('scene-frame') as HTMLElement).style.height).toBe('500px');
    cleanup();

    inject(recapPayload({}, { aspectRatio: '9:16' }));
    const b = render(<ShareRenderPage />);
    await waitFor(() => expect(b.getByTestId('scene-frame')).toBeTruthy(), { timeout: 3000 });
    expect((b.getByTestId('scene-frame') as HTMLElement).style.height).toBe('711px');
  });

  it('心得索引由 settings.recapReflectionIndex 決定', async () => {
    inject(recapPayload({ sceneKey: 'reflection' }, { recapReflectionIndex: 1 }));
    render(<ShareRenderPage />);
    await waitFor(() => expect(document.body.textContent).toContain('還行'), { timeout: 3000 });
  });

  it('場景資料為 null 不崩潰，且仍會設定 __RENDER_READY__', async () => {
    inject(recapPayload({ recap: makeRecap({ movies: null }), sceneKey: 'movies' }));
    render(<ShareRenderPage />);
    await waitFor(() => expect((window as RenderWindow).__RENDER_READY__).toBe(true), { timeout: 3000 });
  });

  it('渲染期間沒有副作用：不呼叫 fetch、不建立匿名帳號', async () => {
    inject(recapPayload());
    render(<ShareRenderPage />);
    await waitFor(() => expect((window as RenderWindow).__RENDER_READY__).toBe(true), { timeout: 3000 });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(signIn).not.toHaveBeenCalled();
  });

  it('data-screenshot 容器包住場景（Puppeteer 截圖目標）', async () => {
    inject(recapPayload());
    const { container } = render(<ShareRenderPage />);
    await waitFor(() => expect(container.querySelector('[data-screenshot]')).not.toBeNull(), { timeout: 3000 });
    expect(container.querySelector('[data-screenshot] [data-testid="scene-frame"]')).not.toBeNull();
  });
});
