// @vitest-environment jsdom
// Regression: ISSUE-001 — modal rendered inside a z-10 stacking context so the FAB (z-50) paints above it
// Found by /qa on 2026-11-09
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MotionGlobalConfig } from 'framer-motion';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: (props: Record<string, unknown>) => <img {...(props as object)} />,
}));
vi.mock('@/hooks/useTranslation', async () => {
  const { translations } = await import('@/i18n/locales');
  return { useTranslation: () => ({ t: translations['zh-TW'] }) };
});
vi.mock('@/components/ToastProvider', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
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
vi.mock('../RateAndReflectForm', () => ({ default: () => <button>mock-save</button> }));

import AddToFolioModal from '../AddToFolioModal';

const modalRoot = () => document.querySelector<HTMLElement>('.fixed.inset-0.z-\\[150\\]');

describe('AddToFolioModal 透過 portal 掛到 body（ISSUE-001）', () => {
  beforeEach(() => {
    MotionGlobalConfig.skipAnimations = true;
  });
  afterEach(() => {
    cleanup();
    MotionGlobalConfig.skipAnimations = false;
  });

  it('掛在 z-10 堆疊脈絡內時，視窗根節點仍是 body 的直接子節點；遮罩可關閉、關閉後會卸載', async () => {
    const onClose = vi.fn();
    const props = {
      onClose,
      onSave: vi.fn(),
      onViewDetails: vi.fn(),
      title: '奧德賽',
      external_id: 'tmdb-1',
      media_type: 'movie' as const,
    };
    const { rerender } = render(
      <main data-testid="stacking-wrapper" style={{ position: 'relative', zIndex: 10 }}>
        <AddToFolioModal isOpen {...props} />
      </main>,
    );

    const root = modalRoot();
    expect(root).toBeTruthy();
    expect(screen.getByTestId('stacking-wrapper').contains(root)).toBe(false);
    expect(root!.parentElement).toBe(document.body);

    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(
      <main data-testid="stacking-wrapper" style={{ position: 'relative', zIndex: 10 }}>
        <AddToFolioModal isOpen={false} {...props} />
      </main>,
    );
    await waitFor(() => expect(modalRoot()).toBeNull());
    expect(screen.queryByText('mock-save')).toBeNull();
  });
});
