import { supabase, getURL } from '@/lib/supabase';
import { isNativePlatform, isIOSPlatform, nativeAppleSignIn } from '@/lib/appleAuth';
import { nativeGoogleSignIn } from '@/lib/googleAuth';

export interface ProviderLoginResult {
  /** 用戶取消原生登入視窗 */
  cancelled?: boolean;
  error?: Error;
  /** 走 OAuth 轉址（頁面會離開，之後由 /auth/callback 回來），呼叫端不需要再處理登入成功 */
  redirected?: boolean;
}

/**
 * 登入分派，與首頁 OnboardingModal／GuestSaveCard 原本的邏輯相同：
 * iOS 原生 Apple、原生 Google，其餘走 Supabase OAuth（redirect 至 /auth/callback）。
 * 登入成功後由 useAuth 的 onAuthStateChange 搬移訪客資料，這裡不另處理。
 */
export async function loginWithProvider(provider: 'apple' | 'google'): Promise<ProviderLoginResult> {
  try {
    if (provider === 'apple' && isIOSPlatform()) {
      const { error, cancelled } = await nativeAppleSignIn();
      if (cancelled) return { cancelled: true };
      if (error) return { error: error instanceof Error ? error : new Error(String(error)) };
      return {};
    }
    if (provider === 'google' && isNativePlatform()) {
      const { error, cancelled } = await nativeGoogleSignIn();
      if (cancelled) return { cancelled: true };
      if (error) return { error: error instanceof Error ? error : new Error(String(error)) };
      return {};
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: getURL('/auth/callback') },
    });
    if (error) return { error: error instanceof Error ? error : new Error(String(error)) };
    return { redirected: true };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}
