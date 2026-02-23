import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// During build time, Vercel might not have access to these env vars.
// We provide a fallback only to satisfy the SDK's initialization check.
// The actual values must be provided in the Vercel dashboard.
const safeUrl = supabaseUrl && supabaseUrl.startsWith('http') ? supabaseUrl : 'https://tmp.supabase.co';
const safeKey = supabaseAnonKey || 'tmp-key';

export const supabase = createClient(safeUrl, safeKey);

export const getURL = (path: string = '') => {
  let url =
    process.env.NEXT_PUBLIC_APP_URL ?? // 優先使用專屬應用程式網址
    process.env.NEXT_PUBLIC_SITE_URL ?? // 其次使用正式網址
    process.env.NEXT_PUBLIC_VERCEL_URL ?? // Vercel 自動生成的預覽網址
    (typeof window !== 'undefined' ? window.location.origin : ''); // 客戶端動態抓取備援
  
  // 如果完全沒有抓到網址，回退到 localhost
  if (!url) {
    url = 'http://localhost:3010';
  }
  
  // 確保包含協定 (針對 VERCEL_URL 有時不含協定的情況)
  url = url.startsWith('http') ? url : `https://${url}`;
  // 確保結尾沒有斜線
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