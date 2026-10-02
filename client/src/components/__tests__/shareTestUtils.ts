// ShareModal / MonthlyRecapModal 測試共用的環境替身與工具
import { vi } from 'vitest';
import { act } from '@testing-library/react';

/** 推進 fake timers 並讓 pending promise 全部落地 */
export const flush = (ms = 0) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

/** 取代 jsdom 沒有的 URL.createObjectURL / revokeObjectURL，並記錄被 revoke 的 URL */
export function stubObjectUrls() {
  const revoked: string[] = [];
  let seq = 0;
  Object.assign(URL, {
    createObjectURL: vi.fn(() => `blob:mock-${++seq}`),
    revokeObjectURL: vi.fn((u: string) => { revoked.push(u); }),
  });
  return revoked;
}

type NavShare = { share?: unknown; canShare?: unknown };

/** 設定 navigator.share / canShare（undefined = 不支援 Web Share） */
export function setWebShare({ share, canShare }: { share?: (d: unknown) => Promise<void>; canShare?: (d: unknown) => boolean }) {
  const nav = navigator as unknown as NavShare;
  Object.defineProperty(nav, 'share', { value: share, configurable: true, writable: true });
  Object.defineProperty(nav, 'canShare', { value: canShare, configurable: true, writable: true });
}

/** 攔截 <a download>.click()，回傳被觸發的下載檔名清單 */
export function spyAnchorDownloads() {
  const downloads: { download: string; href: string }[] = [];
  const spy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push({ download: this.download, href: this.href });
  });
  return { downloads, spy };
}
