import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// During build time, Vercel might not have access to these env vars.
// We provide a fallback only to satisfy the SDK's initialization check.
// The actual values must be provided in the Vercel dashboard.
const safeUrl = supabaseUrl && supabaseUrl.startsWith('http') ? supabaseUrl : 'https://tmp.supabase.co';
const safeKey = supabaseAnonKey || 'tmp-key';

export const supabase = createClient(safeUrl, safeKey);

/**
 * 產生絕對 URL，用於 OAuth 重導向。
 * 在瀏覽器端優先使用 window.location.origin，
 * 伺服器端則依序嘗試環境變數。
 */
export const getURL = (path: string = '') => {
  let url = '';

  if (typeof window !== 'undefined' && window.location.origin) {
    // 瀏覽器端優先使用當前網域
    url = window.location.origin;
  } else {
    // 伺服器端或 SSR 期間使用環境變數
    url =
      process.env.NEXT_PUBLIC_SITE_URL ??
      process.env.NEXT_PUBLIC_VERCEL_URL ??
      'http://localhost:3010';
  }
  
  // 確保包含協定
  url = url.startsWith('http') ? url : `https://${url}`;
  // 確保結尾沒有斜線，方便後面拼接
  url = url.endsWith('/') ? url.slice(0, -1) : url;
  
  // 確保路徑以斜線開頭
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${url}${cleanPath}`;
};

if (!supabaseUrl || !supabaseAnonKey) {
  if (typeof window !== 'undefined') {
    console.error("Supabase credentials missing! Check your environment variables.");
  }
}