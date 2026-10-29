// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const { getSession, signInAnonymously, onAuthStateChange, detectBot } = vi.hoisted(() => ({
  getSession: vi.fn(),
  signInAnonymously: vi.fn(),
  onAuthStateChange: vi.fn(),
  detectBot: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession, signInAnonymously, onAuthStateChange } },
}));
vi.mock('@/lib/botDetection', () => ({ detectBot }));

import { useAuth } from '../useAuth';
import { useUserStore } from '@/store/userStore';

describe('useAuth 匿名登入', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUserStore.setState({ user: null, token: null, loading: true, anonSignInFailed: false });
    getSession.mockResolvedValue({ data: { session: null } });
    onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    signInAnonymously.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    detectBot.mockReturnValue({ isBot: false, reason: null });
  });

  it('bot: no anonymous sign-in and loading ends', async () => {
    detectBot.mockReturnValue({ isBot: true, reason: 'user_agent' });
    renderHook(() => useAuth());
    await waitFor(() => expect(useUserStore.getState().loading).toBe(false));
    await waitFor(() => expect(detectBot).toHaveBeenCalled());
    expect(signInAnonymously).not.toHaveBeenCalled();
    expect(useUserStore.getState().user).toBeNull();
  });

  it('real visitor: anonymous sign-in as before', async () => {
    renderHook(() => useAuth());
    await waitFor(() => expect(signInAnonymously).toHaveBeenCalledTimes(1));
  });

  it('sign-in error sets anonSignInFailed', async () => {
    signInAnonymously.mockResolvedValue({ data: {}, error: new Error('x') });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderHook(() => useAuth());
    await waitFor(() => expect(useUserStore.getState().anonSignInFailed).toBe(true));
    expect(useUserStore.getState().loading).toBe(false);
  });
});
