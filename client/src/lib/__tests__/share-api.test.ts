// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { computeSettingsHash, blobToBase64, renderShareImage, getRenderServiceHealth } from '@/lib/share-api';
import type { RenderPayload } from '@/lib/share-api';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('computeSettingsHash', () => {
  const base = { aspectRatio: '9:16', showTitle: true, showRating: true, showReflection: true } as const;

  it('相同設定得到相同 hash', () => {
    expect(computeSettingsHash({ ...base })).toBe(computeSettingsHash({ ...base }));
  });

  it('與 key 順序無關', () => {
    const reordered = { showReflection: true, showRating: true, showTitle: true, aspectRatio: '9:16' } as const;
    expect(computeSettingsHash(reordered)).toBe(computeSettingsHash({ ...base }));
  });

  it.each(['showTitle', 'showRating', 'showReflection'] as const)('%s 變更後 hash 改變（cache miss）', (key) => {
    expect(computeSettingsHash({ ...base, [key]: false })).not.toBe(computeSettingsHash({ ...base }));
  });

  it('aspectRatio 變更後 hash 改變', () => {
    expect(computeSettingsHash({ ...base, aspectRatio: '1:1' })).not.toBe(computeSettingsHash({ ...base }));
  });
});

describe('blobToBase64', () => {
  it('回傳純 base64（不含 data: 前綴）', async () => {
    const blob = new Blob(['hello'], { type: 'image/png' });
    expect(await blobToBase64(blob)).toBe('aGVsbG8=');
  });

  it('空 Blob 回傳空字串', async () => {
    expect(await blobToBase64(new Blob([], { type: 'image/png' }))).toBe('');
  });
});

describe('renderShareImage', () => {
  const payload = {
    template: 'memory-card',
    item: { title: 'Dune' },
    settings: { aspectRatio: '9:16', selectedTemplate: 'default' },
  } as unknown as RenderPayload;

  it('以 POST + JSON body 呼叫 /render 並回傳 Blob', async () => {
    const png = new Blob(['png'], { type: 'image/png' });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(png) });
    vi.stubGlobal('fetch', fetchMock);

    const out = await renderShareImage(payload);

    expect(out).toBe(png);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/render$/);
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual(payload);
  });

  it('服務回報錯誤時丟出服務的錯誤訊息', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({ error: 'render boom' }) }));
    await expect(renderShareImage(payload)).rejects.toThrow('render boom');
  });

  it('錯誤回應不是 JSON 時退回 HTTP 狀態碼 / 預設訊息', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 502, json: () => Promise.reject(new Error('not json')) }));
    await expect(renderShareImage(payload)).rejects.toThrow('未知錯誤');
  });
});

describe('getRenderServiceHealth', () => {
  it('/health 回 200 → true', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    expect(await getRenderServiceHealth()).toBe(true);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/health$/);
  });

  it('非 2xx → false', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    expect(await getRenderServiceHealth()).toBe(false);
  });

  it('網路錯誤 → false（不丟出）', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    expect(await getRenderServiceHealth()).toBe(false);
  });

  it('3 秒逾時會 abort 請求並回 false', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url: string, init: { signal: AbortSignal }) =>
      new Promise((_res, rej) => init.signal.addEventListener('abort', () => rej(new Error('aborted'))))));
    const p = getRenderServiceHealth();
    await vi.advanceTimersByTimeAsync(3000);
    expect(await p).toBe(false);
  });
});
