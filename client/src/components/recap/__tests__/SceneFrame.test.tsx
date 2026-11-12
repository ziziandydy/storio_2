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

  it('背景海報最多 48 張（總數場景的海報牆），沒有海報時不渲染海報', () => {
    const many = Array.from({ length: 60 }, (_, i) => `/image/p${i}.png`);
    const { rerender } = render(<SceneFrame aspectRatio="9:16" posters={many}>x</SceneFrame>);
    expect(screen.getAllByTestId('scene-poster')).toHaveLength(48);

    rerender(<SceneFrame aspectRatio="9:16" posters={[]}>x</SceneFrame>);
    expect(screen.queryAllByTestId('scene-poster')).toHaveLength(0);

    rerender(<SceneFrame aspectRatio="9:16">x</SceneFrame>);
    expect(screen.queryAllByTestId('scene-poster')).toHaveLength(0);
  });

  it('海報網格欄數：1 張滿版、2 張與 4 張兩欄、3／5～9 張三欄、10 張以上四欄', () => {
    const cols = (n: number) => {
      const posters = Array.from({ length: n }, (_, i) => `/image/p${i}.png`);
      const { unmount } = render(<SceneFrame aspectRatio="9:16" posters={posters}>x</SceneFrame>);
      const grid = screen.getAllByTestId('scene-poster')[0].parentElement as HTMLElement;
      const value = grid.style.gridTemplateColumns;
      unmount();
      return value;
    };
    expect([1, 2, 3, 4, 5, 6, 9, 10, 12].map(cols)).toEqual([
      'repeat(1, 1fr)', 'repeat(2, 1fr)', 'repeat(3, 1fr)', 'repeat(2, 1fr)',
      'repeat(3, 1fr)', 'repeat(3, 1fr)', 'repeat(3, 1fr)', 'repeat(4, 1fr)', 'repeat(4, 1fr)',
    ]);
  });

  it('海報網格不留空格：最後一列不滿時用前面的海報循環補滿', () => {
    const tiles = (n: number) => {
      const posters = Array.from({ length: n }, (_, i) => `/image/p${i}.png`);
      const { unmount } = render(<SceneFrame aspectRatio="9:16" posters={posters}>x</SceneFrame>);
      const found = screen.getAllByTestId('scene-poster').map((i) => i.getAttribute('data-poster'));
      unmount();
      return found;
    };
    expect(tiles(3)).toHaveLength(3); // 3 欄一列剛好
    expect(tiles(5)).toHaveLength(6); // 3 欄兩列，補 1 張
    expect(tiles(5)[5]).toBe('/image/p0.png'); // 從頭循環
    expect(tiles(7)).toHaveLength(9);
    expect(tiles(10)).toHaveLength(12);
    expect(tiles(12)).toHaveLength(12);
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

  it('沒有指定外框時沒有任何外框元素', () => {
    const { container } = render(<SceneFrame aspectRatio="9:16">x</SceneFrame>);
    expect(container.querySelector('[data-frame]')).toBeNull();
    expect(container.querySelector('[data-film-edge]')).toBeNull();
    expect(container.querySelector('[data-tv-bezel]')).toBeNull();
    expect(container.querySelector('[data-book-spine]')).toBeNull();
  });

  it('frame="film"：底片邊（左右各一條齒孔）', () => {
    const { container } = render(<SceneFrame aspectRatio="9:16" frame="film">x</SceneFrame>);
    expect(screen.getByTestId('scene-frame').getAttribute('data-frame')).toBe('film');
    expect(container.querySelectorAll('[data-film-edge]')).toHaveLength(2);
  });

  it('frame="tv"：電視螢幕外框（圓角螢幕、深色邊框、掃描線）', () => {
    const { container } = render(<SceneFrame aspectRatio="9:16" frame="tv">x</SceneFrame>);
    expect(screen.getByTestId('scene-frame').getAttribute('data-frame')).toBe('tv');
    const bezel = container.querySelector('[data-tv-bezel]') as HTMLElement;
    expect(bezel).not.toBeNull();
    expect(parseInt(bezel.style.borderRadius, 10)).toBeGreaterThanOrEqual(24);
    expect(bezel.style.backgroundImage).toContain('repeating-linear-gradient'); // 掃描線
    expect(container.querySelector('[data-film-edge]')).toBeNull();
  });

  it('frame="book"：書本外框（左側書脊、右側書頁邊）', () => {
    const { container } = render(<SceneFrame aspectRatio="9:16" frame="book">x</SceneFrame>);
    expect(screen.getByTestId('scene-frame').getAttribute('data-frame')).toBe('book');
    const spine = container.querySelector('[data-book-spine]') as HTMLElement;
    const pages = container.querySelector('[data-book-pages]') as HTMLElement;
    expect(spine).not.toBeNull();
    expect(pages).not.toBeNull();
    expect(spine.style.left).toBe('0px');
    expect(pages.style.right).toBe('0px');
    expect(container.querySelector('[data-film-edge]')).toBeNull();
  });

  it('heroLogo：放大成主視覺、放在內容層之外（混合模式才吃得到背景，不會有暗色圓盤），並取代角落小標誌', () => {
    const { rerender } = render(<SceneFrame aspectRatio="9:16" heroLogo={{ size: 270, top: 84 }}>x</SceneFrame>);
    const hero = screen.getByTestId('closing-logo') as HTMLImageElement;
    expect(hero.style.width).toBe('270px');
    expect(hero.style.top).toBe('84px');
    expect(hero.closest('[data-testid="scene-content"]')).toBeNull();
    expect(hero.style.mixBlendMode).toBe('screen');
    expect(screen.queryByTestId('scene-logo')).toBeNull();
    rerender(<SceneFrame aspectRatio="9:16">x</SceneFrame>);
    expect(screen.queryByTestId('closing-logo')).toBeNull();
    expect(screen.getByTestId('scene-logo')).toBeTruthy();
  });
});
