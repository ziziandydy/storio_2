import { createClient } from '@supabase/supabase-js';

// Default to placeholders to prevent build-time crashes if environment variables are missing
// Important: These must be properly set in Vercel/Production environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn("Supabase environment variables are missing! Authentication will not work correctly.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
