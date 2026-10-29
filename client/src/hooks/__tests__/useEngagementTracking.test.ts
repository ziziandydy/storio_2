// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { track, detectBot } = vi.hoisted(() => ({ track: vi.fn(), detectBot: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { auth: {} } }));
vi.mock('@/lib/analytics', () => ({ track }));
vi.mock('@/lib/botDetection', () => ({ detectBot }));
vi.mock('@capacitor/app', () => ({ App: { addListener: vi.fn() } }));
vi.mock('@/lib/appleAuth', () => ({ isNativePlatform: () => false }));

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
