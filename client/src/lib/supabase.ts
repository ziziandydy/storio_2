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
 * 產生絕對 URL，優先使用環境變數中的 SITE_URL，
 * 其次是 Vercel 的預覽 URL，最後回退到 window.location.origin。
 */
export const getURL = (path: string = '') => {
  let url =
    process.env.NEXT_PUBLIC_SITE_URL ?? // 正式環境網址
    process.env.NEXT_PUBLIC_VERCEL_URL ?? // Vercel 自動生成的網址
    'http://localhost:3010/';
  
  // 確保包含協定
  url = url.startsWith('http') ? url : `https://${url}`;
  // 確保結尾有斜線
  url = url.endsWith('/') ? url : `${url}/`;
  
  // 移除路徑開頭的斜線
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  return `${url}${cleanPath}`;
};

if (!supabaseUrl || !supabaseAnonKey) {
  if (typeof window !== 'undefined') {
    console.error("Supabase credentials missing! Check your environment variables.");
  }
}