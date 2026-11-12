// @vitest-environment jsdom
// Regression: ISSUE-001 — Recap 置頂卡片的關閉 X 觸控面積只有 32×32，低於 iOS 建議的 44pt
// Found by /qa on 2026-11-11
// Report: .gstack/qa-reports/run-20261111T150126Z/qa-report-localhost-2026-11-11.md
// Value: protects=關閉鈕觸控面積不小於 44px; fails_when=關閉鈕尺寸 class 被改回 p-2 的 32px; why_new=現有測試只驗行為不驗尺寸; seam=none; no_claim=jsdom 無排版，只驗尺寸 class，實際像素由 /qa 量測
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/hooks/useTranslation', async () => {
  const { translations } = await import('@/i18n/locales');
  return { useTranslation: () => ({ t: translations['zh-TW'], locale: 'zh-TW' }) };
});
vi.mock('@/hooks/useRecap', () => ({
  useRecapYears: () => ({
    years: { threshold: 3, years: [{ year: 2026, count: 5 }], current: { year: 2026, count: 5 } },
    loading: false,
    error: false,
  }),
}));

import RecapWindowCard from '../RecapWindowCard';

describe('RecapWindowCard 關閉鈕觸控面積', () => {
  afterEach(cleanup);

  it('關閉鈕寬高至少 44px（h-11 w-11）', () => {
    localStorage.clear();
    render(<RecapWindowCard today={new Date(2026, 11, 5)} />);
    const x = screen.getByRole('button', { name: '關閉' });
    expect(x.className).toContain('h-11');
    expect(x.className).toContain('w-11');
  });
});
