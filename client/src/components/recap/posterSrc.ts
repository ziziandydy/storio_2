export const DEFAULT_POSTER = '/image/defaultMoviePoster.svg';

/** TMDB 尺寸：背景有壓暗、前景海報最大 96×144（@2x 192×288），w342 已足夠，不必抓 w500 原圖 */
export type PosterSize = 'w185' | 'w342' | 'w500';
export const DEFAULT_POSTER_SIZE: PosterSize = 'w342';

/** 只有 http(s) 才算遠端海報：需要非同步載入、驗證成功才交給 <img>，並有備援來源 */
export function isRemotePoster(path: string | null | undefined): path is string {
  return !!path && /^https?:\/\//i.test(path);
}

function proxyUrl(url: string): string {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8010';
  // 唯一參數：iOS WebKit 會把先前（可能缺 CORS 標頭或失敗）的代理回應快取下來重用，
  // 固定字串的網址會一直撞到同一份壞回應；每次產生新網址就一定重新下載。
  const nonce = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  return `${backendUrl}/api/v1/proxy/image?url=${encodeURIComponent(url)}&n=${nonce}`;
}

/** 直連 CDN 用的網址：TMDB 換尺寸、一律 https（Google Books 封面常存成 http，在 https／capacitor 來源會被擋） */
function directUrl(path: string, size: PosterSize): string {
  let url = path.replace(/^http:\/\//i, 'https://');
  if (url.includes('image.tmdb.org/t/p/')) {
    url = url.replace(/\/t\/p\/[^/]+\//, `/t/p/${size}/`);
  }
  return url;
}

/**
 * 顯示用的候選來源，依序嘗試：
 * 1. 直連 CDN（App 其他頁面顯示海報也是直連；純顯示的 <img> 不需要 CORS，所以不設 crossOrigin）
 * 2. 後端圖片代理（CDN 被擋或失敗時的備援；網址帶唯一參數避開被污染的快取）
 * 3. 本機預設海報（最終備援，永遠不會破圖）
 * 本機路徑、data:、blob: 不需要備援，原樣回傳。
 */
export function posterCandidates(path: string | null | undefined, size: PosterSize = DEFAULT_POSTER_SIZE): string[] {
  if (!path) return [DEFAULT_POSTER];
  if (!isRemotePoster(path)) return [path];
  const direct = directUrl(path, size);
  return [direct, proxyUrl(direct), DEFAULT_POSTER];
}
