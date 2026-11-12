// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import CountUp from '../CountUp';

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  }));
}

const text = () => screen.getByTestId('count-up').textContent;

describe('CountUp', () => {
  beforeEach(() => stubReducedMotion(false));
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('animate={false} 時直接顯示終值', () => {
    render(<CountUp value={42} animate={false} />);
    expect(text()).toBe('42');
  });

  it('prefers-reduced-motion 時直接顯示終值', () => {
    stubReducedMotion(true);
    render(<CountUp value={42} animate />);
    expect(text()).toBe('42');
  });

  it('animate 時從 0 開始，動畫結束後等於終值', async () => {
    vi.useFakeTimers();
    render(<CountUp value={100} animate duration={900} />);
    expect(text()).toBe('0');

    await act(async () => { await vi.advanceTimersByTimeAsync(1200); });
    expect(text()).toBe('100');
  });

  it('動畫進行中的值介於 0 與終值之間', async () => {
    vi.useFakeTimers();
    render(<CountUp value={100} animate duration={900} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    const mid = Number(text());
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(100);
  });

  it('value 為 0 不報錯', async () => {
    vi.useFakeTimers();
    render(<CountUp value={0} animate />);
    await act(async () => { await vi.advanceTimersByTimeAsync(1200); });
    expect(text()).toBe('0');
  });

  it('format 可自訂（例如千分位）', () => {
    render(<CountUp value={1234} animate={false} format={(n) => n.toLocaleString('en-US')} />);
    expect(text()).toBe('1,234');
  });
});
