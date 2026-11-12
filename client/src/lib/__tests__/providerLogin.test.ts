import { describe, it, expect, vi, beforeEach } from 'vitest';

const m = vi.hoisted(() => ({
  isNative: vi.fn(),
  isIOS: vi.fn(),
  apple: vi.fn(),
  google: vi.fn(),
  oauth: vi.fn(),
}));
vi.mock('@/lib/appleAuth', () => ({
  isNativePlatform: m.isNative,
  isIOSPlatform: m.isIOS,
  nativeAppleSignIn: m.apple,
}));
vi.mock('@/lib/googleAuth', () => ({ nativeGoogleSignIn: m.google }));
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { signInWithOAuth: m.oauth } },
  getURL: (p: string) => `https://app.test${p}`,
}));

import { loginWithProvider } from '../providerLogin';

describe('loginWithProvider', () => {
  beforeEach(() => {
    Object.values(m).forEach((f) => f.mockReset());
    m.isNative.mockReturnValue(false);
    m.isIOS.mockReturnValue(false);
    m.oauth.mockResolvedValue({ error: null });
  });

  it('iOS 原生＋apple → 原生 Apple 登入，成功回 {}', async () => {
    m.isIOS.mockReturnValue(true);
    m.isNative.mockReturnValue(true);
    m.apple.mockResolvedValue({ error: null, cancelled: false });
    expect(await loginWithProvider('apple')).toEqual({});
    expect(m.apple).toHaveBeenCalled();
    expect(m.oauth).not.toHaveBeenCalled();
  });

  it('原生＋google → 原生 Google 登入', async () => {
    m.isNative.mockReturnValue(true);
    m.google.mockResolvedValue({ error: null, cancelled: false });
    expect(await loginWithProvider('google')).toEqual({});
    expect(m.google).toHaveBeenCalled();
  });

  it('網頁 → signInWithOAuth 帶 redirectTo，回 {redirected: true}', async () => {
    expect(await loginWithProvider('google')).toEqual({ redirected: true });
    expect(m.oauth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'https://app.test/auth/callback' },
    });
  });

  it('網頁＋apple（非 iOS 原生）也走 OAuth', async () => {
    await loginWithProvider('apple');
    expect(m.oauth).toHaveBeenCalledWith(expect.objectContaining({ provider: 'apple' }));
  });

  it('取消 → {cancelled: true}', async () => {
    m.isNative.mockReturnValue(true);
    m.google.mockResolvedValue({ error: null, cancelled: true });
    expect(await loginWithProvider('google')).toEqual({ cancelled: true });
  });

  it('原生登入失敗 → {error}', async () => {
    const err = new Error('boom');
    m.isNative.mockReturnValue(true);
    m.google.mockResolvedValue({ error: err, cancelled: false });
    expect(await loginWithProvider('google')).toEqual({ error: err });
  });

  it('OAuth 失敗與例外 → {error}', async () => {
    const err = new Error('oauth');
    m.oauth.mockResolvedValue({ error: err });
    expect((await loginWithProvider('google')).error).toBe(err);

    m.oauth.mockRejectedValue(new Error('network'));
    expect((await loginWithProvider('google')).error?.message).toBe('network');
  });
});
