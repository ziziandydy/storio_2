// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { MotionGlobalConfig } from 'framer-motion';

const m = vi.hoisted(() => ({
  push: vi.fn(),
  locale: { current: 'zh-TW' as 'zh-TW' | 'en-US' },
  native: false,
  ios: false,
  haptics: vi.fn(),
  oauth: vi.fn(),
  apple: vi.fn(),
  google: vi.fn(),
  reduced: false,
  arm: vi.fn(),
  flush: vi.fn(),
  engage: vi.fn(),
  emit: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: m.push }) }));
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: (props: Record<string, unknown>) => <img {...(props as object)} />,
}));
vi.mock('@/hooks/useTranslation', async () => {
  const { translations } = await import('@/i18n/locales');
  return { useTranslation: () => ({ t: translations[m.locale.current] }) };
});
vi.mock('@/components/ToastProvider', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('@/lib/notifications', () => ({ recordEngagement: (...a: unknown[]) => m.engage(...a) }));
vi.mock('@/lib/notification-events', () => ({ emitStoryAdded: (...a: unknown[]) => m.emit(...a) }));
vi.mock('@/lib/haptics', () => ({ playSuccessHaptics: (...a: unknown[]) => m.haptics(...a) }));
vi.mock('@/lib/appleAuth', () => ({
  isNativePlatform: () => m.native,
  isIOSPlatform: () => m.ios,
  nativeAppleSignIn: (...a: unknown[]) => m.apple(...a),
}));
vi.mock('@/lib/googleAuth', () => ({
  isNativePlatform: () => m.native,
  nativeGoogleSignIn: (...a: unknown[]) => m.google(...a),
}));
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { signInWithOAuth: (...a: unknown[]) => m.oauth(...a), getSession: vi.fn() } },
  getURL: (p = '') => `http://localhost:3000${p}`,
}));
vi.mock('@/lib/reviewPrompt', () => ({
  armReviewPrompt: (...a: unknown[]) => m.arm(...a),
  flushReviewPrompt: (...a: unknown[]) => m.flush(...a),
}));
// 表單本身與本任務無關：換成一顆直接呼叫 onSave 的按鈕
vi.mock('../RateAndReflectForm', () => ({
  default: ({ onSave }: { onSave: (r: number, n: string) => void }) => (
    <button onClick={() => onSave(5, 'n')}>mock-save</button>
  ),
}));

import AddToFolioModal from '../AddToFolioModal';
import { useUserStore } from '@/store/userStore';

const CREATED_AT = '2026-09-01T00:00:00Z';
const setAnonymous = (isAnonymous: boolean) =>
  useUserStore.setState({ user: { id: 'u1', is_anonymous: isAnonymous, created_at: CREATED_AT } as never });

async function saveWith(result: unknown, extra: Partial<React.ComponentProps<typeof AddToFolioModal>> = {}) {
  const onClose = vi.fn();
  const onSave = vi.fn().mockResolvedValue(result);
  const utils = render(
    <AddToFolioModal
      isOpen
      onClose={onClose}
      onSave={onSave}
      onViewDetails={vi.fn()}
      title="奧德賽"
      external_id="tmdb-1"
      media_type="movie"
      posterUrl="https://image.example/poster.jpg"
      {...extra}
    />,
  );
  await act(async () => {
    fireEvent.click(screen.getByText('mock-save'));
  });
  return { ...utils, onClose, onSave };
}

const q = {
  celebration: () => screen.queryByTestId('first-collect-celebration'),
  guest: () => screen.queryByTestId('guest-save-card'),
  simple: () => screen.queryByTestId('success-simple'),
  burst: () => document.body.querySelectorAll('[data-confetti="burst"]'),
  fall: () => document.body.querySelectorAll('[data-confetti="fall"]'),
};

