// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { translations } from '@/i18n/locales';
import RecapContinueSlide from '../RecapContinueSlide';

const copy = translations['zh-TW'].recap;

describe('RecapContinueSlide（最後一頁）', () => {
  afterEach(cleanup);

  it('標誌有轉圈與呼吸的載入動畫，並尊重「減少動態效果」', () => {
    const { container } = render(<RecapContinueSlide copy={copy} onContinue={() => {}} />);
    const ring = screen.getByTestId('recap-loader-ring') as HTMLElement;
    const logo = screen.getByTestId('recap-loader-logo') as HTMLImageElement;
    expect(ring.className).toContain('recap-loader-ring');
    expect(logo.getAttribute('src')).toBe('/image/logo/logo.png');
    const css = container.querySelector('style')?.textContent ?? '';
    expect(css).toContain('@keyframes recap-spin');
    expect(css).toContain('@keyframes recap-breathe');
    expect(css).toContain('prefers-reduced-motion');
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
