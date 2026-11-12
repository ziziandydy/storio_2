import { describe, it, expect, vi, afterEach } from 'vitest';
import { DEFAULT_POSTER, isRemotePoster, posterCandidates } from '../posterSrc';

const TMDB = 'https://image.tmdb.org/t/p/w500/a.jpg';
const GBOOKS = 'http://books.google.com/books/content?id=XYZ&printsec=frontcover&img=1&zoom=1&source=gbs_api';

describe('posterCandidates：顯示用候選來源（直連 CDN → 後端代理 → 預設海報）', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('空值只有預設海報', () => {
    expect(posterCandidates(null)).toEqual([DEFAULT_POSTER]);
    expect(posterCandidates(undefined)).toEqual([DEFAULT_POSTER]);
    expect(posterCandidates('')).toEqual([DEFAULT_POSTER]);
  });

  it('data:、blob:、本機路徑原樣回傳，不經代理', () => {
    expect(posterCandidates('data:image/png;base64,AAA')).toEqual(['data:image/png;base64,AAA']);
    expect(posterCandidates('blob:http://x/1')).toEqual(['blob:http://x/1']);
    expect(posterCandidates('/image/logo/logo.png')).toEqual(['/image/logo/logo.png']);
    expect(posterCandidates('/a.jpg')).toEqual(['/a.jpg']);
  });

  it('TMDB：先直連 CDN 並換成背景用的小尺寸，再退到代理（代理網址帶唯一參數），最後預設海報', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.com');
    const [direct, proxied, fallback, ...rest] = posterCandidates(TMDB);
    expect(direct).toBe('https://image.tmdb.org/t/p/w342/a.jpg');
    expect(proxied.startsWith('https://api.example.com/api/v1/proxy/image?url=' + encodeURIComponent('https://image.tmdb.org/t/p/w342/a.jpg'))).toBe(true);
    expect(proxied).toMatch(/[?&]n=[a-z0-9]+/);
    expect(fallback).toBe(DEFAULT_POSTER);
    expect(rest).toEqual([]);
  });

  it('代理網址每次產生都不同（不會撞到被污染的瀏覽器快取）', () => {
    const a = posterCandidates(TMDB)[1];
    const b = posterCandidates(TMDB)[1];
    expect(a).not.toBe(b);
  });

  it('可指定 TMDB 尺寸', () => {
    expect(posterCandidates(TMDB, 'w185')[0]).toBe('https://image.tmdb.org/t/p/w185/a.jpg');
  });

  it('Google Books：http 升級成 https 直連，再退到代理', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.com');
    const [direct, proxied] = posterCandidates(GBOOKS);
    expect(direct).toBe(GBOOKS.replace('http://', 'https://'));
    expect(proxied.startsWith('https://api.example.com/api/v1/proxy/image?url=')).toBe(true);
    expect(decodeURIComponent(proxied)).toContain('https://books.google.com/books/content?id=XYZ');
  });

  it('沒有設定 NEXT_PUBLIC_API_URL 時代理退回本機後端', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');
    expect(posterCandidates('https://x/a.jpg')[1].startsWith('http://localhost:8010/api/v1/proxy/image?url=')).toBe(true);
  });

  it('候選裡沒有任何一個帶 crossOrigin 的需求：純顯示不需要 CORS', () => {
    // 介面只回傳字串陣列，呼叫端不會再設定 crossOrigin
    expect(posterCandidates(TMDB).every((s) => typeof s === 'string')).toBe(true);
  });
});

describe('isRemotePoster', () => {
  it('只有 http(s) 才算遠端（需要非同步載入與備援）', () => {
    expect(isRemotePoster(TMDB)).toBe(true);
    expect(isRemotePoster(GBOOKS)).toBe(true);
    expect(isRemotePoster('/image/p.png')).toBe(false);
    expect(isRemotePoster('data:image/png;base64,AAA')).toBe(false);
    expect(isRemotePoster(null)).toBe(false);
    expect(isRemotePoster('')).toBe(false);
  });
});
