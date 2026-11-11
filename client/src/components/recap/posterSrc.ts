const DEFAULT_POSTER = '/image/defaultMoviePoster.svg';

/**
 * 海報圖片來源。外部海報（TMDB、Google Books）一律經後端代理，
 * 否則 Puppeteer 分享圖服務會因 CORS 抓不到圖（與 MonthlyRecapTemplate 的 getImageProps 相同做法）。
 * 環境變數在呼叫當下讀取，方便測試覆蓋。
 */
export function posterSrc(path: string | null | undefined): { src: string; crossOrigin?: 'anonymous' } {
  if (!path) return { src: DEFAULT_POSTER };
  if (path.startsWith('data:') || path.startsWith('blob:') || path.startsWith('/image/')) {
    return { src: path };
  }
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8010';
  return {
    src: `${backendUrl}/api/v1/proxy/image?url=${encodeURIComponent(path)}`,
    crossOrigin: 'anonymous',
  };
}
