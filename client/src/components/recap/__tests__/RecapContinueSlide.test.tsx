// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { translations } from '@/i18n/locales';
import RecapContinueSlide from '../RecapContinueSlide';

const copy = translations['zh-TW'].recap;

describe('RecapContinueSlide（最後一頁）', () => {
  afterEach(cleanup);

  it('用 App 既有的 Storio 載入動畫（loading.gif），背景與素材一致的純黑', () => {
    render(<RecapContinueSlide copy={copy} onContinue={() => {}} />);
    const loader = screen.getByTestId('recap-loader') as HTMLImageElement;
    expect(loader.getAttribute('src')).toBe('/image/loading-loop.gif');
    expect(loader.alt).toBe('Storio');
    const slide = screen.getByTestId('recap-continue-slide') as HTMLElement;
    expect(slide.style.background).toBe('rgb(0, 0, 0)');
  });

  it('還沒翻到這一頁（active=false）時只顯示靜態 logo；翻到時換成全新的動畫元素，從第一格開始播一輪', () => {
    const { rerender } = render(<RecapContinueSlide copy={copy} onContinue={() => {}} active={false} />);
    const before = screen.getByTestId('recap-loader') as HTMLImageElement;
    expect(before.getAttribute('src')).toBe('/image/logo/logo.png');

    rerender(<RecapContinueSlide copy={copy} onContinue={() => {}} active />);
    const playing = screen.getByTestId('recap-loader') as HTMLImageElement;
    expect(playing.getAttribute('src')).toBe('/image/loading-loop.gif');
    expect(playing).not.toBe(before); // 新元素：GIF 才會從頭播

    rerender(<RecapContinueSlide copy={copy} onContinue={() => {}} active={false} />);
    expect((screen.getByTestId('recap-loader') as HTMLImageElement).getAttribute('src')).toBe('/image/logo/logo.png');
    rerender(<RecapContinueSlide copy={copy} onContinue={() => {}} active />);
    expect(screen.getByTestId('recap-loader')).not.toBe(playing); // 再翻回來也重新播
  });

  it('提前預載動畫素材（還沒翻到時就開始下載），翻到時不用等', () => {
    const sources: string[] = [];
    const OriginalImage = window.Image;
    class FakeImage {
      set src(value: string) {
        sources.push(value);
      }
    }
    window.Image = FakeImage as never;
    try {
      render(<RecapContinueSlide copy={copy} onContinue={() => {}} active={false} />);
      expect(sources).toContain('/image/loading-loop.gif');
    } finally {
      window.Image = OriginalImage;
    }
  });

  it('用戶開啟「減少動態效果」：改顯示靜態 logo，不播放動畫', () => {
    const original = window.matchMedia;
    window.matchMedia = ((q: string) => ({ matches: q.includes('reduce'), addListener: () => {}, removeListener: () => {} })) as never;
    try {
      render(<RecapContinueSlide copy={copy} onContinue={() => {}} />);
      expect((screen.getByTestId('recap-loader') as HTMLImageElement).getAttribute('src')).toBe('/image/logo/logo.png');
    } finally {
      window.matchMedia = original;
    }
  });

  it('顯示標語與「繼續收藏」，按下呼叫 onContinue（互動元素標記 data-no-nav，不會被當成換頁點擊）', () => {
    const onContinue = vi.fn();
    render(<RecapContinueSlide copy={copy} onContinue={onContinue} />);
    expect(screen.getByText(copy.scene.closing.tagline)).toBeTruthy();
    const button = screen.getByRole('button', { name: /繼續收藏/ });
    expect(button.closest('[data-no-nav]')).not.toBeNull();
    fireEvent.click(button);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('有 extra（訪客登入提示）時一併顯示，並標記 data-no-nav', () => {
    render(<RecapContinueSlide copy={copy} onContinue={() => {}} extra={<div data-testid="extra">登入提示</div>} />);
    expect(screen.getByTestId('extra').closest('[data-no-nav]')).not.toBeNull();
  });
});
