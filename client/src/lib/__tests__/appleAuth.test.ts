import { describe, it, expect, vi, beforeEach } from 'vitest';

const getPlatformMock = vi.fn();

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => true,
    getPlatform: (...args: unknown[]) => getPlatformMock(...args),
  },
}));

vi.mock('@capacitor-community/apple-sign-in', () => ({
  SignInWithApple: { authorize: vi.fn() },
}));

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { signInWithIdToken: vi.fn(), updateUser: vi.fn() } },
}));

import { isIOSPlatform } from '@/lib/appleAuth';

describe('isIOSPlatform', () => {
  beforeEach(() => getPlatformMock.mockReset());

  it('平台是 ios 時回傳 true', () => {
    getPlatformMock.mockReturnValue('ios');
    expect(isIOSPlatform()).toBe(true);
  });

  it('平台是 android 時回傳 false', () => {
    getPlatformMock.mockReturnValue('android');
    expect(isIOSPlatform()).toBe(false);
  });

  it('平台是 web 時回傳 false', () => {
    getPlatformMock.mockReturnValue('web');
    expect(isIOSPlatform()).toBe(false);
  });
});
