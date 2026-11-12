import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { blobToBase64 } from '@/lib/share-api';

/**
 * Recap 圖片的儲存與分享編排。
 * 原則：只有系統分享面板實際回報「儲存到相簿」才回 `saved`；取消不算成功；任何失敗都回 `error`，不顯示假成功。
 * 依 spike 0.2：多張一次傳給 Instagram 只會收到第 1 張，所以主動作是「儲存全部」，另有「分享這一張」。
 * 原生 App 不得使用 `<a download>`（WKWebView 無效）。
 */
// downloaded：網頁以 <a download> 觸發下載。瀏覽器是否真的存檔無法驗證（桌面瀏覽器常攔截連續多檔下載），所以不算 saved。
export type ShareOutcomeStatus = 'saved' | 'shared' | 'downloaded' | 'cancelled' | 'error';
export interface ShareOutcome {
  status: ShareOutcomeStatus;
  message?: string;
}
export interface ShareImage {
  name: string;
  blob: Blob;
}

const DOWNLOAD_GAP_MS = 150;

const isCancel = (e: unknown) => /cancel/i.test(e instanceof Error ? e.message : String(e));
const errorOutcome = (e: unknown): ShareOutcome => ({
  status: 'error',
  message: e instanceof Error ? e.message : String(e),
});

async function writeToCache(image: ShareImage): Promise<{ uri: string; path: string }> {
  const data = await blobToBase64(image.blob);
  const path = `storio-recap-${image.name}_${Date.now()}.png`;
  const { uri } = await Filesystem.writeFile({ path, data, directory: Directory.Cache });
  return { uri, path };
}

/** 盡力刪除快取檔：失敗只忽略，不影響分享結果。 */
async function cleanup(paths: string[]): Promise<void> {
  for (const path of paths) {
    try {
      await Filesystem.deleteFile({ path, directory: Directory.Cache });
    } catch {
      // 忽略
    }
  }
}

function classifyNativeShare(result: { activityType?: string } | undefined): ShareOutcome {
  return String(result?.activityType ?? '').includes('SaveToCameraRoll') ? { status: 'saved' } : { status: 'shared' };
}

async function download(images: ShareImage[]): Promise<void> {
  for (let i = 0; i < images.length; i++) {
    const url = URL.createObjectURL(images[i].blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `storio-recap-${images[i].name}.png`;
    a.click();
    URL.revokeObjectURL(url);
    if (i < images.length - 1) await new Promise((r) => setTimeout(r, DOWNLOAD_GAP_MS));
  }
}

async function webShareOrDownload(images: ShareImage[], title: string, text?: string): Promise<ShareOutcome> {
  const files = images.map((img) => new File([img.blob], `storio-recap-${img.name}.png`, { type: 'image/png' }));
  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files }) && navigator.share) {
    try {
      await navigator.share({ title, text, files });
      return { status: 'shared' };
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return { status: 'cancelled' };
      return errorOutcome(e);
    }
  }
  try {
    await download(images);
    return { status: 'downloaded' };
  } catch (e) {
    return errorOutcome(e);
  }
}

/** 「儲存全部」：原生一次把全部圖片交給系統分享面板（選「儲存影像」存入相簿）；網頁分享或逐張下載。 */
export async function saveAllImages(images: ShareImage[], opts: { title: string }): Promise<ShareOutcome> {
  if (images.length === 0) return { status: 'error', message: 'no_images' };
  if (!Capacitor.isNativePlatform()) return webShareOrDownload(images, opts.title);

  const written: { uri: string; path: string }[] = [];
  try {
    for (const image of images) written.push(await writeToCache(image));
  } catch (e) {
    await cleanup(written.map((w) => w.path));
    return errorOutcome(e);
  }

  try {
    const result = await Share.share({ title: opts.title, files: written.map((w) => w.uri) });
    return classifyNativeShare(result);
  } catch (e) {
    return isCancel(e) ? { status: 'cancelled' } : errorOutcome(e);
  } finally {
    await cleanup(written.map((w) => w.path));
  }
}

/** 「分享這一張」：單張走系統分享面板，可直接到 Instagram Story 等。 */
export async function shareOneImage(image: ShareImage, opts: { title: string; text?: string }): Promise<ShareOutcome> {
  if (!Capacitor.isNativePlatform()) return webShareOrDownload([image], opts.title, opts.text);

  let written: { uri: string; path: string };
  try {
    written = await writeToCache(image);
  } catch (e) {
    return errorOutcome(e);
  }
  try {
    const result = await Share.share({ title: opts.title, text: opts.text, url: written.uri });
    return classifyNativeShare(result);
  } catch (e) {
    return isCancel(e) ? { status: 'cancelled' } : errorOutcome(e);
  } finally {
    await cleanup([written.path]);
  }
}
