// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { detectBot, getSession } = vi.hoisted(() => ({ detectBot: vi.fn(), getSession: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { getSession } } }));
vi.mock('@/lib/botDetection', () => ({ detectBot }));

import { track } from '../analytics';
import { useUserStore } from '@/store/userStore';

const fetchMock = vi.fn();
const flush = () => vi.advanceTimersByTimeAsync(0);
const signIn = (token = 't1', id = 'u1') =>
  getSession.mockResolvedValue({ data: { session: { access_token: token, user: { id } } } });
const bodyOf = (i: number) => JSON.parse(fetchMock.mock.calls[i][1].body);

describe('track', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-29T03:00:00Z'));
    localStorage.clear();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    detectBot.mockReturnValue({ isBot: false, reason: null });
    getSession.mockReset();
    getSession.mockResolvedValue({ data: { session: null } });
    useUserStore.setState({ user: null, token: null, loading: false, anonSignInFailed: false });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('sends with bearer token for signed-in user', async () => {
    signIn();
    track('search');
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer t1');
    expect(bodyOf(0)).toEqual({ event: 'search' });
  });

  it('same subject same day skips', async () => {
    signIn();
    track('detail_view');
    await flush();
    track('detail_view');
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.setSystemTime(new Date('2026-10-30T03:00:00Z'));
    track('detail_view');
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('subject change sends again', async () => {
    detectBot.mockReturnValue({ isBot: true, reason: 'user_agent' });
    track('open');
    await flush();
    signIn();
    track('open');
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('no token non-open is dropped', async () => {
    track('search');
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('bot open carries visitor and reason', async () => {
    detectBot.mockReturnValue({ isBot: true, reason: 'user_agent' });
    track('open');
    await flush();
    const b = bodyOf(0);
    expect(b.visitor_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(b.is_suspected_bot).toBe(true);
    expect(b.bot_reason).toBe('user_agent');
    vi.setSystemTime(new Date('2026-10-30T03:00:00Z'));
    track('open');
    await flush();
    expect(bodyOf(1).visitor_id).toBe(b.visitor_id);
  });

  it('render_service sends nothing', async () => {
    detectBot.mockReturnValue({ isBot: true, reason: 'render_service' });
    signIn();
    track('open');
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('network failure is silent', async () => {
    fetchMock.mockRejectedValue(new Error('net'));
    signIn();
    expect(() => track('search')).not.toThrow();
    await flush();
  });

  it('storage throws: still sends without crashing', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('x'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('x'); });
    signIn();
    expect(() => track('search')).not.toThrow();
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('401 then same-day track sends again', async () => {
    signIn();
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401 });
    track('search');
    await flush();
    track('search');
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('network failure clears dedupe key', async () => {
    signIn();
    fetchMock.mockRejectedValueOnce(new Error('net'));
    track('search');
    await flush();
    track('search');
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('uses refreshed session token', async () => {
    useUserStore.setState({ user: { id: 'u1' } as never, token: 'stale' });
    signIn('fresh', 'u1');
    track('search');
    await flush();
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer fresh');
  });

  it('does not use keepalive', async () => {
    signIn();
    track('search');
    await flush();
    expect(fetchMock.mock.calls[0][1].keepalive).toBeUndefined();
  });

  it('getSession rejection is silent', async () => {
    getSession.mockRejectedValue(new Error('x'));
    expect(() => track('search')).not.toThrow();
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
