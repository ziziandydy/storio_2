// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { track, detectBot, addListener, isNative } = vi.hoisted(() => ({
  track: vi.fn(),
  detectBot: vi.fn(),
  addListener: vi.fn(),
  isNative: vi.fn(() => false),
}));
vi.mock('@/lib/supabase', () => ({ supabase: { auth: {} } }));
vi.mock('@/lib/analytics', () => ({ track }));
vi.mock('@/lib/botDetection', () => ({ detectBot }));
vi.mock('@capacitor/app', () => ({ App: { addListener } }));
vi.mock('@/lib/appleAuth', () => ({ isNativePlatform: isNative }));

import { useOpenTracking, useBrowseTracking } from '../useEngagementTracking';
import { useUserStore } from '@/store/userStore';

describe('useOpenTracking', () => {
  beforeEach(() => {
    track.mockReset();
    detectBot.mockReturnValue({ isBot: false, reason: null });
    useUserStore.setState({ user: null, token: null, loading: false, anonSignInFailed: false });
  });
  afterEach(() => vi.restoreAllMocks());

  it('does not send visitor open while anonymous sign-in is pending', () => {
    renderHook(() => useOpenTracking());
    expect(track).not.toHaveBeenCalled();
    act(() => useUserStore.setState({ token: 't' }));
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('open');
  });

  it('bot sends open after auth resolves', () => {
    detectBot.mockReturnValue({ isBot: true, reason: 'user_agent' });
    renderHook(() => useOpenTracking());
    expect(track).toHaveBeenCalledWith('open');
  });

  it('sign-in failed real visitor sends open', () => {
    useUserStore.setState({ anonSignInFailed: true });
    renderHook(() => useOpenTracking());
    expect(track).toHaveBeenCalledWith('open');
  });
});

describe('useOpenTracking native resume', () => {
  beforeEach(() => {
    track.mockReset();
    detectBot.mockReturnValue({ isBot: false, reason: null });
    isNative.mockReturnValue(true);
  });
  afterEach(() => {
    isNative.mockReturnValue(false);
    addListener.mockReset();
  });

  it('native resume sends open only when auth ready', () => {
    let cb: (s: { isActive: boolean }) => void = () => {};
    addListener.mockImplementation((_: string, fn: typeof cb) => {
      cb = fn;
      return Promise.resolve({ remove: vi.fn() });
    });
    useUserStore.setState({ user: null, token: null, loading: true, anonSignInFailed: false });
    renderHook(() => useOpenTracking());
    cb({ isActive: true });
    expect(track).not.toHaveBeenCalled();
    act(() => useUserStore.setState({ loading: false, token: 't' }));
    track.mockClear();
    cb({ isActive: true });
    expect(track).toHaveBeenCalledWith('open');
  });

  it('remove rejection is swallowed', async () => {
    addListener.mockReturnValue(Promise.reject(new Error('x')));
    useUserStore.setState({ loading: false });
    const { unmount } = renderHook(() => useOpenTracking());
    unmount();
    await Promise.resolve();
  });
});

describe('useBrowseTracking', () => {
  beforeEach(() => track.mockReset());
  afterEach(() => vi.restoreAllMocks());

  it('browse only after real interaction', () => {
    renderHook(() => useBrowseTracking());
    expect(track).not.toHaveBeenCalled();
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('browse');
  });
});
