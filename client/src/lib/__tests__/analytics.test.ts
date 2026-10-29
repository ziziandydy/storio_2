// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { detectBot } = vi.hoisted(() => ({ detectBot: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { auth: {} } }));
vi.mock('@/lib/botDetection', () => ({ detectBot }));

import { track } from '../analytics';
import { useUserStore } from '@/store/userStore';

const fetchMock = vi.fn();
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
    useUserStore.setState({ user: null, token: null, loading: false, anonSignInFailed: false });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('sends with bearer token for signed-in user', () => {
    useUserStore.setState({ user: { id: 'u1' } as never, token: 't1' });
    track('search');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer t1');
    expect(bodyOf(0)).toEqual({ event: 'search' });
  });

  it('same subject same day skips', () => {
    useUserStore.setState({ user: { id: 'u1' } as never, token: 't1' });
    track('detail_view');
    track('detail_view');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.setSystemTime(new Date('2026-10-30T03:00:00Z'));
    track('detail_view');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('subject change sends again', () => {
    detectBot.mockReturnValue({ isBot: true, reason: 'user_agent' });
    track('open');
    useUserStore.setState({ user: { id: 'u1' } as never, token: 't1' });
    track('open');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('no token non-open is dropped', () => {
    track('search');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('bot open carries visitor and reason', () => {
    detectBot.mockReturnValue({ isBot: true, reason: 'user_agent' });
    track('open');
    const b = bodyOf(0);
    expect(b.visitor_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(b.is_suspected_bot).toBe(true);
    expect(b.bot_reason).toBe('user_agent');
    vi.setSystemTime(new Date('2026-10-30T03:00:00Z'));
    track('open');
    expect(bodyOf(1).visitor_id).toBe(b.visitor_id);
  });

  it('render_service sends nothing', () => {
    detectBot.mockReturnValue({ isBot: true, reason: 'render_service' });
    useUserStore.setState({ user: { id: 'u1' } as never, token: 't1' });
    track('open');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('network failure is silent', async () => {
    fetchMock.mockRejectedValue(new Error('net'));
    useUserStore.setState({ user: { id: 'u1' } as never, token: 't1' });
    expect(() => track('search')).not.toThrow();
    await vi.advanceTimersByTimeAsync(0);
  });

  it('storage throws: still sends without crashing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('x'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('x'); });
    useUserStore.setState({ user: { id: 'u1' } as never, token: 't1' });
    expect(() => track('search')).not.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