describe('AddToFolioModal 成功畫面選擇', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    m.locale.current = 'zh-TW';
    m.native = false;
    m.ios = false;
    m.reduced = false;
    m.push.mockReset();
    m.haptics.mockReset();
    m.oauth.mockReset().mockResolvedValue({ error: null });
    m.apple.mockReset();
    m.google.mockReset();
    m.arm.mockReset();
    m.flush.mockReset();
    m.engage.mockReset();
    m.emit.mockReset();
    setAnonymous(false);
    window.matchMedia = ((query: string) => ({
      matches: m.reduced && query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('已登入＋第一部（total_count===1）→ 慶祝，觸覺呼叫一次', async () => {
    await saveWith({ id: 's1', total_count: 1 });
    expect(q.celebration()).toBeTruthy();
    expect(q.simple()).toBeNull();
    expect(q.guest()).toBeNull();
    expect(screen.getByText('收藏成功')).toBeTruthy();
    expect(m.haptics).toHaveBeenCalledTimes(1);
  });

  it('已登入＋第二部起 → 簡單版，不播慶祝也不震動', async () => {
    await saveWith({ id: 's2', total_count: 2 });
    expect(q.simple()).toBeTruthy();
    expect(q.celebration()).toBeNull();
    expect(q.burst().length).toBe(0);
    expect(m.haptics).not.toHaveBeenCalled();
  });

  it('訪客＋非第一部 → 直接訪客卡', async () => {
    setAnonymous(true);
    await saveWith({ id: 's3', total_count: 3 });
    expect(q.guest()).toBeTruthy();
    expect(q.celebration()).toBeNull();
    expect(screen.getByText('登入後，收藏不會消失')).toBeTruthy();
  });

  it('訪客＋第一部 → 先慶祝，約 3.5 秒後換訪客卡', async () => {
    setAnonymous(true);
    await saveWith({ id: 's1', total_count: 1 });
    expect(q.celebration()).toBeTruthy();
    expect(q.guest()).toBeNull();
    await act(async () => { vi.advanceTimersByTime(3499); });
    expect(q.guest()).toBeNull();
    await act(async () => { vi.advanceTimersByTime(1); });
    expect(q.guest()).toBeTruthy();
    expect(q.celebration()).toBeNull();
  });

  it('訪客＋第一部：慶祝中途關閉（卸載）不殘留計時器報錯', async () => {
    setAnonymous(true);
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = await saveWith({ id: 's1', total_count: 1 });
    unmount();
    await act(async () => { vi.advanceTimersByTime(10000); });
    expect(vi.getTimerCount()).toBe(0);
    expect(errSpy).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it('訪客＋第一部：中途 isOpen=false 也清掉切換計時器', async () => {
    setAnonymous(true);
    const { rerender, onSave, onClose } = await saveWith({ id: 's1', total_count: 1 });
    rerender(
      <AddToFolioModal isOpen={false} onClose={onClose} onSave={onSave} onViewDetails={vi.fn()} title="奧德賽" external_id="tmdb-1" />,
    );
    await act(async () => { vi.advanceTimersByTime(10000); });
    expect(q.guest()).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    // 重開後也不得出現訪客卡（切換計時器沒有偷偷改掉狀態）或殘留的慶祝
    rerender(
      <AddToFolioModal isOpen onClose={onClose} onSave={onSave} onViewDetails={vi.fn()} title="奧德賽" external_id="tmdb-1" />,
    );
    expect(q.guest()).toBeNull();
    expect(q.celebration()).toBeNull();
    expect(screen.getByText('mock-save')).toBeTruthy();
  });

  it('重開視窗不重播慶祝與觸覺（呼叫端只切換 isOpen、不卸載）', async () => {
    // 讓 AnimatePresence 的退場立即完成，模擬真實瀏覽器中關閉後內容已卸載
    MotionGlobalConfig.skipAnimations = true;
    try {
      const { rerender, onSave, onClose } = await saveWith({ id: 's1', total_count: 1 });
      expect(m.haptics).toHaveBeenCalledTimes(1);
      const props = { onClose, onSave, onViewDetails: vi.fn(), title: '奧德賽', external_id: 'tmdb-1', posterUrl: 'https://image.example/poster.jpg' };
      rerender(<AddToFolioModal isOpen={false} {...props} />);
      await act(async () => { vi.advanceTimersByTime(1000); });
      expect(q.celebration()).toBeNull(); // 退場已完成、慶祝已卸載
      rerender(<AddToFolioModal isOpen {...props} />);
      await act(async () => { vi.advanceTimersByTime(0); });
      expect(m.haptics).toHaveBeenCalledTimes(1);
      expect(q.celebration()).toBeNull();
      expect(q.burst().length).toBe(0);
      expect(q.fall().length).toBe(0);
      expect(screen.getByText('mock-save')).toBeTruthy();
    } finally {
      MotionGlobalConfig.skipAnimations = false;
    }
  });

  it('total_count 缺漏（已登入）→ 簡單版，且從未出現慶祝', async () => {
    await saveWith({ id: 's1' });
    expect(q.simple()).toBeTruthy();
    expect(q.celebration()).toBeNull();
    await act(async () => { vi.advanceTimersByTime(5000); });
    expect(q.simple()).toBeTruthy();
    expect(q.celebration()).toBeNull();
    expect(m.haptics).not.toHaveBeenCalled();
  });

  it('total_count 不是數字（"1"）→ 簡單版', async () => {
    await saveWith({ id: 's1', total_count: '1' });
    expect(q.simple()).toBeTruthy();
    expect(q.celebration()).toBeNull();
  });

  it('total_count 缺漏（訪客）→ 訪客卡（不依賴數量），不播慶祝', async () => {
    setAnonymous(true);
    await saveWith({ id: 's1' });
    expect(q.guest()).toBeTruthy();
    expect(q.celebration()).toBeNull();
  });

  it('capacity_reached → 仍走 GuestLimitModal', async () => {
    setAnonymous(true);
    await saveWith({ status: 'capacity_reached' });
    expect(screen.getByText('Storio Capacity Reached')).toBeTruthy();
    expect(q.guest()).toBeNull();
    expect(q.simple()).toBeNull();
  });

  it('英文介面：成功標題為 Saved，不再出現寫死英文', async () => {
    m.locale.current = 'en-US';
    await saveWith({ id: 's2', total_count: 2 });
    expect(screen.getByText('Saved')).toBeTruthy();
    expect(screen.queryByText(/Successfully add to storio/i)).toBeNull();
  });

  it('中文介面：簡單版標題為「收藏成功」，不再出現寫死英文', async () => {
    await saveWith({ id: 's2', total_count: 2 });
    expect(screen.getByText('收藏成功')).toBeTruthy();
    expect(screen.queryByText(/Successfully add to storio/i)).toBeNull();
  });

  it('點遮罩仍呼叫 onClose（訪客卡可點外面收起）', async () => {
    setAnonymous(true);
    const { onClose } = await saveWith({ id: 's3', total_count: 3 });
    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('慶祝彩帶：炸開 58 片＋灑落 44 片，約 3 秒後卸載', async () => {
    await saveWith({ id: 's1', total_count: 1 });
    expect(q.burst().length).toBe(58);
    expect(q.fall().length).toBe(44);
    await act(async () => { vi.advanceTimersByTime(3200); });
    expect(q.burst().length).toBe(0);
    expect(q.fall().length).toBe(0);
    // 卸載彩帶後慶祝卡本身仍在（已登入不切換）
    expect(q.celebration()).toBeTruthy();
  });

  it('彩帶位置為固定演算：兩次渲染完全相同', async () => {
    const first = await saveWith({ id: 's1', total_count: 1 });
    const a = Array.from(q.burst()).map((n) => n.getAttribute('style'));
    first.unmount();
    await saveWith({ id: 's1', total_count: 1 });
    const b = Array.from(q.burst()).map((n) => n.getAttribute('style'));
    expect(a).toEqual(b);
  });

  it('prefers-reduced-motion → 不渲染任何彩帶節點，仍有勾勾', async () => {
    m.reduced = true;
    await saveWith({ id: 's1', total_count: 1 });
    expect(q.celebration()).toBeTruthy();
    expect(q.burst().length).toBe(0);
    expect(q.fall().length).toBe(0);
    expect(screen.getByTestId('celebration-check')).toBeTruthy();
  });

  it('慶祝顯示傳入的海報', async () => {
    await saveWith({ id: 's1', total_count: 1 });
    const img = q.celebration()!.querySelector('img');
    expect(img?.getAttribute('src')).toBe('https://image.example/poster.jpg');
  });

  it('訪客卡「稍後再說」→ onClose 並前往 /collection', async () => {
    setAnonymous(true);
    const { onClose } = await saveWith({ id: 's3', total_count: 3 });
    fireEvent.click(screen.getByText('稍後再說，前往 My Storio'));
    expect(onClose).toHaveBeenCalled();
    expect(m.push).toHaveBeenCalledWith('/collection');
  });

  it('訪客卡（網頁）點 Apple → 沿用既有 OAuth 登入流程', async () => {
    setAnonymous(true);
    await saveWith({ id: 's3', total_count: 3 });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Apple/i }));
    });
    expect(m.oauth).toHaveBeenCalledWith(expect.objectContaining({ provider: 'apple' }));
    expect(m.apple).not.toHaveBeenCalled();
  });

  it('訪客卡（iOS 原生）點 Apple → 原生登入，成功後關閉', async () => {
    m.native = true;
    m.ios = true;
    m.apple.mockResolvedValue({ error: null, cancelled: false });
    setAnonymous(true);
    const { onClose } = await saveWith({ id: 's3', total_count: 3 });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Apple/i }));
    });
    expect(m.apple).toHaveBeenCalledTimes(1);
    expect(m.oauth).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('訪客卡（原生）點 Google → 原生 Google 登入；取消時不關閉', async () => {
    m.native = true;
    m.ios = true;
    m.google.mockResolvedValue({ error: null, cancelled: true });
    setAnonymous(true);
    const { onClose } = await saveWith({ id: 's3', total_count: 3 });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Google/i }));
    });
    expect(m.google).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });
  describe('系統評價視窗登記與觸發', () => {
    it('第二部起（已登入）→ 以正確參數 arm，celebrated=false', async () => {
      await saveWith({ id: 's2', total_count: 2 });
      expect(m.arm).toHaveBeenCalledTimes(1);
      expect(m.arm).toHaveBeenCalledWith({
        isAnonymous: false,
        accountCreatedAt: CREATED_AT,
        totalCount: 2,
        celebrated: false,
      });
      expect(m.flush).not.toHaveBeenCalled();
    });

    it('第一部慶祝 → arm 時 celebrated=true（不在同次呼叫）', async () => {
      await saveWith({ id: 's1', total_count: 1 });
      expect(m.arm).toHaveBeenCalledWith(expect.objectContaining({ celebrated: true, totalCount: 1 }));
    });

    it('訪客 → arm 時 isAnonymous=true；total_count 缺漏 → totalCount=null', async () => {
      setAnonymous(true);
      await saveWith({ id: 's3' });
      expect(m.arm).toHaveBeenCalledWith(expect.objectContaining({ isAnonymous: true, totalCount: null }));
    });

    it('duplicate／capacity_reached／錯誤 → 不 arm', async () => {
      await saveWith({ status: 'duplicate' });
      cleanup();
      await saveWith({ status: 'capacity_reached' });
      cleanup();
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await saveWith(Promise.reject(new Error('x')));
      errSpy.mockRestore();
      expect(m.arm).not.toHaveBeenCalled();
    });

    it('簡單版「繼續瀏覽」→ onClose 並 flush', async () => {
      const { onClose } = await saveWith({ id: 's2', total_count: 2 });
      fireEvent.click(screen.getByText('繼續瀏覽'));
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(m.flush).toHaveBeenCalledTimes(1);
    });

    it('簡單版「前往 My Storio」→ onClose、flush 並導向 /collection', async () => {
      const { onClose } = await saveWith({ id: 's2', total_count: 2 });
      fireEvent.click(screen.getByRole('button', { name: /前往 My Storio/ }));
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(m.flush).toHaveBeenCalledTimes(1);
      expect(m.push).toHaveBeenCalledWith('/collection');
    });

    it('慶祝畫面的「繼續瀏覽」與「前往 My Storio」也會 flush', async () => {
      const first = await saveWith({ id: 's1', total_count: 1 });
      fireEvent.click(screen.getByText('繼續瀏覽'));
      expect(first.onClose).toHaveBeenCalledTimes(1);
      expect(m.flush).toHaveBeenCalledTimes(1);
      first.unmount();
      const second = await saveWith({ id: 's1', total_count: 1 });
      fireEvent.click(screen.getByRole('button', { name: /前往 My Storio/ }));
      expect(second.onClose).toHaveBeenCalledTimes(1);
      expect(m.flush).toHaveBeenCalledTimes(2);
      expect(m.push).toHaveBeenCalledWith('/collection');
    });

    it('點遮罩關閉成功視窗 → flush', async () => {
      const { onClose } = await saveWith({ id: 's2', total_count: 2 });
      fireEvent.click(screen.getByTestId('modal-backdrop'));
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(m.flush).toHaveBeenCalledTimes(1);
    });
  });

  describe('新增事件（首頁館藏數即時更新）', () => {
    it('網頁（非原生）儲存成功 → emitStoryAdded，但不 recordEngagement', async () => {
      await saveWith({ id: 's1', total_count: 1 });
      expect(m.emit).toHaveBeenCalledTimes(1);
      expect(m.engage).not.toHaveBeenCalled();
    });

    it('原生儲存成功 → emitStoryAdded 與 recordEngagement(2) 都呼叫', async () => {
      m.native = true;
      await saveWith({ id: 's2', total_count: 2 });
      expect(m.emit).toHaveBeenCalledTimes(1);
      expect(m.engage).toHaveBeenCalledWith(2);
    });

    it('duplicate／capacity_reached → 不 emit', async () => {
      await saveWith({ status: 'duplicate' });
      cleanup();
      await saveWith({ status: 'capacity_reached' });
      expect(m.emit).not.toHaveBeenCalled();
    });
  });
});
