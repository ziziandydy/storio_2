// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const renderShareImage = vi.fn();
vi.mock('@/lib/share-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/share-api')>('@/lib/share-api');
  return { ...actual, renderShareImage: (...a: unknown[]) => renderShareImage(...a) };
});

import { useProgressiveRenderQueue, invalidateCache } from '@/hooks/useProgressiveRenderQueue';

const TEMPLATES = ['default', 'pure', 'ticket'];
const getPayload = (id: string) => ({ template: 'memory-card', item: { title: id } }) as never;
const SETTINGS = { aspectRatio: '9:16', showTitle: true, showRating: true, showReflection: true } as never;

let urlSeq = 0;
const revoked: string[] = [];

const flush = (ms = 0) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

function setup(over: Partial<{ enabled: boolean; settings: unknown; currentTemplate: string }> = {}) {
  return renderHook(
    (props: { enabled: boolean; settings: unknown; currentTemplate: string }) =>
      useProgressiveRenderQueue({ allTemplates: TEMPLATES, getPayload, ...props, settings: props.settings as never }),
    { initialProps: { enabled: true, settings: SETTINGS, currentTemplate: 'default', ...over } },
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  urlSeq = 0; revoked.length = 0;
  renderShareImage.mockReset();
  renderShareImage.mockImplementation(async (p: { settings: { selectedTemplate: string } }) => new Blob([p.settings.selectedTemplate]));
  vi.stubGlobal('URL', Object.assign(URL, {
    createObjectURL: vi.fn(() => `blob:mock-${++urlSeq}`),
    revokeObjectURL: vi.fn((u: string) => { revoked.push(u); }),
  }));
  vi.spyOn(console, 'error').mockImplementation(() => {});
  invalidateCache();
  revoked.length = 0;
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('useProgressiveRenderQueue — 即時渲染', () => {
  it('enabled=false 時不發任何渲染請求', async () => {
    setup({ enabled: false });
    await flush(5000);
    expect(renderShareImage).not.toHaveBeenCalled();
  });

  it('啟用後依序渲染：目前模板優先，其餘依原順序', async () => {
    setup({ currentTemplate: 'pure' });
    await flush(100);
    const order = renderShareImage.mock.calls.map((c) => c[0].settings.selectedTemplate);
    expect(order).toEqual(['pure', 'default', 'ticket']);
  });

  it('payload 帶入共用設定與 selectedTemplate', async () => {
    setup();
    await flush(100);
    expect(renderShareImage.mock.calls[0][0]).toEqual({
      template: 'memory-card',
      item: { title: 'default' },
      settings: { ...(SETTINGS as object), selectedTemplate: 'default' },
    });
  });

  it('一次只跑一個渲染（不會同時打爆 Puppeteer）', async () => {
    let active = 0, peak = 0;
    renderShareImage.mockImplementation(async () => {
      active++; peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 50));
      active--; return new Blob(['x']);
    });
    setup();
    await flush(1000);
    expect(renderShareImage).toHaveBeenCalledTimes(3);
    expect(peak).toBe(1);
  });

  it('渲染完成後 getCacheEntry 回傳 blob 與 objectUrl', async () => {
    const { result } = setup();
    expect(result.current.getCacheEntry('default')).toBeNull();
    await flush(100);
    const entry = result.current.getCacheEntry('default');
    expect(entry?.objectUrl).toMatch(/^blob:mock-/);
    expect(entry?.blob).toBeInstanceOf(Blob);
    expect(result.current.isRendering).toBe(false);
    expect(result.current.queue).toEqual([]);
  });

  it('單一模板渲染失敗不阻擋其他模板，失敗的 cache 為 null', async () => {
    renderShareImage.mockImplementation(async (p: { settings: { selectedTemplate: string } }) => {
      if (p.settings.selectedTemplate === 'pure') throw new Error('boom');
      return new Blob(['ok']);
    });
    const { result } = setup();
    await flush(100);
    expect(result.current.getCacheEntry('default')).not.toBeNull();
    expect(result.current.getCacheEntry('pure')).toBeNull();
    expect(result.current.getCacheEntry('ticket')).not.toBeNull();
  });
});

describe('useProgressiveRenderQueue — 回歸：開啟 Modal 不重複渲染', () => {
  it('mount 後等過 debounce 時間，每個模板仍只渲染一次、URL 不被 revoke', async () => {
    const { result } = setup();
    await flush(100);
    const urls = TEMPLATES.map((t) => result.current.getCacheEntry(t)!.objectUrl);
    await flush(5000);
    expect(renderShareImage).toHaveBeenCalledTimes(TEMPLATES.length);
    expect(revoked).toEqual([]);
    TEMPLATES.forEach((t, i) => expect(result.current.getCacheEntry(t)!.objectUrl).toBe(urls[i]));
  });

  it('設定改了又改回原值，不會重新渲染', async () => {
    const { rerender } = setup();
    await flush(100);
    renderShareImage.mockClear();
    rerender({ enabled: true, settings: { ...(SETTINGS as object), showRating: false }, currentTemplate: 'default' });
    await flush(500);
    rerender({ enabled: true, settings: SETTINGS, currentTemplate: 'default' });
    await flush(3000);
    expect(renderShareImage).not.toHaveBeenCalled();
  });
});

