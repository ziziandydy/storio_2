// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { makeRecap } from '@/lib/recap/__tests__/fixtures';
import { buildScenes } from '@/lib/recap/scenes';

const m = vi.hoisted(() => ({
  isNative: vi.fn(),
  health: vi.fn(),
  saveAll: vi.fn(),
  shareOne: vi.fn(),
  track: vi.fn(),
  prioritize: vi.fn(),
  cleanup: vi.fn(),
  cache: { current: {} as Record<string, { blob: Blob; objectUrl: string }> },
  optionCalls: [] as { allTemplates: string[]; settings: Record<string, unknown>; enabled: boolean }[],
  rendering: { current: false },
  queue: { current: [] as string[] },
}));

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: m.isNative } }));
vi.mock('@/hooks/useTranslation', async () => {
  const { translations } = await import('@/i18n/locales');
  return { useTranslation: () => ({ t: translations['zh-TW'], locale: 'zh-TW' }) };
});
vi.mock('@/lib/share-api', () => ({ getRenderServiceHealth: m.health }));
vi.mock('@/lib/analytics', () => ({ track: m.track }));
vi.mock('@/lib/recap/shareImages', () => ({ saveAllImages: m.saveAll, shareOneImage: m.shareOne }));
vi.mock('@/hooks/useProgressiveRenderQueue', () => ({
  useProgressiveRenderQueue: (opts: { allTemplates: string[]; settings: Record<string, unknown>; enabled: boolean }) => {
    m.optionCalls.push({ allTemplates: opts.allTemplates, settings: opts.settings, enabled: opts.enabled });
    return {
      getCacheEntry: (id: string) => m.cache.current[id] ?? null,
      prioritize: m.prioritize,
      isRendering: m.rendering.current,
      queue: m.queue.current,
      reset: vi.fn(),
      cleanup: m.cleanup,
    };
  },
}));

import RecapShareSheet from '../RecapShareSheet';

const recap = makeRecap();
const allKeys = buildScenes(recap, { forShare: true });
const fillCache = (keys: string[]) => {
  m.cache.current = Object.fromEntries(keys.map((k) => [k, { blob: new Blob([k]), objectUrl: `blob:${k}` }]));
};
const last = () => m.optionCalls[m.optionCalls.length - 1];
const open = (props: Partial<React.ComponentProps<typeof RecapShareSheet>> = {}) =>
  render(<RecapShareSheet isOpen onClose={() => {}} recap={recap} reflectionIndex={0} locale="zh-TW" {...props} />);
const readyMain = async () => {
  await waitFor(() => expect((screen.getByTestId('share-main') as HTMLButtonElement).disabled).toBe(false));
};

