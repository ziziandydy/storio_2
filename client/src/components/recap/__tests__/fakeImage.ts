import { vi } from 'vitest';

export type FakeBehavior = 'ok' | 'fail' | 'hang';

/**
 * 測試用的 Image 替身：設定 src 時依 `behavior(src)` 決定成功／失敗／永遠不回應，
 * 事件用 microtask 非同步觸發（跟瀏覽器一樣不會同步 onload）。
 */
export class FakeImage {
  static created: FakeImage[] = [];
  static behavior: (src: string) => FakeBehavior = () => 'ok';
  static inflight = 0;
  static maxInflight = 0;

  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 0;
  private _src = '';

  get src() {
    return this._src;
  }

  set src(value: string) {
    this._src = value;
    if (!value) return; // 取消載入
    this.requested = value;
    FakeImage.created.push(this);
    const outcome = FakeImage.behavior(value);
    if (outcome === 'hang') return;
    FakeImage.inflight++;
    FakeImage.maxInflight = Math.max(FakeImage.maxInflight, FakeImage.inflight);
    queueMicrotask(() => {
      FakeImage.inflight--;
      if (outcome === 'ok') {
        this.naturalWidth = 100;
        this.onload?.();
      } else {
        this.onerror?.();
      }
    });
  }

  static install() {
    FakeImage.reset();
    vi.stubGlobal('Image', FakeImage);
  }

  static reset() {
    FakeImage.created = [];
    FakeImage.behavior = () => 'ok';
    FakeImage.inflight = 0;
    FakeImage.maxInflight = 0;
  }

  /** 依設定順序列出曾載入的網址（取消後 src 被清空也還留著） */
  static srcs() {
    return FakeImage.created.map((i) => i.requested);
  }

  requested = '';
}

/** 讓佇列裡的 microtask 與 promise 鏈都跑完 */
export async function flush(times = 5) {
  for (let i = 0; i < times; i++) {
    await new Promise<void>((r) => setTimeout(r, 0));
  }
}
