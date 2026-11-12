import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeRecap } from './fixtures';
import {
  clearRenderCache,
  getCachedScene,
  renderRecapScene,
  renderRecapScenes,
  renderKey,
  recapFingerprint,
} from '../renderCache';
import type { RenderPayload } from '@/lib/share-api';

const settings = { aspectRatio: '9:16' as const, locale: 'zh-TW' as const, reflectionIndex: 0 };
const blobOf = (size: number) => new Blob([new Uint8Array(size)], { type: 'image/png' });

describe('Recap 分享圖渲染快取', () => {
  beforeEach(() => clearRenderCache());
  afterEach(() => vi.useRealTimers());

  it('同一場景同一組設定與資料只渲染一次，之後直接用快取（面板關掉再開也一樣）', async () => {
    const recap = makeRecap();
    const render = vi.fn().mockResolvedValue(blobOf(10));
    const a = await renderRecapScene({ recap, sceneKey: 'total', settings, render });
    const b = await renderRecapScene({ recap, sceneKey: 'total', settings, render });
    expect(render).toHaveBeenCalledTimes(1);
    expect(b).toBe(a);
    expect(getCachedScene(renderKey(recap, 'total', settings))).toBe(a);
  });

  it('同時要同一張（連點、重複勾選）只送出一次請求', async () => {
    const recap = makeRecap();
    let resolve!: (b: Blob) => void;
    const render = vi.fn().mockReturnValue(new Promise<Blob>((r) => (resolve = r)));
    const p1 = renderRecapScene({ recap, sceneKey: 'genres', settings, render });
    const p2 = renderRecapScene({ recap, sceneKey: 'genres', settings, render });
    resolve(blobOf(5));
    await Promise.all([p1, p2]);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('比例、語系、心得索引、場景、或資料任一改變就是不同的快取項', async () => {
    const recap = makeRecap();
    const render = vi.fn().mockImplementation(async () => blobOf(5));
    await renderRecapScene({ recap, sceneKey: 'total', settings, render });
    await renderRecapScene({ recap, sceneKey: 'total', settings: { ...settings, aspectRatio: '4:5' }, render });
    await renderRecapScene({ recap, sceneKey: 'total', settings: { ...settings, locale: 'en-US' }, render });
    await renderRecapScene({ recap, sceneKey: 'total', settings: { ...settings, reflectionIndex: 1 }, render });
    await renderRecapScene({ recap, sceneKey: 'movies', settings, render });
    await renderRecapScene({ recap: makeRecap({ total_count: 99 }), sceneKey: 'total', settings, render });
    expect(render).toHaveBeenCalledTimes(6);
  });

  it('資料內容相同（即使是新的物件，例如重新抓取）就沿用快取；資料不同就失效', async () => {
    expect(recapFingerprint(makeRecap())).toBe(recapFingerprint(makeRecap()));
    expect(recapFingerprint(makeRecap())).not.toBe(recapFingerprint(makeRecap({ total_count: 13 })));
    const render = vi.fn().mockResolvedValue(blobOf(5));
    await renderRecapScene({ recap: makeRecap(), sceneKey: 'total', settings, render });
    await renderRecapScene({ recap: makeRecap(), sceneKey: 'total', settings, render });
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('渲染請求內容與舊流程一致（recap-scene 模板、selectedTemplate 為場景鍵）', async () => {
    const recap = makeRecap();
    const render = vi.fn().mockResolvedValue(blobOf(5));
    await renderRecapScene({ recap, sceneKey: 'eras', settings: { ...settings, reflectionIndex: 2 }, render });
    const payload = render.mock.calls[0][0] as RenderPayload;
    expect(payload.template).toBe('recap-scene');
    expect(payload.item).toEqual({ recap, sceneKey: 'eras' });
    expect(payload.settings).toMatchObject({ aspectRatio: '9:16', locale: 'zh-TW', recapReflectionIndex: 2, selectedTemplate: 'eras' });
  });

  it('失敗不快取（下次可以重試）', async () => {
    const recap = makeRecap();
    const render = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(blobOf(5));
    await expect(renderRecapScene({ recap, sceneKey: 'total', settings, render })).rejects.toThrow('boom');
    expect(getCachedScene(renderKey(recap, 'total', settings))).toBeNull();
    await renderRecapScene({ recap, sceneKey: 'total', settings, render });
    expect(render).toHaveBeenCalledTimes(2);
  });

  it('逾時（30 分鐘）後視為沒有，重新渲染', async () => {
    vi.useFakeTimers();
    const recap = makeRecap();
    const render = vi.fn().mockImplementation(async () => blobOf(5));
    await renderRecapScene({ recap, sceneKey: 'total', settings, render });
    vi.advanceTimersByTime(29 * 60 * 1000);
    expect(getCachedScene(renderKey(recap, 'total', settings))).not.toBeNull();
    vi.advanceTimersByTime(2 * 60 * 1000);
    expect(getCachedScene(renderKey(recap, 'total', settings))).toBeNull();
  });

  it('總量有上限（40MB）：超過時淘汰最久沒用的', async () => {
    const recap = makeRecap();
    const render = vi.fn().mockImplementation(async () => blobOf(15 * 1024 * 1024));
    await renderRecapScene({ recap, sceneKey: 'total', settings, render });
    await renderRecapScene({ recap, sceneKey: 'movies', settings, render });
    getCachedScene(renderKey(recap, 'total', settings)); // 用一下 total，讓 movies 變成最久沒用的
    await renderRecapScene({ recap, sceneKey: 'books', settings, render }); // 45MB > 40MB
    expect(getCachedScene(renderKey(recap, 'movies', settings))).toBeNull();
    expect(getCachedScene(renderKey(recap, 'total', settings))).not.toBeNull();
    expect(getCachedScene(renderKey(recap, 'books', settings))).not.toBeNull();
  });

  it('批次渲染：最多同時 2 張，回報進度，結果依輸入順序', async () => {
    const recap = makeRecap();
    let running = 0;
    let peak = 0;
    const render = vi.fn().mockImplementation(async () => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      running--;
      return blobOf(5);
    });
    const progress: number[] = [];
    const keys = ['total', 'movies', 'books', 'genres', 'eras'] as const;
    const result = await renderRecapScenes({
      recap, sceneKeys: [...keys], settings, render, onProgress: (done) => progress.push(done),
    });
    expect(peak).toBeLessThanOrEqual(2);
    expect(result.map((r) => r.sceneKey)).toEqual([...keys]);
    expect(progress[progress.length - 1]).toBe(5);
  });

  it('批次渲染：已在快取的不重打，只渲染缺的', async () => {
    const recap = makeRecap();
    const render = vi.fn().mockImplementation(async () => blobOf(5));
    await renderRecapScene({ recap, sceneKey: 'total', settings, render });
    render.mockClear();
    await renderRecapScenes({ recap, sceneKeys: ['total', 'movies'], settings, render });
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('批次渲染：任一張失敗就整批失敗（不可少張還當成功）', async () => {
    const recap = makeRecap();
    const render = vi.fn().mockImplementation(async (payload: RenderPayload) => {
      if ((payload.item as { sceneKey: string }).sceneKey === 'movies') throw new Error('nope');
      return blobOf(5);
    });
    await expect(renderRecapScenes({ recap, sceneKeys: ['total', 'movies', 'books'], settings, render })).rejects.toThrow('nope');
  });
});
