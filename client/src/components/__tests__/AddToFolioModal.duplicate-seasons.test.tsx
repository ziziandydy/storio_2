// @vitest-environment jsdom
// 重複收藏同一季：不退回選季畫面、不丟掉已填的評分與心得，直接在表單上方確認「仍要再記一筆」。
import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';

const m = vi.hoisted(() => ({ toast: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: (props: Record<string, unknown>) => <img {...(props as object)} />,
}));
vi.mock('@/hooks/useTranslation', async () => {
  const { translations } = await import('@/i18n/locales');
  return { useTranslation: () => ({ t: translations['zh-TW'] }) };
});
vi.mock('@/components/ToastProvider', () => ({ useToast: () => ({ showToast: m.toast }) }));
vi.mock('@/lib/notifications', () => ({ recordEngagement: vi.fn() }));
vi.mock('@/lib/notification-events', () => ({ emitStoryAdded: vi.fn() }));
vi.mock('@/lib/haptics', () => ({ playSuccessHaptics: vi.fn() }));
vi.mock('@/lib/appleAuth', () => ({
  isNativePlatform: () => false,
  isIOSPlatform: () => false,
  nativeAppleSignIn: vi.fn(),
}));
vi.mock('@/lib/googleAuth', () => ({ isNativePlatform: () => false, nativeGoogleSignIn: vi.fn() }));
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { signInWithOAuth: vi.fn(), getSession: vi.fn() } },
  getURL: (p = '') => `http://localhost:3000${p}`,
}));
vi.mock('@/lib/reviewPrompt', () => ({ armReviewPrompt: vi.fn(), flushReviewPrompt: vi.fn() }));
// 表單換成有自己狀態的簡版：用來驗證「確認重複」時表單沒有被卸載
vi.mock('../RateAndReflectForm', () => {
  function MockForm({ onSave }: { onSave: (r: number, n: string, d?: string) => void }) {
    const [notes, setNotes] = useState('');
    return (
      <>
        <input data-testid="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button onClick={() => onSave(4, notes, '2026-11-11')}>mock-save</button>
      </>
    );
  }
  return { default: MockForm };
});

import AddToFolioModal from '../AddToFolioModal';
import { useUserStore } from '@/store/userStore';

const SEASONS = [5, 6, 7].map((n) => ({ season_number: n, name: `Season ${n}` }));

function setup(onSave: Mock) {
  useUserStore.setState({ user: { id: 'u1', is_anonymous: false, created_at: '2026-01-01T00:00:00Z' } as never });
  return render(
    <AddToFolioModal
      isOpen
      onClose={vi.fn()}
      onSave={onSave as never}
      onViewDetails={vi.fn()}
      title="Modern Family"
      external_id="1421"
      media_type="tv"
      seasons={SEASONS}
    />,
  );
}

/** 選 S5 → Continue → 填心得 → 儲存（後端回 duplicate） */
async function saveSeason5(onSave: Mock) {
  setup(onSave);
  fireEvent.click(screen.getByText('S5'));
  fireEvent.click(screen.getByText('Continue'));
  fireEvent.change(screen.getByTestId('notes'), { target: { value: '我的心得' } });
  await act(async () => {
    fireEvent.click(screen.getByText('mock-save'));
  });
}

describe('AddToFolioModal 重複收藏同一季', () => {
  beforeEach(() => m.toast.mockReset());
  afterEach(cleanup);

  it('偵測到重疊：停在表單、心得還在，顯示含季數的確認列，不退回選季畫面', async () => {
    const onSave = vi.fn().mockResolvedValue({ status: 'duplicate', existingSeasons: [5] });
    await saveSeason5(onSave);

    expect((screen.getByTestId('notes') as HTMLInputElement).value).toBe('我的心得');
    expect(screen.getByTestId('duplicate-notice').textContent).toContain('S5');
    expect(screen.queryByText('Continue')).toBeNull();
    expect(screen.queryByText('Already in your Folio')).toBeNull();
    expect(m.toast).not.toHaveBeenCalled();
  });

  it('按「仍要記錄」：用同一份評分、心得、日期以 force_add 再送一次並成功', async () => {
    const onSave = vi
      .fn()
      .mockResolvedValueOnce({ status: 'duplicate', existingSeasons: [5] })
      .mockResolvedValueOnce({ id: 'new-1', total_count: 8 });
    await saveSeason5(onSave);

    await act(async () => {
      fireEvent.click(screen.getByTestId('duplicate-confirm'));
    });

    expect(onSave).toHaveBeenCalledTimes(2);
    expect(onSave).toHaveBeenLastCalledWith(4, '我的心得', '2026-11-11', true, [5]);
    expect(screen.getByTestId('success-simple')).toBeTruthy();
  });

  it('按「改選季數」：回到選季畫面，已重疊的季數維持勾選並標示', async () => {
    const onSave = vi.fn().mockResolvedValue({ status: 'duplicate', existingSeasons: [5] });
    await saveSeason5(onSave);

    fireEvent.click(screen.getByTestId('duplicate-change-seasons'));

    expect(screen.getByText('Continue')).toBeTruthy();
    expect(screen.getByText('S5').className).toContain('bg-accent-gold');
  });

  it('舊的整部影集收藏（existingSeasons 為空）：仍給確認列，文案不含季數', async () => {
    const onSave = vi.fn().mockResolvedValue({ status: 'duplicate', existingSeasons: [] });
    await saveSeason5(onSave);

    const text = screen.getByTestId('duplicate-notice').textContent ?? '';
    expect(text).not.toMatch(/S\d/);
    expect(screen.getByTestId('duplicate-confirm')).toBeTruthy();
  });

  it('沒有重疊的新一季不會出現確認列（直接成功）', async () => {
    const onSave = vi.fn().mockResolvedValue({ id: 'new-2', total_count: 9 });
    setup(onSave);
    fireEvent.click(screen.getByText('S6'));
    fireEvent.click(screen.getByText('Continue'));
    await act(async () => {
      fireEvent.click(screen.getByText('mock-save'));
    });
    expect(screen.queryByTestId('duplicate-notice')).toBeNull();
    expect(screen.getByTestId('success-simple')).toBeTruthy();
  });
});
