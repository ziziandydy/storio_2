// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const m = vi.hoisted(() => ({
  isNative: vi.fn(),
  write: vi.fn(),
  del: vi.fn(),
  share: vi.fn(),
}));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: m.isNative } }));
vi.mock('@capacitor/filesystem', () => ({
  Filesystem: { writeFile: m.write, deleteFile: m.del },
  Directory: { Cache: 'CACHE' },
}));
vi.mock('@capacitor/share', () => ({ Share: { share: m.share } }));
vi.mock('@/lib/share-api', () => ({ blobToBase64: vi.fn(async () => 'AAAA') }));

import { saveAllImages, shareOneImage } from '../shareImages';

const images = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ name: `scene${i + 1}`, blob: new Blob(['x'], { type: 'image/png' }) }));

describe('shareImages — 原生', () => {
  beforeEach(() => {
    Object.values(m).forEach((f) => f.mockReset());
    m.isNative.mockReturnValue(true);
    let n = 0;
    m.write.mockImplementation(async () => ({ uri: `file:///cache/${++n}.png` }));
    m.del.mockResolvedValue(undefined);
  });

  it('SaveToCameraRoll → saved；Share 收到全部檔案且順序一致', async () => {
    m.share.mockResolvedValue({ activityType: 'com.apple.UIKit.activity.SaveToCameraRoll' });
    const result = await saveAllImages(images(3), { title: 'Recap' });
    expect(result.status).toBe('saved');
    const arg = m.share.mock.calls[0][0];
    expect(arg.files).toEqual(['file:///cache/1.png', 'file:///cache/2.png', 'file:///cache/3.png']);
    expect(arg.title).toBe('Recap');
  });

  it('其他 activityType（複製到某個 App）→ shared，不宣稱已儲存', async () => {
    m.share.mockResolvedValue({ activityType: 'com.apple.UIKit.activity.RemoteOpenInApplication-ByCopy' });
    expect((await saveAllImages(images(2), { title: 'Recap' })).status).toBe('shared');
  });

  it('Android 沒有 activityType → shared', async () => {
    m.share.mockResolvedValue({});
    expect((await saveAllImages(images(2), { title: 'Recap' })).status).toBe('shared');
  });

  it('用戶取消分享面板 → cancelled（不是成功）', async () => {
    m.share.mockRejectedValue(new Error('Share canceled'));
    expect((await saveAllImages(images(2), { title: 'Recap' })).status).toBe('cancelled');
  });

  it('其他分享例外 → error', async () => {
    m.share.mockRejectedValue(new Error('boom'));
    expect((await saveAllImages(images(2), { title: 'Recap' })).status).toBe('error');
  });

  it('第 2 張寫檔失敗 → error，不呼叫 Share，並清掉已寫的第 1 張', async () => {
    let calls = 0;
    m.write.mockImplementation(async () => {
      calls += 1;
      if (calls === 2) throw new Error('disk full');
      return { uri: 'file:///cache/ok.png' };
    });
    const result = await saveAllImages(images(3), { title: 'Recap' });
    expect(result.status).toBe('error');
    expect(m.share).not.toHaveBeenCalled();
    expect(m.del).toHaveBeenCalledTimes(1);
  });

  it('分享後盡力刪除每個檔案；刪除失敗不改變結果', async () => {
    m.share.mockResolvedValue({ activityType: 'com.apple.UIKit.activity.SaveToCameraRoll' });
    m.del.mockRejectedValue(new Error('gone'));
    const result = await saveAllImages(images(3), { title: 'Recap' });
    expect(result.status).toBe('saved');
    expect(m.del).toHaveBeenCalledTimes(3);
  });

  it('原生路徑不建立 <a download>', async () => {
    m.share.mockResolvedValue({});
    const spy = vi.spyOn(document, 'createElement');
    await saveAllImages(images(2), { title: 'Recap' });
    expect(spy.mock.calls.some(([tag]) => tag === 'a')).toBe(false);
    spy.mockRestore();
  });

  it('空陣列 → error，不呼叫任何外掛', async () => {
    const result = await saveAllImages([], { title: 'Recap' });
    expect(result).toEqual({ status: 'error', message: 'no_images' });
    expect(m.write).not.toHaveBeenCalled();
    expect(m.share).not.toHaveBeenCalled();
  });

  it('單張分享用 url（不是 files），只寫一個檔案', async () => {
    m.share.mockResolvedValue({ activityType: 'com.burbn.instagram.shareextension' });
    const result = await shareOneImage(images(1)[0], { title: 'Recap', text: 'hi' });
    expect(result.status).toBe('shared');
    const arg = m.share.mock.calls[0][0];
    expect(arg.url).toBe('file:///cache/1.png');
    expect(arg.files).toBeUndefined();
    expect(arg.text).toBe('hi');
    expect(m.write).toHaveBeenCalledTimes(1);
  });

  it('單張分享被取消 → cancelled', async () => {
    m.share.mockRejectedValue(new Error('Share canceled'));
    expect((await shareOneImage(images(1)[0], { title: 'Recap' })).status).toBe('cancelled');
  });
});

describe('shareImages — 網頁', () => {
  let clicks: number;

  beforeEach(() => {
    Object.values(m).forEach((f) => f.mockReset());
    m.isNative.mockReturnValue(false);
    clicks = 0;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      clicks += 1;
    });
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  });

  it('不支援檔案分享 → 依序下載每張，回 downloaded（瀏覽器是否真的存了無法驗證，所以不是 saved）', async () => {
    Object.defineProperty(navigator, 'canShare', { value: () => false, configurable: true });
    const result = await saveAllImages(images(3), { title: 'Recap' });
    expect(result.status).toBe('downloaded');
    expect(clicks).toBe(3);
    expect(m.share).not.toHaveBeenCalled();
  });

  it('支援檔案分享 → navigator.share 帶 files，回 shared', async () => {
    const share = vi.fn(async (_data: ShareData) => {});
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    const result = await saveAllImages(images(2), { title: 'Recap' });
    expect(result.status).toBe('shared');
    expect(share.mock.calls[0][0].files).toHaveLength(2);
    expect(clicks).toBe(0);
  });

  it('navigator.share 被取消（AbortError）→ cancelled', async () => {
    const abort = Object.assign(new Error('x'), { name: 'AbortError' });
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
    Object.defineProperty(navigator, 'share', { value: vi.fn(async () => { throw abort; }), configurable: true });
    expect((await saveAllImages(images(2), { title: 'Recap' })).status).toBe('cancelled');
  });
});
