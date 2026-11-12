// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { translations } from '@/i18n/locales';
import { makeRecap } from '@/lib/recap/__tests__/fixtures';
import GenresScene from '../scenes/GenresScene';
import EraScene from '../scenes/EraScene';
import TitleScene from '../scenes/TitleScene';
import MonthlyScene from '../scenes/MonthlyScene';
import PeakMonthScene from '../scenes/PeakMonthScene';

const zh = translations['zh-TW'].recap;
const en = translations['en-US'].recap;
const recap = makeRecap();
const base = { animate: false, year: 2026, isPartial: false, aspectRatio: '9:16' as const };
const text = (c: HTMLElement) => c.textContent ?? '';

afterEach(cleanup);

describe('GenresScene', () => {
  it('顯示三個類別名稱與部數，長條以第一名為 100%', () => {
    const { container } = render(<GenresScene {...base} data={recap.genres!} copy={zh} locale="zh-TW" />);
    for (const name of ['Drama', 'Crime', 'Comedy']) expect(text(container)).toContain(name);
    expect(text(container)).toContain('6 部');
    const widths = screen.getAllByTestId('genre-bar').map((el) => (el as HTMLElement).style.width);
    expect(widths).toEqual(['100%', '67%', '33%']);
  });

  it('只有 1 筆類別時只渲染 1 條', () => {
    const data = { top: [{ name: 'Drama', count: 3 }], posters: [] };
    render(<GenresScene {...base} data={data} copy={zh} locale="zh-TW" />);
    expect(screen.getAllByTestId('genre-bar')).toHaveLength(1);
  });
});

describe('EraScene（年代分佈）', () => {
  const data = {
    decades: [
      { decade: 1990, count: 2 },
      { decade: 2000, count: 1 },
      { decade: 2010, count: 4 },
    ],
  };
  const rows = (container: HTMLElement) => Array.from(container.querySelectorAll('[data-testid="era-row"]')).map((r) => r.textContent ?? '');

  it('依年代由舊到新列出每個十年的部數（中文）', () => {
    const { container } = render(<EraScene {...base} data={data} copy={zh} locale="zh-TW" />);
    expect(text(container)).toContain('你收藏的年代');
    expect(rows(container)).toEqual(['1990–19992 部作品', '2000–20091 部作品', '2010–20194 部作品']);
  });

  it('英文版', () => {
    const { container } = render(<EraScene {...base} data={data} copy={en} locale="en-US" />);
    expect(rows(container)).toEqual(['1990–19992 stories', '2000–20091 stories', '2010–20194 stories']);
  });

  it('長條依部數比例，最多的是滿格', () => {
    const { container } = render(<EraScene {...base} data={data} copy={zh} locale="zh-TW" />);
    const widths = Array.from(container.querySelectorAll('[data-testid="era-bar"]')).map((b) => (b as HTMLElement).style.width);
    expect(widths).toEqual(['50%', '25%', '100%']);
  });

  it('超過 6 個十年：最舊的合併成一列「更早」，部數相加，其餘保留', () => {
    const many = {
      decades: [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020].map((decade, i) => ({ decade, count: i + 1 })),
    };
    const { container } = render(<EraScene {...base} data={many} copy={zh} locale="zh-TW" />);
    const r = rows(container);
    expect(r).toHaveLength(6);
    expect(r[0]).toBe('1980 年以前6 部作品'); // 1+2+3
    expect(r[1]).toBe('1980–19894 部作品');
    expect(r[5]).toBe('2020–20298 部作品');
  });

  it('剛好 6 個十年不合併', () => {
    const six = { decades: [1970, 1980, 1990, 2000, 2010, 2020].map((decade) => ({ decade, count: 1 })) };
    const { container } = render(<EraScene {...base} data={six} copy={zh} locale="zh-TW" />);
    expect(rows(container)).toHaveLength(6);
    expect(text(container)).not.toContain('以前');
  });
});

