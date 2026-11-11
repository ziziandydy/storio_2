import { describe, it, expect, vi, afterEach } from 'vitest';
import { posterSrc } from '../posterSrc';

describe('posterSrc', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('空值 → 預設海報', () => {
    expect(posterSrc(null)).toEqual({ src: '/image/defaultMoviePoster.svg' });
    expect(posterSrc(undefined)).toEqual({ src: '/image/defaultMoviePoster.svg' });
    expect(posterSrc('')).toEqual({ src: '/image/defaultMoviePoster.svg' });
  });

  it('data:、blob:、/image/ 開頭原樣回傳', () => {
    expect(posterSrc('data:image/png;base64,AAA')).toEqual({ src: 'data:image/png;base64,AAA' });
    expect(posterSrc('blob:http://x/1')).toEqual({ src: 'blob:http://x/1' });
    expect(posterSrc('/image/logo/logo.png')).toEqual({ src: '/image/logo/logo.png' });
  });

  it('外部海報走後端代理並帶 crossOrigin', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.com');
    const result = posterSrc('https://image.tmdb.org/t/p/w500/a.jpg');
    expect(result).toEqual({
      src: 'https://api.example.com/api/v1/proxy/image?url=' + encodeURIComponent('https://image.tmdb.org/t/p/w500/a.jpg'),
      crossOrigin: 'anonymous',
    });
  });

  it('沒有設定 NEXT_PUBLIC_API_URL 時退回本機後端', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');
    expect(posterSrc('https://x/a.jpg').src.startsWith('http://localhost:8010/api/v1/proxy/image?url=')).toBe(true);
  });
});
