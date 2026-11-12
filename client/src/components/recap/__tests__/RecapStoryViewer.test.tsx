// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import RecapStoryViewer from '../RecapStoryViewer';

const slides = ['A', 'B', 'C'];

function setup(props: Partial<React.ComponentProps<typeof RecapStoryViewer>> = {}) {
  const onIndexChange = vi.fn();
  const view = render(
    <RecapStoryViewer
      count={slides.length}
      renderSlide={(i, active) => (
        <div data-testid={`slide-${i}`} data-active={active ? 'yes' : 'no'}>
          {slides[i]}
          <button data-no-nav onClick={() => {}}>內部按鈕{i}</button>
        </div>
      )}
      header={<span>頁首</span>}
      footer={<span>頁尾</span>}
      onIndexChange={onIndexChange}
      {...props}
    />,
  );
  return { ...view, onIndexChange };
}

const stage = () => screen.getByTestId('story-stage');
const activeIndex = () => slides.findIndex((_, i) => screen.getByTestId(`slide-${i}`).getAttribute('data-active') === 'yes');
const fill = (i: number) => screen.getAllByTestId('story-progress-fill')[i] as HTMLElement;
const RIGHT = { clientX: 900 };
const LEFT = { clientX: 10 };

describe('RecapStoryViewer（限時動態式瀏覽）', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 1000, configurable: true });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('整頁固定在視窗內、不可上下捲動；每一頁一段進度條，頁首與頁尾都在', () => {
    setup();
    const root = screen.getByTestId('story-viewer');
    expect(root.className).toContain('fixed');
    expect(root.className).toContain('inset-0');
    expect(root.className).toContain('overflow-hidden');
    expect(screen.getAllByTestId('story-progress-fill')).toHaveLength(3);
    expect(screen.getByText('頁首')).toBeTruthy();
    expect(screen.getByText('頁尾')).toBeTruthy();
  });

  it('預設顯示第 1 頁；只有目前這一頁是 active', () => {
    setup();
    expect(activeIndex()).toBe(0);
    expect(screen.getByTestId('story-slide-0').style.visibility).toBe('visible');
    expect(screen.getByTestId('story-slide-1').style.visibility).toBe('hidden');
  });

  it('點右側換下一頁、點左側回上一頁；第一頁再往前、最後一頁再往後都不動', () => {
    const { onIndexChange } = setup();
    fireEvent.click(stage(), LEFT);
    expect(activeIndex()).toBe(0);
    fireEvent.click(stage(), RIGHT);
    expect(activeIndex()).toBe(1);
    fireEvent.click(stage(), RIGHT);
    expect(activeIndex()).toBe(2);
    fireEvent.click(stage(), RIGHT);
    expect(activeIndex()).toBe(2);
    fireEvent.click(stage(), LEFT);
    expect(activeIndex()).toBe(1);
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
  });

  it('點到 data-no-nav 的互動元素（換一句、分享、登入…）不換頁', () => {
    setup();
    fireEvent.click(screen.getByText('內部按鈕0'), RIGHT);
    expect(activeIndex()).toBe(0);
  });

  it('進度條：已看過的滿格、目前這一頁跑動畫、之後的是空的', () => {
    setup();
    fireEvent.click(stage(), RIGHT); // 到第 2 頁
    expect(fill(0).style.width).toBe('100%');
    expect(fill(1).style.animationName).toBe('recap-story-fill');
    expect(fill(2).style.width).toBe('0%');
  });

  it('目前這一頁的進度條跑完就自動換下一頁；最後一頁不自動前進且是滿格', () => {
    setup();
    fireEvent.animationEnd(fill(0));
    expect(activeIndex()).toBe(1);
    fireEvent.animationEnd(fill(1));
    expect(activeIndex()).toBe(2);
    expect(fill(2).style.animationName).toBe('');
    expect(fill(2).style.width).toBe('100%');
    fireEvent.animationEnd(fill(2));
    expect(activeIndex()).toBe(2);
  });

  it('按住暫停（進度條暫停、放開才繼續），放開不算點擊換頁', () => {
    vi.useFakeTimers();
    setup();
    expect(fill(0).style.animationPlayState).toBe('running');
    fireEvent.pointerDown(stage(), RIGHT);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(fill(0).style.animationPlayState).toBe('paused');
    fireEvent.pointerUp(stage(), RIGHT);
    fireEvent.click(stage(), RIGHT); // 瀏覽器放開後會補一個 click：必須被忽略
    expect(activeIndex()).toBe(0);
    expect(fill(0).style.animationPlayState).toBe('running');
  });

  it('快速點一下（沒有按住）照常換頁', () => {
    vi.useFakeTimers();
    setup();
    fireEvent.pointerDown(stage(), RIGHT);
    act(() => {
      vi.advanceTimersByTime(80);
    });
    fireEvent.pointerUp(stage(), RIGHT);
    fireEvent.click(stage(), RIGHT);
    expect(activeIndex()).toBe(1);
  });

  it('paused 屬性（例如分享面板開著）會暫停進度條', () => {
    const { rerender } = setup({ paused: true });
    expect(fill(0).style.animationPlayState).toBe('paused');
    rerender(
      <RecapStoryViewer count={3} renderSlide={(i, a) => <div data-testid={`slide-${i}`} data-active={a ? 'yes' : 'no'} />} paused={false} />,
    );
    expect(fill(0).style.animationPlayState).toBe('running');
  });

  it('鍵盤左右鍵換頁', () => {
    setup();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(activeIndex()).toBe(1);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(activeIndex()).toBe(0);
  });

  it('用戶開啟「減少動態效果」：不自動前進，只能手動換頁', () => {
    const original = window.matchMedia;
    window.matchMedia = ((q: string) => ({ matches: q.includes('reduce'), addListener: () => {}, removeListener: () => {} })) as never;
    try {
      setup();
      expect(fill(0).style.animationName).toBe('');
      expect(fill(0).style.width).toBe('100%');
      fireEvent.click(stage(), RIGHT);
      expect(activeIndex()).toBe(1);
    } finally {
      window.matchMedia = original;
    }
  });

  it('每頁可以有自己的停留時間（心得這種長文字頁久一點）', () => {
    setup({ durationMs: (i) => (i === 1 ? 9000 : 4000) });
    expect(fill(0).style.animationDuration).toBe('4000ms');
    fireEvent.click(stage(), RIGHT);
    expect(fill(1).style.animationDuration).toBe('9000ms');
  });
});
