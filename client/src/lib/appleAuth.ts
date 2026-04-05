import { Capacitor } from '@capacitor/core';
import { SignInWithApple, SignInWithAppleOptions } from '@capacitor-community/apple-sign-in';
import { supabase } from './supabase';

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/** 用戶主動取消 Apple 授權時，plugin 拋出 code 1001 */
export function isAppleCancelError(err: any): boolean {
  return err?.code === '1001' || err?.message?.includes('canceled') || err?.message?.includes('cancelled');
}

export async function nativeAppleSignIn(): Promise<{ error: Error | null; cancelled: boolean }> {
  try {
    // rawNonce 傳給 Supabase；sha256(rawNonce) 傳給 Apple（Apple 規格要求）
    const rawNonce = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const hashedNonceBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawNonce));
    const hashedNonce = Array.from(new Uint8Array(hashedNonceBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const options: SignInWithAppleOptions = {
      clientId: 'com.storio.app',
      redirectURI: '', // native 模式不需要，傳空字串
      scopes: 'email name',
      state: '',
      nonce: hashedNonce,
    };

    const result = await SignInWithApple.authorize(options);
    const { identityToken, givenName, familyName } = result.response;

    if (!identityToken) {
      throw new Error('No identity token returned from Apple');
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: identityToken,
      nonce: rawNonce, // Supabase 內部自行 sha256 後與 token 比對
    });

    if (error) return { error: new Error(error.message), cancelled: false };

    // Apple 只在首次授權提供 givenName / familyName，有值就寫入 metadata 供 profile 步驟 pre-fill
    if (givenName || familyName) {
      const fullName = [givenName, familyName].filter(Boolean).join(' ');
      await supabase.auth.updateUser({ data: { full_name: fullName } });
    }

    return { error: null, cancelled: false };
  } catch (err: any) {
    if (isAppleCancelError(err)) {
      return { error: null, cancelled: true };
    }
    return { error: err, cancelled: false };
  }
}
