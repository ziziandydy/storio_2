import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { supabase } from './supabase';

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/** Google Sign-In 取消時的錯誤判斷（code 12501 或 cancel/dismiss 訊息） */
export function isGoogleCancelError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as Record<string, unknown>;
  return (
    e.code === '12501' ||
    (typeof e.message === 'string' &&
      (e.message.toLowerCase().includes('cancel') ||
        e.message.toLowerCase().includes('dismissed')))
  );
}

export async function nativeGoogleSignIn(): Promise<{ error: Error | null; cancelled: boolean }> {
  try {
    await GoogleAuth.initialize();
    const googleUser = await GoogleAuth.signIn();
    const idToken = googleUser?.authentication?.idToken;

    if (!idToken) {
      throw new Error('No idToken returned from Google Sign-In');
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) return { error: new Error(error.message), cancelled: false };
    return { error: null, cancelled: false };
  } catch (err: unknown) {
    if (isGoogleCancelError(err)) {
      return { error: null, cancelled: true };
    }
    const error = err instanceof Error ? err : new Error(String(err));
    return { error, cancelled: false };
  }
}
