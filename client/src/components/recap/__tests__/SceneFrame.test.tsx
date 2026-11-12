// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import SceneFrame from '../SceneFrame';

describe('SceneFrame', () => {
  afterEach(cleanup);

  it('9:16 固定 400×711、4:5 固定 400×500', () => {
    const { rerender } = render(<SceneFrame aspectRatio="9:16">x</SceneFrame>);
    let style = (screen.getByTestId('scene-frame') as HTMLElement).style;
    expect([style.width, style.height]).toEqual(['400px', '711px']);

    rerender(<SceneFrame aspectRatio="4:5">x</SceneFrame>);
    style = (screen.getByTestId('scene-frame') as HTMLElement).style;
    expect([style.width, style.height]).toEqual(['400px', '500px']);
  });

  it('Storio 標誌置中在最上方（標題之上），不再擠在右上角', () => {
    render(<SceneFrame aspectRatio="9:16">x</SceneFrame>);
    const logo = screen.getByTestId('scene-logo') as HTMLImageElement;
    expect(logo.getAttribute('src')).toBe('/image/logo/logo.png');
    expect(logo.alt).toBe('Storio');
    expect(logo.style.left).toBe('50%');
    expect(logo.style.transform).toContain('translateX(-50%)');
    expect(logo.style.right).toBe('');
    expect(parseInt(logo.style.width, 10)).toBeGreaterThanOrEqual(36);
  });

  it('海報背景要清楚（不透明度 ≥ 0.75），並用文字襯底與陰影維持文字可讀', () => {
    render(<SceneFrame aspectRatio="9:16" posters={['/image/p.png']}>x</SceneFrame>);
    const grid = screen.getByTestId('scene-poster').parentElement as HTMLElement;
    expect(parseFloat(grid.style.opacity)).toBeGreaterThanOrEqual(0.75);
    expect(screen.getByTestId('scene-scrim')).toBeTruthy();
    const content = screen.getByTestId('scene-content') as HTMLElement;
    expect(content.style.textShadow).not.toBe('');
  });

  it('渲染 children', () => {
    render(<SceneFrame aspectRatio="9:16"><span>內容</span></SceneFrame>);
    expect(screen.getByText('內容')).toBeTruthy();
  });

  it('背景海報最多 6 張，沒有海報時不渲染海報', () => {
    const many = Array.from({ length: 9 }, (_, i) => `/image/p${i}.png`);
    const { rerender } = render(<SceneFrame aspectRatio="9:16" posters={many}>x</SceneFrame>);
    expect(screen.getAllByTestId('scene-poster')).toHaveLength(6);

    rerender(<SceneFrame aspectRatio="9:16" posters={[]}>x</SceneFrame>);
    expect(screen.queryAllByTestId('scene-poster')).toHaveLength(0);

    rerender(<SceneFrame aspectRatio="9:16">x</SceneFrame>);
    expect(screen.queryAllByTestId('scene-poster')).toHaveLength(0);
  });

  it('海報載入失敗會自動重試（最多 2 次、網址帶重試參數、間隔後才重送），不會一直破圖', () => {
    vi.useFakeTimers();
    try {
      render(<SceneFrame aspectRatio="9:16" posters={['https://image.tmdb.org/t/p/w500/a.jpg']}>x</SceneFrame>);
      const img = () => screen.getByTestId('scene-poster') as HTMLImageElement;
      const original = img().getAttribute('src') as string;
      expect(original).not.toContain('retry=');

      fireEvent.error(img());
      expect(img().getAttribute('src')).toBe(original); // 還沒到重試時間
      act(() => {
        vi.advanceTimersByTime(800);
      });
      expect(img().getAttribute('src')).toContain('retry=1');

      fireEvent.error(img());
      act(() => {
        vi.advanceTimersByTime(800);
      });
      expect(img().getAttribute('src')).toContain('retry=2');

      fireEvent.error(img()); // 超過上限：不再重試
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(img().getAttribute('src')).toContain('retry=2');
    } finally {
      vi.useRealTimers();
    }
  });

  it('預設海報（本機 svg）不重試', () => {
    vi.useFakeTimers();
    try {
      render(<SceneFrame aspectRatio="9:16" posters={['/image/defaultMoviePoster.svg']}>x</SceneFrame>);
      const img = screen.getByTestId('scene-poster') as HTMLImageElement;
      const before = img.getAttribute('src');
      fireEvent.error(img);
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(img.getAttribute('src')).toBe(before);
    } finally {
      vi.useRealTimers();
    }
  });

  it('filmEdge 才有底片邊標記', () => {
    const { container, rerender } = render(<SceneFrame aspectRatio="9:16" filmEdge>x</SceneFrame>);
    expect(container.querySelector('[data-film-edge]')).not.toBeNull();
    rerender(<SceneFrame aspectRatio="9:16">x</SceneFrame>);
    expect(container.querySelector('[data-film-edge]')).toBeNull();
  });
});
