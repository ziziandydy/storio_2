// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { detectBot, getSession } = vi.hoisted(() => ({ detectBot: vi.fn(), getSession: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { getSession } } }));
vi.mock('@/lib/botDetection', () => ({ detectBot }));

import { track } from '../analytics';
import { useUserStore } from '@/store/userStore';

const fetchMock = vi.fn();
const flush = () => vi.advanceTimersByTimeAsync(0);
const signIn = () => getSession.mockResolvedValue({ data: { session: { access_token: 't1', user: { id: 'u1' } } } });
const bodyOf = (i: number) => JSON.parse(fetchMock.mock.calls[i][1].body);

describe('track：Recap 事件（含年份與場景數）', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-12-05T03:00:00Z'));
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

  it('recap_opened 帶 year 與 Authorization', async () => {
    signIn();
    track('recap_opened', { year: 2026 });
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer t1');
    expect(bodyOf(0)).toEqual({ event: 'recap_opened', year: 2026 });
  });

  it('recap_shared 帶 year 與 scene_count', async () => {
    signIn();
    track('recap_shared', { year: 2026, sceneCount: 12 });
    await flush();
    expect(bodyOf(0)).toEqual({ event: 'recap_shared', year: 2026, scene_count: 12 });
  });

  it('同日同年份同張數不重送；張數或年份不同則再送', async () => {
    signIn();
    track('recap_shared', { year: 2026, sceneCount: 12 });
    await flush();
    track('recap_shared', { year: 2026, sceneCount: 12 });
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    track('recap_shared', { year: 2026, sceneCount: 5 });
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    track('recap_shared', { year: 2025, sceneCount: 12 });
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('隔天可再送同樣的事件', async () => {
    signIn();
    track('recap_opened', { year: 2026 });
    await flush();
    vi.setSystemTime(new Date('2026-12-06T03:00:00Z'));
    track('recap_opened', { year: 2026 });
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('沒有 token（訪客）不送', async () => {
    track('recap_opened', { year: 2026 });
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('既有事件的 body 不變（不帶 year／scene_count）', async () => {
    signIn();
    track('share');
    await flush();
    expect(bodyOf(0)).toEqual({ event: 'share' });
  });
});