describe('RecapShareSheet', () => {
  beforeEach(() => {
    Object.values({ a: m.isNative, b: m.health, c: m.saveAll, d: m.shareOne, e: m.track, f: m.prioritize, g: m.cleanup }).forEach((f) => f.mockReset());
    m.optionCalls.length = 0;
    m.rendering.current = false;
    m.queue.current = [];
    m.isNative.mockReturnValue(true);
    m.health.mockResolvedValue(true);
    fillCache(allKeys);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('預設全選，且場景清單不含「繼續收藏」與影片選項', async () => {
    const { container } = open();
    await waitFor(() => expect(screen.getAllByRole('checkbox')).toHaveLength(allKeys.length));
    for (const box of screen.getAllByRole('checkbox')) expect((box as HTMLInputElement).checked).toBe(true);
    expect(container.textContent).not.toContain('繼續收藏');
    expect(container.textContent).not.toMatch(/影片|video/i);
  });

  it('取消勾選心得：queue 不再包含它，且儲存時不含心得圖（即使它先前已渲染並快取）', async () => {
    m.saveAll.mockResolvedValue({ status: 'saved' });
    open();
    await readyMain();
    fireEvent.click(screen.getByTestId('scene-check-reflection'));
    expect(last().allTemplates).not.toContain('reflection');

    fireEvent.click(screen.getByTestId('share-main'));
    await waitFor(() => expect(m.saveAll).toHaveBeenCalled());
    const names = m.saveAll.mock.calls[0][0].map((i: { name: string }) => i.name);
    expect(names).not.toContain('reflection');
    expect(names).toHaveLength(allKeys.length - 1);
  });

  it('輸出順序與場景順序一致', async () => {
    m.saveAll.mockResolvedValue({ status: 'saved' });
    open();
    await readyMain();
    fireEvent.click(screen.getByTestId('share-main'));
    await waitFor(() => expect(m.saveAll).toHaveBeenCalled());
    expect(m.saveAll.mock.calls[0][0].map((i: { name: string }) => i.name)).toEqual(allKeys);
  });

  it('切到 4:5：settings.aspectRatio 為 4:5', async () => {
    open();
    await waitFor(() => expect(last()).toBeTruthy());
    fireEvent.click(screen.getByTestId('ratio-4:5'));
    expect(last().settings.aspectRatio).toBe('4:5');
  });

  it('心得索引改變：settings.recapReflectionIndex 跟著變（快取 key 隨之失效）', async () => {
    const view = open({ reflectionIndex: 0 });
    expect(last().settings.recapReflectionIndex).toBe(0);
    view.rerender(<RecapShareSheet isOpen onClose={() => {}} recap={recap} reflectionIndex={1} locale="zh-TW" />);
    expect(last().settings.recapReflectionIndex).toBe(1);
    expect(last().settings.locale).toBe('zh-TW');
  });

  it('勾選的場景尚未渲染完成：主按鈕停用', async () => {
    fillCache(allKeys.filter((k) => k !== 'total'));
    open();
    await waitFor(() => expect(screen.getByTestId('share-progress')).toBeTruthy());
    expect((screen.getByTestId('share-main') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId('share-progress').textContent).toContain(`${allKeys.length - 1}/${allKeys.length}`);
  });

  it('全部取消勾選：主按鈕停用', async () => {
    open();
    await readyMain();
    for (const box of screen.getAllByRole('checkbox')) fireEvent.click(box);
    expect((screen.getByTestId('share-main') as HTMLButtonElement).disabled).toBe(true);
  });

  it('勾選一個尚未渲染的場景時會插隊渲染', async () => {
    fillCache(allKeys.filter((k) => k !== 'books'));
    open();
    await waitFor(() => expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByTestId('scene-check-books')); // 取消
    m.prioritize.mockClear();
    fireEvent.click(screen.getByTestId('scene-check-books')); // 再勾回來
    expect(m.prioritize).toHaveBeenCalledWith('books');
  });

  // ---- 審查修正 ----

  it('I-1 自癒：渲染結束後，勾選的場景沒有快取且不在佇列時重新排入（渲染途中切比例的卡死情境）', async () => {
    m.rendering.current = true;
    const view = open();
    await waitFor(() => expect(screen.getByTestId('share-sheet')).toBeTruthy());
    m.prioritize.mockClear();

    fillCache(allKeys.filter((k) => k !== 'movies'));
    m.rendering.current = false;
    view.rerender(<RecapShareSheet isOpen onClose={() => {}} recap={recap} reflectionIndex={0} locale="zh-TW" />);
    await waitFor(() => expect(m.prioritize).toHaveBeenCalledWith('movies'));
  });

  it('I-1 自癒有上限：同一場景最多補排 2 次，避免圖片服務壞掉時無限重試', async () => {
    const view = open();
    await waitFor(() => expect(screen.getByTestId('share-sheet')).toBeTruthy());
    m.prioritize.mockClear();
    fillCache(allKeys.filter((k) => k !== 'movies'));
    for (let i = 0; i < 5; i++) {
      m.rendering.current = true;
      view.rerender(<RecapShareSheet isOpen onClose={() => {}} recap={recap} reflectionIndex={0} locale="zh-TW" />);
      m.rendering.current = false;
      view.rerender(<RecapShareSheet isOpen onClose={() => {}} recap={recap} reflectionIndex={0} locale="zh-TW" />);
    }
    expect(m.prioritize.mock.calls.filter(([k]) => k === 'movies').length).toBeLessThanOrEqual(2);
  });

  it('I-2 快取過期後按儲存：不呼叫儲存、重排缺的場景並提示重新準備（不顯示成功、不記錄事件）', async () => {
    m.saveAll.mockResolvedValue({ status: 'saved' });
    open();
    await readyMain();
    fillCache(allKeys.filter((k) => k !== 'genres')); // TTL 過期：genres 的快取消失，面板尚未重繪
    m.prioritize.mockClear();

    fireEvent.click(screen.getByTestId('share-main'));

    expect(m.saveAll).not.toHaveBeenCalled();
    expect(m.prioritize).toHaveBeenCalledWith('genres');
    await waitFor(() => expect(screen.getByTestId('share-result').textContent).toContain('重新準備'));
    expect(screen.getByTestId('share-result').textContent).not.toContain('已儲存');
    expect(m.track).not.toHaveBeenCalled();
  });

  it('I-3 網頁下載：downloaded 顯示中性文案（不說「相簿」），仍記錄事件', async () => {
    m.isNative.mockReturnValue(false);
    m.saveAll.mockResolvedValue({ status: 'downloaded' });
    open();
    await readyMain();
    fireEvent.click(screen.getByTestId('share-main'));
    await waitFor(() => expect(screen.getByTestId('share-result').textContent).toContain('已開始下載'));
    expect(screen.getByTestId('share-result').textContent).not.toContain('相簿');
    expect(m.track).toHaveBeenCalledTimes(1);
  });

  it('I-4 縮圖框比例跟著輸出比例（4:5 不被 9:16 框裁切）', async () => {
    open();
    await waitFor(() => expect(screen.getByTestId('scene-thumb-total')).toBeTruthy());
    expect(screen.getByTestId('scene-thumb-total').className).toContain('aspect-[9/16]');
    fireEvent.click(screen.getByTestId('ratio-4:5'));
    expect(screen.getByTestId('scene-thumb-total').className).toContain('aspect-[4/5]');
    expect(screen.getByTestId('scene-thumb-total').className).not.toContain('aspect-[9/16]');
  });

  it('cancelled：不顯示「已儲存」，也不記錄 recap_shared', async () => {
    m.saveAll.mockResolvedValue({ status: 'cancelled' });
    const { container } = open();
    await readyMain();
    fireEvent.click(screen.getByTestId('share-main'));
    await waitFor(() => expect(m.saveAll).toHaveBeenCalled());
    expect(container.textContent).not.toContain('已儲存到相簿');
    expect(m.track).not.toHaveBeenCalled();
  });

  it('saved：顯示「已儲存到相簿」並記錄 recap_shared（年份與張數）', async () => {
    m.saveAll.mockResolvedValue({ status: 'saved' });
    open();
    await readyMain();
    fireEvent.click(screen.getByTestId('share-main'));
    await waitFor(() => expect(screen.getByTestId('share-result').textContent).toContain('已儲存到相簿'));
    expect(m.track).toHaveBeenCalledTimes(1);
    expect(m.track).toHaveBeenCalledWith('recap_shared', { year: 2026, sceneCount: allKeys.length });
  });

  it('shared：中性文案「已完成」（不宣稱已存相簿），仍記錄事件', async () => {
    m.saveAll.mockResolvedValue({ status: 'shared' });
    open();
    await readyMain();
    fireEvent.click(screen.getByTestId('share-main'));
    await waitFor(() => expect(screen.getByTestId('share-result').textContent).toContain('已完成'));
    expect(screen.getByTestId('share-result').textContent).not.toContain('相簿');
    expect(m.track).toHaveBeenCalledTimes(1);
  });

  it('error：顯示錯誤、不記錄事件，主按鈕仍可再按（重試）', async () => {
    m.saveAll.mockResolvedValue({ status: 'error', message: 'x' });
    open();
    await readyMain();
    fireEvent.click(screen.getByTestId('share-main'));
    await waitFor(() => expect(screen.getByTestId('share-result').textContent).toContain('沒有成功'));
    expect(m.track).not.toHaveBeenCalled();
    expect((screen.getByTestId('share-main') as HTMLButtonElement).disabled).toBe(false);
  });

  it('「分享這一張」只傳該場景', async () => {
    m.shareOne.mockResolvedValue({ status: 'shared' });
    open();
    await readyMain();
    fireEvent.click(screen.getByTestId('share-one-movies'));
    await waitFor(() => expect(m.shareOne).toHaveBeenCalled());
    expect(m.shareOne.mock.calls[0][0].name).toBe('movies');
    expect(m.saveAll).not.toHaveBeenCalled();
  });

  it('單張分享成功時 recap_shared 場景數為 1', async () => {
    m.shareOne.mockResolvedValue({ status: 'shared' });
    open();
    await readyMain();
    fireEvent.click(screen.getByTestId('share-one-total'));
    await waitFor(() => expect(m.track).toHaveBeenCalledWith('recap_shared', { year: 2026, sceneCount: 1 }));
  });

  it('網頁版主按鈕文案為「下載全部」；原生為「儲存全部到相簿」', async () => {
    m.isNative.mockReturnValue(false);
    const web = open();
    await waitFor(() => expect(web.getByTestId('share-main').textContent).toContain('下載全部'));
    cleanup();
    m.isNative.mockReturnValue(true);
    const native = open();
    await waitFor(() => expect(native.getByTestId('share-main').textContent).toContain('儲存全部到相簿'));
  });

  it('關閉時呼叫 queue 的 cleanup', async () => {
    const view = open();
    await waitFor(() => expect(screen.getByTestId('share-sheet')).toBeTruthy());
    view.rerender(<RecapShareSheet isOpen={false} onClose={() => {}} recap={recap} reflectionIndex={0} locale="zh-TW" />);
    expect(m.cleanup).toHaveBeenCalled();
  });

  it('圖片服務一直沒起來：60 秒後顯示重試而不是無限轉圈', async () => {
    vi.useFakeTimers();
    m.health.mockResolvedValue(false);
    open();
    await act(async () => { await vi.advanceTimersByTimeAsync(61000); });
    expect(screen.getByTestId('share-retry')).toBeTruthy();
    expect(screen.getByText('圖片服務暫時無法使用')).toBeTruthy();
  });
});
