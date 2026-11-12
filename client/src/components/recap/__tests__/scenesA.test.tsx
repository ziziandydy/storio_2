// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { translations } from '@/i18n/locales';
import { makeRecap } from '@/lib/recap/__tests__/fixtures';
import OpeningScene from '../scenes/OpeningScene';
import TotalScene from '../scenes/TotalScene';
import MoviesScene from '../scenes/MoviesScene';
import SeriesScene from '../scenes/SeriesScene';
import BooksScene from '../scenes/BooksScene';

const zh = translations['zh-TW'].recap;
const en = translations['en-US'].recap;
const recap = makeRecap();
const base = { animate: false, year: 2026, isPartial: false, aspectRatio: '9:16' as const };

const text = (container: HTMLElement) => container.textContent ?? '';

afterEach(cleanup);

describe('OpeningScene', () => {
  it('顯示年份與標題', () => {
    const { container } = render(<OpeningScene {...base} data={recap.opening} copy={zh} locale="zh-TW" />);
    expect(text(container)).toContain('2026');
    expect(text(container)).toContain('你的 Storio 一年');
  });

  it('isPartial 時顯示「今年到目前為止」，否則不顯示', () => {
    const partial = render(<OpeningScene {...base} isPartial data={recap.opening} copy={zh} locale="zh-TW" />);
    expect(text(partial.container)).toContain('今年到目前為止');
    cleanup();
    const full = render(<OpeningScene {...base} data={recap.opening} copy={zh} locale="zh-TW" />);
    expect(text(full.container)).not.toContain('今年到目前為止');
  });
});

describe('場景標題（Eyebrow）', () => {
  it('字級至少 20px：「這一年，你收藏了」在手機上要看得清楚', () => {
    render(<TotalScene {...base} data={recap.total} copy={zh} locale="zh-TW" />);
    const title = screen.getByText('這一年，你收藏了') as HTMLElement;
    expect(parseInt(title.style.fontSize, 10)).toBeGreaterThanOrEqual(20);
  });
});

describe('數據型場景的大字', () => {
  it('長句平均換行（避免「故事」兩個字單獨一行）', () => {
    const { container } = render(<TotalScene {...base} data={recap.total} copy={zh} locale="zh-TW" />);
    const headline = container.querySelector('[data-testid="scene-total"] .text-\\[56px\\]') as HTMLElement;
    expect(headline.style.textWrap).toBe('balance');
  });
});

describe('TotalScene', () => {
  it('顯示作品總數與「至少 N 小時」', () => {
    const { container } = render(<TotalScene {...base} data={recap.total} copy={zh} locale="zh-TW" />);
    expect(text(container)).toContain('12');
    expect(text(container)).toContain('部作品');
    expect(text(container)).toContain('至少 65 小時');
  });

  it('estimated 時標示「估算」，否則不標', () => {
    const est = render(<TotalScene {...base} data={{ ...recap.total, estimated: true }} copy={zh} locale="zh-TW" />);
    expect(text(est.container)).toContain('估算');
    cleanup();
    const exact = render(<TotalScene {...base} data={{ ...recap.total, estimated: false }} copy={zh} locale="zh-TW" />);
    expect(text(exact.container)).not.toContain('估算');
  });

  it('items_with_data 為 0 時完全不顯示時間（不出現「小時」「分鐘」）', () => {
    const data = { ...recap.total, minutes: 0, items_with_data: 0, estimated: false };
    const { container } = render(<TotalScene {...base} data={data} copy={zh} locale="zh-TW" />);
    expect(text(container)).not.toContain('小時');
    expect(text(container)).not.toContain('分鐘');
  });

  it('英文版', () => {
    const { container } = render(<TotalScene {...base} data={recap.total} copy={en} locale="en-US" />);
    expect(text(container)).toContain('This year, you collected');
    expect(text(container)).toContain('At least 65 hours');
  });
});

describe('MoviesScene', () => {
  it('有底片邊，顯示部數與約多少小時', () => {
    const { container } = render(<MoviesScene {...base} data={recap.movies!} copy={zh} locale="zh-TW" />);
    expect(container.querySelector('[data-film-edge]')).not.toBeNull();
    expect(text(container)).toContain('5 部電影');
    expect(text(container)).toContain('約 10 小時');
  });

  it('沒有片長資料時不顯示時間', () => {
    const data = { ...recap.movies!, minutes: 0, items_with_data: 0 };
    const { container } = render(<MoviesScene {...base} data={data} copy={zh} locale="zh-TW" />);
    expect(text(container)).toContain('5 部電影');
    expect(text(container)).not.toContain('小時');
  });
});

describe('SeriesScene', () => {
  it('顯示部數、約多少集、約多少小時（估算）', () => {
    const { container } = render(<SeriesScene {...base} data={recap.series!} copy={zh} locale="zh-TW" />);
    expect(text(container)).toContain('4 部影集');
    expect(text(container)).toContain('約 80 集');
    expect(text(container)).toContain('約 33 小時（估算）');
  });

  it('集數為 0 時不顯示集數；沒有時間資料不顯示時間', () => {
    const data = { ...recap.series!, episodes: 0, minutes: 0, items_with_data: 0 };
    const { container } = render(<SeriesScene {...base} data={data} copy={zh} locale="zh-TW" />);
    expect(text(container)).toContain('4 部影集');
    expect(text(container)).not.toContain('約'); // 集數行與時間行都以「約」開頭
    expect(text(container)).not.toContain('小時');
  });
});

describe('BooksScene', () => {
  it('顯示本數、約多少頁、約多少小時（估算）', () => {
    const { container } = render(<BooksScene {...base} data={recap.books!} copy={zh} locale="zh-TW" />);
    expect(text(container)).toContain('3 本書');
    expect(text(container)).toContain('約 900 頁');
    expect(text(container)).toContain('約 22 小時（估算）');
  });

  it('頁數為 0 時不顯示頁數', () => {
    const data = { ...recap.books!, pages: 0, minutes: 0, items_with_data: 0 };
    const { container } = render(<BooksScene {...base} data={data} copy={zh} locale="zh-TW" />);
    expect(text(container)).toContain('3 本書');
    expect(text(container)).not.toContain('約'); // 頁數行與時間行都以「約」開頭
  });
});

describe('所有場景共通', () => {
  it('海報為空不報錯、有 scene-frame；4:5 高度 500；不出現 undefined／NaN', () => {
    const noPosters = { posters: [] };
    const scenes = [
      <OpeningScene key="o" {...base} aspectRatio="4:5" data={recap.opening} copy={zh} locale="zh-TW" />,
      <TotalScene key="t" {...base} aspectRatio="4:5" data={{ ...recap.total, ...noPosters }} copy={zh} locale="zh-TW" />,
      <MoviesScene key="m" {...base} aspectRatio="4:5" data={{ ...recap.movies!, ...noPosters }} copy={zh} locale="zh-TW" />,
      <SeriesScene key="s" {...base} aspectRatio="4:5" data={{ ...recap.series!, ...noPosters }} copy={zh} locale="zh-TW" />,
      <BooksScene key="b" {...base} aspectRatio="4:5" data={{ ...recap.books!, ...noPosters }} copy={zh} locale="zh-TW" />,
    ];
    for (const scene of scenes) {
      const { container } = render(scene);
      const frame = screen.getByTestId('scene-frame') as HTMLElement;
      expect(frame.style.height).toBe('500px');
      expect(text(container)).not.toContain('undefined');
      expect(text(container)).not.toContain('NaN');
      cleanup();
    }
  });
});
