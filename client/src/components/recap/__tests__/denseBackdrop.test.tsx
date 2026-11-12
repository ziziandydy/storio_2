// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

const m = vi.hoisted(() => ({ sizes: [] as string[] }));
vi.mock('../posterLoader', () => ({
  loadPoster: (path: string, opts: { size?: string }) => {
    m.sizes.push(opts?.size ?? 'default');
    return new Promise(() => {});
  },
}));

import { translations } from '@/i18n/locales';
import { makeRecap } from '@/lib/recap/__tests__/fixtures';
import SceneFrame from '../SceneFrame';
import RecapScene from '../RecapScene';

const remote = (n: number) => Array.from({ length: n }, (_, i) => `https://image.tmdb.org/t/p/w500/p${i}.jpg`);
const cols = (value: string) => Number(/repeat\((\d+),/.exec(value)?.[1]);

describe('密集海報牆（這一年你收藏了：盡可能排滿所有作品）', () => {
  beforeEach(() => {
    m.sizes.length = 0;
  });
  afterEach(cleanup);

  it('最多 48 張（建議上限：6 欄 × 8 列，每張約 67×89）', () => {
    render(<SceneFrame aspectRatio="9:16" posters={remote(60)}>x</SceneFrame>);
    expect(screen.getAllByTestId('scene-poster')).toHaveLength(48);
  });

  it('48 張在 9:16 排 6 欄；4:5（較矮）排 8 欄，每格接近海報比例', () => {
    const grid9 = render(<SceneFrame aspectRatio="9:16" posters={remote(48)}>x</SceneFrame>);
    expect(cols((screen.getAllByTestId('scene-poster')[0].parentElement as HTMLElement).style.gridTemplateColumns)).toBe(6);
    grid9.unmount();
    render(<SceneFrame aspectRatio="4:5" posters={remote(48)}>x</SceneFrame>);
    expect(cols((screen.getAllByTestId('scene-poster')[0].parentElement as HTMLElement).style.gridTemplateColumns)).toBe(8);
  });

  it('13 到 48 張都不留空格（最後一列用前面的海報補滿）', () => {
    for (let n = 13; n <= 48; n++) {
      const { unmount } = render(<SceneFrame aspectRatio="9:16" posters={remote(n)}>x</SceneFrame>);
      const tiles = screen.getAllByTestId('scene-poster');
      const c = cols((tiles[0].parentElement as HTMLElement).style.gridTemplateColumns);
      expect(tiles.length % c, `n=${n} cols=${c} tiles=${tiles.length}`).toBe(0);
      expect(tiles.length).toBeGreaterThanOrEqual(n);
      expect(tiles.length - n).toBeLessThan(c);
      unmount();
    }
  });

  it('超過 12 張時改用較小的縮圖（w154，可以接受解析度略差），12 張以內維持 w342', () => {
    render(<SceneFrame aspectRatio="9:16" posters={remote(20)}>x</SceneFrame>);
    expect(new Set(m.sizes)).toEqual(new Set(['w154']));
    cleanup();
    m.sizes.length = 0;
    render(<SceneFrame aspectRatio="9:16" posters={remote(6)}>x</SceneFrame>);
    expect(new Set(m.sizes)).toEqual(new Set(['w342']));
  });

  it('其他場景借用今年的海報當背景時只借前 6 張，不會都變成密集牆', () => {
    const total = { count: 30, minutes: 0, items_with_data: 0, estimated: false, posters: remote(30) };
    render(
      <RecapScene
        sceneKey="eras"
        recap={makeRecap({ total })}
        copy={translations['zh-TW'].recap}
        locale="zh-TW"
        aspectRatio="9:16"
        animate={false}
      />,
    );
    expect(screen.getAllByTestId('scene-poster').length).toBeLessThanOrEqual(6);
  });

  it('總數場景本身用全部海報', () => {
    const total = { count: 30, minutes: 100, items_with_data: 10, estimated: false, posters: remote(30) };
    render(
      <RecapScene
        sceneKey="total"
        recap={makeRecap({ total })}
        copy={translations['zh-TW'].recap}
        locale="zh-TW"
        aspectRatio="9:16"
        animate={false}
      />,
    );
    expect(screen.getAllByTestId('scene-poster').length).toBeGreaterThanOrEqual(30);
  });
});
