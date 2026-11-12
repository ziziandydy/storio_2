// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DEFAULT_POSTER } from '../posterSrc';
import { loadPoster, whenPostersSettled, __resetPosterLoader, MAX_CONCURRENT, LOAD_TIMEOUT_MS } from '../posterLoader';
import { FakeImage, flush } from './fakeImage';

const tmdb = (name: string) => `https://image.tmdb.org/t/p/w500/${name}.jpg`;
const isProxy = (s: string) => s.includes('/api/v1/proxy/image?url=');

describe('posterLoader：集中式海報載入器', () => {
  beforeEach(() => {
    FakeImage.install();
    __resetPosterLoader();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('直連成功就回傳直連網址（小尺寸、無代理）', async () => {
    const src = await loadPoster(tmdb('a'));
    expect(src).toBe('https://image.tmdb.org/t/p/w342/a.jpg');
    expect(FakeImage.created).toHaveLength(1);
  });

  it('同一張海報同時被多處要求只會真的載入一次', async () => {
    const results = await Promise.all([loadPoster(tmdb('a')), loadPoster(tmdb('a')), loadPoster(tmdb('a'))]);
    expect(new Set(results).size).toBe(1);
    expect(FakeImage.created).toHaveLength(1);
    // 之後再要同一張直接命中快取
    await loadPoster(tmdb('a'));
    expect(FakeImage.created).toHaveLength(1);
  });

  it('直連失敗退到後端代理（網址帶唯一參數），代理成功就用代理', async () => {
    FakeImage.behavior = (s) => (isProxy(s) ? 'ok' : 'fail');
    const src = await loadPoster(tmdb('b'));
    expect(isProxy(src)).toBe(true);
    expect(src).toMatch(/[?&]n=[a-z0-9]+/);
    expect(FakeImage.created).toHaveLength(2);
  });

  it('全部失敗回傳本機預設海報（不會把失敗網址交給 <img>），且不記住失敗、下次再試', async () => {
    FakeImage.behavior = () => 'fail';
    expect(await loadPoster(tmdb('c'))).toBe(DEFAULT_POSTER);
    const tried = FakeImage.created.length;
    expect(tried).toBe(2); // 直連 + 代理；預設海報是本機檔不用驗證

    FakeImage.behavior = () => 'ok';
    expect(await loadPoster(tmdb('c'))).toBe('https://image.tmdb.org/t/p/w342/c.jpg');
    expect(FakeImage.created.length).toBeGreaterThan(tried);
  });

  it('候選逾時沒回應就取消並換下一個來源', async () => {
    vi.useFakeTimers();
    FakeImage.behavior = (s) => (isProxy(s) ? 'ok' : 'hang');
    const p = loadPoster(tmdb('d'));
    await vi.advanceTimersByTimeAsync(LOAD_TIMEOUT_MS + 10);
    await vi.advanceTimersByTimeAsync(10);
    expect(isProxy(await p)).toBe(true);
    expect(FakeImage.created[0].src).toBe(''); // 逾時的那張被清掉 src 取消載入
  });

  it('同時載入的張數有上限', async () => {
    const paths = Array.from({ length: 12 }, (_, i) => tmdb(`p${i}`));
    await Promise.all(paths.map((p) => loadPoster(p)));
    expect(FakeImage.maxInflight).toBeLessThanOrEqual(MAX_CONCURRENT);
    expect(FakeImage.created).toHaveLength(12);
  });

  it('高優先（目前頁）的海報插隊到最前面', async () => {
    FakeImage.behavior = () => 'hang'; // 先把名額卡滿
    const blockers = Array.from({ length: MAX_CONCURRENT }, (_, i) => loadPoster(tmdb(`block${i}`)));
    loadPoster(tmdb('low1'));
    loadPoster(tmdb('low2'));
    loadPoster(tmdb('hi'), { priority: 'high' });
    // 放行：讓卡住的那幾張失敗，看接下來誰先被載入
    FakeImage.behavior = () => 'ok';
    FakeImage.created.forEach((img) => img.onerror?.());
    await flush();
    const order = FakeImage.srcs().filter((s) => !s.includes('block') && !isProxy(s));
    expect(order[0]).toContain('/hi.jpg');
    await Promise.all(blockers);
  });

  it('whenPostersSettled 等到所有佇列與進行中的載入都結束才 resolve', async () => {
    let settled = false;
    FakeImage.behavior = () => 'hang';
    const p = loadPoster(tmdb('e'));
    whenPostersSettled().then(() => {
      settled = true;
    });
    await flush();
    expect(settled).toBe(false);
    FakeImage.created[0].naturalWidth = 100;
    FakeImage.created[0].onload?.();
    await p;
    await flush();
    expect(settled).toBe(true);
    // 沒有任何載入時立即 resolve
    let immediate = false;
    whenPostersSettled().then(() => {
      immediate = true;
    });
    await flush(1);
    expect(immediate).toBe(true);
  });

  it('本機路徑與空值不經網路，直接回傳', async () => {
    expect(await loadPoster('/image/p.png')).toBe('/image/p.png');
    expect(await loadPoster(null)).toBe(DEFAULT_POSTER);
    expect(FakeImage.created).toHaveLength(0);
  });
});