describe('TitleScene', () => {
  const data = { id: 'joy_maker', zh: '快樂製造機', en: 'The Joy Maker' };

  it('zh-TW 顯示中文稱號，en-US 顯示英文稱號', () => {
    const a = render(<TitleScene {...base} data={data} copy={zh} locale="zh-TW" />);
    expect(text(a.container)).toContain('快樂製造機');
    expect(text(a.container)).not.toContain('The Joy Maker');
    cleanup();
    const b = render(<TitleScene {...base} data={data} copy={en} locale="en-US" />);
    expect(text(b.container)).toContain('The Joy Maker');
    expect(text(b.container)).not.toContain('快樂製造機');
  });

  it('有「你的稱號」眉標', () => {
    const { container } = render(<TitleScene {...base} data={data} copy={zh} locale="zh-TW" />);
    expect(text(container)).toContain('你的稱號');
  });
});

describe('MonthlyScene', () => {
  it('渲染 12 根長條與月份標籤，最高月帶 data-peak', () => {
    const { container } = render(<MonthlyScene {...base} data={recap.monthly!} copy={zh} locale="zh-TW" />);
    expect(screen.getAllByTestId('month-bar')).toHaveLength(12);
    expect(text(container)).toContain('1 月');
    expect(text(container)).toContain('12 月');
    const peaks = screen.getAllByTestId('month-bar').filter((el) => el.hasAttribute('data-peak'));
    expect(peaks).toHaveLength(1);
    expect(peaks[0].getAttribute('data-month')).toBe('11'); // counts 的最大值在 11 月（4 部）
  });

  it('counts 全為 0 不報錯（不出現 NaN）', () => {
    const data = { counts: Array(12).fill(0) };
    const { container } = render(<MonthlyScene {...base} data={data} copy={zh} locale="zh-TW" />);
    expect(screen.getAllByTestId('month-bar')).toHaveLength(12);
    expect(text(container)).not.toContain('NaN');
    expect((screen.getAllByTestId('month-bar')[0] as HTMLElement).style.height).not.toContain('NaN');
  });
});

describe('PeakMonthScene', () => {
  it('顯示月份名稱與部數', () => {
    const data = { month: 3, count: 5, posters: [] };
    const { container } = render(<PeakMonthScene {...base} data={data} copy={zh} locale="zh-TW" />);
    expect(text(container)).toContain('最投入的月份');
    expect(text(container)).toContain('3 月');
    expect(text(container)).toContain('收藏了 5 部');
  });

  it('英文版用月份縮寫', () => {
    const data = { month: 3, count: 5, posters: [] };
    const { container } = render(<PeakMonthScene {...base} data={data} copy={en} locale="en-US" />);
    expect(text(container)).toContain('Mar');
    expect(text(container)).toContain('5 stories');
  });
});

describe('場景（二）共通', () => {
  it('不出現 undefined／NaN，4:5 高度 500', () => {
    const scenes = [
      <GenresScene key="g" {...base} aspectRatio="4:5" data={recap.genres!} copy={zh} locale="zh-TW" />,
      <EraScene key="s" {...base} aspectRatio="4:5" data={recap.eras!} copy={zh} locale="zh-TW" />,
      <TitleScene key="t" {...base} aspectRatio="4:5" data={recap.title!} copy={zh} locale="zh-TW" />,
      <MonthlyScene key="m" {...base} aspectRatio="4:5" data={recap.monthly!} copy={zh} locale="zh-TW" />,
      <PeakMonthScene key="p" {...base} aspectRatio="4:5" data={recap.peak_month!} copy={zh} locale="zh-TW" />,
    ];
    for (const scene of scenes) {
      const { container } = render(scene);
      expect((screen.getByTestId('scene-frame') as HTMLElement).style.height).toBe('500px');
      expect(text(container)).not.toContain('undefined');
      expect(text(container)).not.toContain('NaN');
      cleanup();
    }
  });
});
