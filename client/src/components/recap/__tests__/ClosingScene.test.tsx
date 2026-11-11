// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { translations } from '@/i18n/locales';
import { makeRecap } from '@/lib/recap/__tests__/fixtures';
import { DOWNLOAD_URL, STORE_LABELS } from '@/lib/recap/download';
import ClosingScene from '../scenes/ClosingScene';
import RecapScene from '../RecapScene';

const zh = translations['zh-TW'].recap;
const en = translations['en-US'].recap;
const base = { animate: false, year: 2026, isPartial: false, aspectRatio: '9:16' as const, data: {} as Record<string, never> };
const text = (c: HTMLElement) => c.textContent ?? '';

afterEach(cleanup);

describe('ClosingScene', () => {
  it.each([
    ['zh-TW', zh],
    ['en-US', en],
  ] as const)('%s：品牌、標語與商店名稱', (locale, copy) => {
    const { container } = render(<ClosingScene {...base} copy={copy} locale={locale} />);
    expect(text(container)).toContain('STORIO');
    expect(text(container)).toContain('Collect stories in your Folio');
    for (const label of STORE_LABELS) expect(text(container)).toContain(label);
  });

  it('有 QR 圖（含 alt）', () => {
    render(<ClosingScene {...base} copy={zh} locale="zh-TW" />);
    const qr = screen.getByTestId('closing-qr') as HTMLImageElement;
    expect(qr.getAttribute('src')).toBe('/image/recap/download-qr.png');
    expect(qr.alt.trim().length).toBeGreaterThan(0);
  });

  it('4:5 時 frame 高 500', () => {
    render(<ClosingScene {...base} aspectRatio="4:5" copy={zh} locale="zh-TW" />);
    expect((screen.getByTestId('scene-frame') as HTMLElement).style.height).toBe('500px');
  });

  it('RecapScene 以 closing 渲染出 scene-frame', () => {
    const { container } = render(
      <RecapScene sceneKey="closing" recap={makeRecap()} copy={zh} locale="zh-TW" aspectRatio="9:16" animate={false} />
    );
    expect(container.querySelector('[data-testid="scene-frame"]')).not.toBeNull();
  });

  it('下載網址為 https 且 STORE_LABELS 非空', () => {
    expect(DOWNLOAD_URL.startsWith('https://')).toBe(true);
    expect(STORE_LABELS.length).toBeGreaterThan(0);
  });
});