describe('useProgressiveRenderQueue — prioritize', () => {
  it('把指定模板插到 queue 最前面', async () => {
    let release!: () => void;
    renderShareImage.mockImplementationOnce(() => new Promise((r) => { release = () => r(new Blob(['a'])); }));
    const { result } = setup();
    await flush(0);                       // default 渲染中，pure/ticket 排隊
    act(() => result.current.prioritize('ticket'));
    expect(result.current.queue[0]).toBe('ticket');
    release();
    await flush(100);
    const order = renderShareImage.mock.calls.map((c) => c[0].settings.selectedTemplate);
    expect(order).toEqual(['default', 'ticket', 'pure']);
  });

  it('回歸：渲染途中被選到的模板不會被誤刪，最終一定會渲染出來', async () => {
    let release!: () => void;
    renderShareImage.mockImplementationOnce(() => new Promise((r) => { release = () => r(new Blob(['a'])); }));
    const { result } = setup();
    await flush(0);
    act(() => result.current.prioritize('ticket'));
    release();
    await flush(200);
    expect(result.current.getCacheEntry('ticket')).not.toBeNull();
    expect(result.current.getCacheEntry('pure')).not.toBeNull();
  });

  it('已有 cache 的模板不會重新排入', async () => {
    const { result } = setup();
    await flush(100);
    renderShareImage.mockClear();
    act(() => result.current.prioritize('default'));
    await flush(100);
    expect(renderShareImage).not.toHaveBeenCalled();
  });
});

describe('useProgressiveRenderQueue — 設定變更', () => {
  it('設定變更 1.5s debounce 後才重新渲染，且使用新設定', async () => {
    const { result, rerender } = setup();
    await flush(100);
    renderShareImage.mockClear();

    rerender({ enabled: true, settings: { ...(SETTINGS as object), showRating: false }, currentTemplate: 'default' });
    await flush(1000);
    expect(renderShareImage).not.toHaveBeenCalled();           // debounce 中
    await flush(600);
    expect(renderShareImage).toHaveBeenCalledTimes(3);
    expect(renderShareImage.mock.calls[0][0].settings.showRating).toBe(false);
    expect(result.current.getCacheEntry('default')).not.toBeNull();
  });

  it('連續快速切換只觸發一輪渲染', async () => {
    const { rerender } = setup();
    await flush(100);
    renderShareImage.mockClear();
    for (const showTitle of [false, true, false]) {
      rerender({ enabled: true, settings: { ...(SETTINGS as object), showTitle }, currentTemplate: 'default' });
      await flush(300);
    }
    await flush(2000);
    expect(renderShareImage).toHaveBeenCalledTimes(3);
    expect(renderShareImage.mock.calls[0][0].settings.showTitle).toBe(false);
  });

  it('設定變更時舊設定的 objectUrl 會被 revoke', async () => {
    const { result, rerender } = setup();
    await flush(100);
    const old = result.current.getCacheEntry('default')!.objectUrl;
    rerender({ enabled: true, settings: { ...(SETTINGS as object), showReflection: false }, currentTemplate: 'default' });
    await flush(1600);
    expect(revoked).toContain(old);
  });
});

describe('useProgressiveRenderQueue — TTL 與清理', () => {
  it('超過 5 分鐘視為 miss，但讀取時不會 revoke 畫面上仍在顯示的 URL', async () => {
    const { result } = setup();
    await flush(100);
    const url = result.current.getCacheEntry('default')!.objectUrl;
    await flush(5 * 60 * 1000 + 1000);
    revoked.length = 0;
    expect(result.current.getCacheEntry('default')).toBeNull();
    expect(revoked).not.toContain(url);
  });

  it('重新渲染覆蓋過期項目時才 revoke 舊 URL', async () => {
    const { result } = setup();
    await flush(100);
    const old = result.current.getCacheEntry('default')!.objectUrl;
    await flush(5 * 60 * 1000 + 1000);
    act(() => result.current.prioritize('default'));
    await flush(100);
    expect(revoked).toContain(old);
    expect(result.current.getCacheEntry('default')?.objectUrl).not.toBe(old);
  });

  it('cleanup 會 revoke 全部 objectUrl 並清空 queue', async () => {
    const { result } = setup();
    await flush(100);
    const urls = TEMPLATES.map((t) => result.current.getCacheEntry(t)!.objectUrl);
    act(() => result.current.cleanup());
    urls.forEach((u) => expect(revoked).toContain(u));
    expect(result.current.getCacheEntry('default')).toBeNull();
    expect(result.current.queue).toEqual([]);
  });
});
