// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const { getSession, signInAnonymously, signOut, onAuthStateChange, rpc, detectBot } = vi.hoisted(() => ({
  getSession: vi.fn(),
  signInAnonymously: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChange: vi.fn(),
  rpc: vi.fn(),
  detectBot: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession, signInAnonymously, signOut, onAuthStateChange }, rpc },
}));
vi.mock('@/lib/botDetection', () => ({ detectBot }));

import { useAuth, __resetAuthForTests } from '../useAuth';
import { useUserStore } from '@/store/userStore';

type Listener = (event: string, session: unknown) => Promise<void> | void;
let listener: Listener | null = null;

const anonSession = (id: string) => ({ user: { id, is_anonymous: true }, access_token: `tok-${id}` });
const realSession = (id: string) => ({ user: { id, is_anonymous: false }, access_token: `tok-${id}` });

describe('useAuth 匿名登入', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetAuthForTests();
    localStorage.clear();
    listener = null;
    useUserStore.setState({ user: null, token: null, loading: true, anonSignInFailed: false });
    getSession.mockResolvedValue({ data: { session: null } });
    onAuthStateChange.mockImplementation((cb: Listener) => {
      listener = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    signInAnonymously.mockResolvedValue({ data: { user: { id: 'u1', is_anonymous: true } }, error: null });
    signOut.mockResolvedValue({ error: null });
    rpc.mockResolvedValue({ error: null });
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

  it('concurrent mounts create one anonymous account', async () => {
    for (let i = 0; i < 5; i++) renderHook(() => useAuth());
    await waitFor(() => expect(useUserStore.getState().user?.id).toBe('u1'));
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it('auth listener registered once', async () => {
    const hooks = Array.from({ length: 5 }, () => renderHook(() => useAuth()));
    await waitFor(() => expect(signInAnonymously).toHaveBeenCalledTimes(1));
    expect(onAuthStateChange).toHaveBeenCalledTimes(1);
    hooks.forEach((h) => h.unmount());
    renderHook(() => useAuth());
    expect(onAuthStateChange).toHaveBeenCalledTimes(1);
  });

  it('guest id matches the signed-in anonymous user', async () => {
    signInAnonymously.mockResolvedValue({ data: { user: { id: 'anon-1', is_anonymous: true } }, error: null });
    renderHook(() => useAuth());
    await waitFor(() => expect(useUserStore.getState().user?.id).toBe('anon-1'));
    expect(localStorage.getItem('storio_guest_id')).toBe('anon-1');
  });

  const mountWithGuest = async () => {
    localStorage.setItem('storio_guest_id', 'anon-1');
    getSession.mockResolvedValue({ data: { session: anonSession('anon-1') } });
    renderHook(() => useAuth());
    await waitFor(() => expect(listener).not.toBeNull());
  };
  const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 10)); });

  it('migrates once on sign-in', async () => {
    await mountWithGuest();
    act(() => {
      listener!('SIGNED_IN', realSession('real-1'));
      listener!('USER_UPDATED', realSession('real-1'));
    });
    await waitFor(() => expect(useUserStore.getState().user?.id).toBe('real-1'));
    act(() => { listener!('USER_UPDATED', realSession('real-1')); });
    await flush();
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('migrate_guest_data', { old_user_id: 'anon-1', new_user_id: 'real-1' });
    expect(localStorage.getItem('storio_guest_id')).toBeNull();
  });

  it('INITIAL_SESSION migrates', async () => {
    await mountWithGuest();
    act(() => { listener!('INITIAL_SESSION', realSession('real-1')); });
    await waitFor(() => expect(useUserStore.getState().user?.id).toBe('real-1'));
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('migrate_guest_data', { old_user_id: 'anon-1', new_user_id: 'real-1' });
  });

  it('callback does not await supabase calls', async () => {
    await mountWithGuest();
    await flush();
    let resolveRpc: (v: { error: null }) => void = () => {};
    rpc.mockReturnValue(new Promise((r) => { resolveRpc = r; }));
    let ret: unknown;
    act(() => { ret = listener!('SIGNED_IN', realSession('real-1')); });
    // callback 同步返回，不回傳等待 rpc 的 promise；rpc 要等下一個 macrotask 才呼叫
    expect(ret).toBeUndefined();
    expect(rpc).not.toHaveBeenCalled();
    await flush();
    expect(rpc).toHaveBeenCalledTimes(1);
    // 搬移完成前不切換 user
    expect(useUserStore.getState().user?.id).not.toBe('real-1');
    await act(async () => { resolveRpc({ error: null }); });
    await waitFor(() => expect(useUserStore.getState().user?.id).toBe('real-1'));
  });

  it('migration failure keeps guest id', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    rpc.mockResolvedValue({ error: { code: '42501' } });
    await mountWithGuest();
    act(() => { listener!('SIGNED_IN', realSession('real-1')); });
    await waitFor(() => expect(useUserStore.getState().user?.id).toBe('real-1'));
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('storio_guest_id')).toBe('anon-1');
    expect(useUserStore.getState().token).toBe('tok-real-1');
    expect(useUserStore.getState().loading).toBe(false);
  });

  it('init rejection does not leave loading true', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    getSession.mockRejectedValue(new Error('net'));
    renderHook(() => useAuth());
    await waitFor(() => expect(useUserStore.getState().loading).toBe(false));
    await flush();
    expect(useUserStore.getState().loading).toBe(false);
  });

  it('bot: 5 mounts create no account', async () => {
    detectBot.mockReturnValue({ isBot: true, reason: 'user_agent' });
    for (let i = 0; i < 5; i++) renderHook(() => useAuth());
    await waitFor(() => expect(useUserStore.getState().loading).toBe(false));
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it('signOut clears guest id and creates one new guest', async () => {
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(useUserStore.getState().user?.id).toBe('u1'));
    signInAnonymously.mockResolvedValue({ data: { user: { id: 'anon-2', is_anonymous: true } }, error: null });
    await act(async () => {
      await result.current.signOut();
    });
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(signInAnonymously).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem('storio_guest_id')).toBe('anon-2');
    expect(useUserStore.getState().loading).toBe(false);
  });
});
