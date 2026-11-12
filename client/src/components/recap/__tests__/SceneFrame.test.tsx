// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import SceneFrame from '../SceneFrame';
import { __resetPosterLoader } from '../posterLoader';
import { FakeImage } from './fakeImage';

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

  it('遠端海報：驗證載入成功前 <img> 沒有 src（不破圖），成功後直連 CDN 小尺寸、不帶 crossOrigin', async () => {
    FakeImage.install();
    __resetPosterLoader();
    try {
      render(<SceneFrame aspectRatio="9:16" posters={['https://image.tmdb.org/t/p/w500/a.jpg']}>x</SceneFrame>);
      const img = screen.getByTestId('scene-poster') as HTMLImageElement;
      expect(img.hasAttribute('src')).toBe(false);
      await waitFor(() => expect(img.getAttribute('src')).toBe('https://image.tmdb.org/t/p/w342/a.jpg'));
      expect(img.getAttribute('crossorigin')).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('同一批海報在多個場景重複出現時只真的載入一次', async () => {
    FakeImage.install();
    __resetPosterLoader();
    try {
      const posters = ['https://image.tmdb.org/t/p/w500/a.jpg', 'https://image.tmdb.org/t/p/w500/b.jpg'];
      render(
        <>
          <SceneFrame aspectRatio="9:16" posters={posters}>x</SceneFrame>
          <SceneFrame aspectRatio="9:16" posters={posters}>y</SceneFrame>
          <SceneFrame aspectRatio="4:5" posters={posters}>z</SceneFrame>
        </>,
      );
      await waitFor(() => expect(screen.getAllByTestId('scene-poster').every((i) => i.hasAttribute('src'))).toBe(true));
      expect(FakeImage.created).toHaveLength(2);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('預設海報（本機 svg）直接顯示', () => {
    render(<SceneFrame aspectRatio="9:16" posters={['/image/defaultMoviePoster.svg']}>x</SceneFrame>);
    const img = screen.getByTestId('scene-poster') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('/image/defaultMoviePoster.svg');
  });

  it('filmEdge 才有底片邊標記', () => {
    const { container, rerender } = render(<SceneFrame aspectRatio="9:16" filmEdge>x</SceneFrame>);
    expect(container.querySelector('[data-film-edge]')).not.toBeNull();
    rerender(<SceneFrame aspectRatio="9:16">x</SceneFrame>);
    expect(container.querySelector('[data-film-edge]')).toBeNull();
  });
});
