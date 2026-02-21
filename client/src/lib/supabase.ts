import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// During build time, Vercel might not have access to these env vars.
// We provide a fallback only to satisfy the SDK's initialization check.
// The actual values must be provided in the Vercel dashboard.
const safeUrl = supabaseUrl && supabaseUrl.startsWith('http') ? supabaseUrl : 'https://tmp.supabase.co';
const safeKey = supabaseAnonKey || 'tmp-key';

export const supabase = createClient(safeUrl, safeKey);

if (!supabaseUrl || !supabaseAnonKey) {
  if (typeof window !== 'undefined') {
    console.error("Supabase credentials missing! Check your environment variables.");
  }
}