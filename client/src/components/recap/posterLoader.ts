import { DEFAULT_POSTER, DEFAULT_POSTER_SIZE, isRemotePoster, posterCandidates, type PosterSize } from './posterSrc';

/** 同時載入的張數上限：Recap 十幾頁的背景海報大量重複，去重後十來張，4 張並行就夠快又不會塞爆手機連線 */
export const MAX_CONCURRENT = 4;
/** 單一候選來源的等待上限，超過就取消並換下一個來源 */
export const LOAD_TIMEOUT_MS = 8000;

type Priority = 'high' | 'low';

interface Job {
  key: string;
  path: string;
  size: PosterSize;
  resolve: (src: string) => void;
}

/** 海報路徑（＋尺寸）→ 已驗證可用的 src。同一張海報全 App 只會真的載入一次。 */
const cache = new Map<string, Promise<string>>();
const queue: Job[] = [];
let inflight = 0;
const settledWaiters: Array<() => void> = [];

/** 用 new Image() 實際載入一個來源，成功（有寬度、能解碼）才算數。逾時就取消。 */
function probe(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
      if (!ok) img.src = ''; // 取消還在進行的下載
      resolve(ok);
    };
    const timer = setTimeout(() => finish(false), LOAD_TIMEOUT_MS);
    img.onload = () => {
      const ok = img.naturalWidth > 0;
      const decoding = typeof img.decode === 'function' ? img.decode() : null;
      if (decoding && typeof decoding.then === 'function') {
        decoding.then(() => finish(ok), () => finish(ok)); // 解碼失敗不算載入失敗，交給 <img> 自己處理
      } else {
        finish(ok);
      }
    };
    img.onerror = () => finish(false);
    img.src = src;
  });
}

async function run(job: Job): Promise<void> {
  for (const src of posterCandidates(job.path, job.size)) {
    if (src === DEFAULT_POSTER) break; // 最終備援是本機檔，不用驗證
    if (await probe(src)) {
      job.resolve(src);
      return;
    }
  }
  // 全部失敗：給預設海報，但不記住失敗，下次（例如重新進入 Recap）再試
  cache.delete(job.key);
  job.resolve(DEFAULT_POSTER);
}

function pump(): void {
  while (inflight < MAX_CONCURRENT && queue.length > 0) {
    const job = queue.shift() as Job;
    inflight++;
    run(job).finally(() => {
      inflight--;
      pump();
      if (inflight === 0 && queue.length === 0) {
        settledWaiters.splice(0).forEach((w) => w());
      }
    });
  }
}

/**
 * 取得一張海報可用的顯示來源：直連 CDN → 後端代理 → 預設海報，第一個真的載入成功的就回傳。
 * 回傳的 src 已在瀏覽器快取裡，交給 <img> 不會再發請求，也不會破圖。
 */
export function loadPoster(
  path: string | null | undefined,
  { size = DEFAULT_POSTER_SIZE, priority = 'low' }: { size?: PosterSize; priority?: Priority } = {},
): Promise<string> {
  if (!isRemotePoster(path)) return Promise.resolve(path || DEFAULT_POSTER);
  const key = `${size}|${path}`;
  const existing = cache.get(key);
  if (existing) {
    if (priority === 'high') {
      const i = queue.findIndex((j) => j.key === key);
      if (i > 0) queue.unshift(...queue.splice(i, 1)); // 目前頁的海報插隊
    }
    return existing;
  }
  let resolve!: (src: string) => void;
  const promise = new Promise<string>((r) => {
    resolve = r;
  });
  cache.set(key, promise);
  const job: Job = { key, path, size, resolve };
  if (priority === 'high') queue.unshift(job);
  else queue.push(job);
  pump();
  return promise;
}

/** 所有排隊與進行中的海報載入都結束時 resolve（分享圖渲染頁等這個再宣告 ready） */
export function whenPostersSettled(): Promise<void> {
  if (inflight === 0 && queue.length === 0) return Promise.resolve();
  return new Promise((r) => settledWaiters.push(r));
}

/** 測試用：清空快取與佇列 */
export function __resetPosterLoader(): void {
  cache.clear();
  queue.length = 0;
  inflight = 0;
  settledWaiters.length = 0;
}
