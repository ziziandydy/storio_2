// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { translations } from '@/i18n/locales';
import { makeRecap } from '@/lib/recap/__tests__/fixtures';
import MonthsActiveScene from '../scenes/MonthsActiveScene';

const recap = makeRecap();
const base = { animate: false, year: 2026, isPartial: false, aspectRatio: '9:16' as const };

afterEach(cleanup);

describe('MonthsActiveScene', () => {
  it.each([
    ['zh-TW' as const, translations['zh-TW'].recap],
    ['en-US' as const, translations['en-US'].recap],
  ])('%s：數字 n 用主色系金色（其他場景都有金色，這頁不能只有白字）', (locale, copy) => {
    render(<MonthsActiveScene {...base} data={recap.months_active!} copy={copy} locale={locale} />);
    const n = screen.getByTestId('months-active-n') as HTMLElement;
    expect(n.textContent).toBe(String(recap.months_active!.count));
    expect(n.style.color).toBe('rgb(197, 160, 89)');
  });
});
