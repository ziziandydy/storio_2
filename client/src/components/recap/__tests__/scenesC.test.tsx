// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { translations } from '@/i18n/locales';
import { makeRecap } from '@/lib/recap/__tests__/fixtures';
import { SCENE_ORDER } from '@/lib/recap/scenes';
import { reflectionText } from '@/lib/recap/reflection';
import MonthsActiveScene from '../scenes/MonthsActiveScene';
import TopRatedScene from '../scenes/TopRatedScene';
import FirstLastScene from '../scenes/FirstLastScene';
import ReflectionScene from '../scenes/ReflectionScene';
import RecapScene from '../RecapScene';

const zh = translations['zh-TW'].recap;
const recap = makeRecap();
const base = { animate: false, year: 2026, isPartial: false, aspectRatio: '9:16' as const };
const text = (c: HTMLElement) => c.textContent ?? '';

afterEach(cleanup);

describe('MonthsActiveScene', () => {
  it('顯示「這一年有 N 個月留下了故事」', () => {
    const { container } = render(<MonthsActiveScene {...base} data={recap.months_active!} copy={zh} locale="zh-TW" />);
    expect(text(container)).toContain('這一年有 6 個月留下了故事');
  });
});

describe('TopRatedScene', () => {
  it('顯示最高分與幾部', () => {
    const { container } = render(<TopRatedScene {...base} data={recap.top_rated!} copy={zh} locale="zh-TW" />);
    expect(text(container)).toContain('10/10');
    expect(text(container)).toContain('2 部作品拿下你的最高分');
  });

  it('只有 1 部用單數文案', () => {
    const data = { ...recap.top_rated!, count: 1 };
    const { container } = render(<TopRatedScene {...base} data={data} copy={zh} locale="zh-TW" />);
    expect(text(container)).toContain('1 部作品拿下你的最高分');
  });

  it('海報最多 3 張（傳 5 筆只渲染 3 個）', () => {
    const items = Array.from({ length: 5 }, (_, i) => ({ title: `T${i}`, poster_path: `/image/p${i}.png` }));
    render(<TopRatedScene {...base} data={{ ...recap.top_rated!, items }} copy={zh} locale="zh-TW" />);
    expect(screen.getAllByTestId('top-rated-poster')).toHaveLength(3);
  });

  it('沒有海報不報錯（用預設海報）', () => {
    const items = [{ title: 'T', poster_path: null }];
    render(<TopRatedScene {...base} data={{ ...recap.top_rated!, items }} copy={zh} locale="zh-TW" />);
    const img = screen.getByTestId('top-rated-poster') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('/image/defaultMoviePoster.svg');
  });
});

describe('FirstLastScene', () => {
  it('顯示年度第一部與最近一部的標題與日期', () => {
    const { container } = render(<FirstLastScene {...base} data={recap.first_last!} copy={zh} locale="zh-TW" />);
    expect(text(container)).toContain('年度第一部');
    expect(text(container)).toContain('最近一部');
    expect(text(container)).toContain('First');
    expect(text(container)).toContain('Last');
    expect(text(container)).toContain('2026');
  });

  it('標題或日期為 null 不報錯、不出現 null／undefined 字樣', () => {
    const data = {
      first: { title: null, poster_path: null, date: null },
      last: { title: 'Last', poster_path: null, date: null },
    };
    const { container } = render(<FirstLastScene {...base} data={data} copy={zh} locale="zh-TW" />);
    expect(text(container)).not.toContain('null');
    expect(text(container)).not.toContain('undefined');
  });
});

describe('ReflectionScene', () => {
  it('預設顯示第一則：引文、作品名、評分', () => {
    const { container } = render(<ReflectionScene {...base} data={recap.reflection!} copy={zh} locale="zh-TW" />);
    expect(text(container)).toContain('很棒');
    expect(text(container)).toContain('T1');
    expect(text(container)).toContain('9/10');
  });

  it('reflectionIndex 選擇第二則；越界退回第一則', () => {
    const a = render(<ReflectionScene {...base} reflectionIndex={1} data={recap.reflection!} copy={zh} locale="zh-TW" />);
    expect(text(a.container)).toContain('還行');
    cleanup();
    const b = render(<ReflectionScene {...base} reflectionIndex={99} data={recap.reflection!} copy={zh} locale="zh-TW" />);
    expect(text(b.container)).toContain('很棒');
  });

  it('評分 0 不顯示「/10」', () => {
    const { container } = render(<ReflectionScene {...base} reflectionIndex={1} data={recap.reflection!} copy={zh} locale="zh-TW" />);
    expect(text(container)).not.toContain('/10');
  });

  it('顯示寫了幾則心得（1 則用單數文案）', () => {
    const many = render(<ReflectionScene {...base} data={recap.reflection!} copy={zh} locale="zh-TW" />);
    expect(text(many.container)).toContain('寫了 2 則心得');
    cleanup();
    const one = render(
      <ReflectionScene {...base} data={{ count: 1, candidates: [recap.reflection!.candidates[0]] }} copy={zh} locale="zh-TW" />
    );
    expect(text(one.container)).toContain('寫下了一則心得');
  });
});

describe('reflectionText', () => {
  it('依索引取引文；越界回第一則；沒有候選回 null', () => {
    expect(reflectionText(recap, 1)).toBe('還行');
    expect(reflectionText(recap, 99)).toBe('很棒');
    expect(reflectionText(makeRecap({ reflection: null }), 0)).toBeNull();
    expect(reflectionText(makeRecap({ reflection: { count: 0, candidates: [] } }), 0)).toBeNull();
  });
});

describe('RecapScene 分派元件', () => {
  const props = { recap, copy: zh, locale: 'zh-TW' as const, aspectRatio: '9:16' as const, animate: false };

  it('場景欄位為 null 時回傳 null（不渲染空框）', () => {
    const { container } = render(<RecapScene {...props} recap={makeRecap({ movies: null })} sceneKey="movies" />);
    expect(container.firstChild).toBeNull();
  });

  it('除結尾外，每個有資料的場景鍵都渲染出 scene-frame', () => {
    for (const key of SCENE_ORDER.filter((k) => k !== 'closing')) {
      const { container } = render(<RecapScene {...props} sceneKey={key} />);
      expect(container.querySelector('[data-testid="scene-frame"]'), key).not.toBeNull();
      cleanup();
    }
  });

  it('結尾場景也渲染出 scene-frame（2B）', () => {
    const { container } = render(<RecapScene {...props} sceneKey="closing" />);
    expect(container.querySelector('[data-testid="scene-frame"]')).not.toBeNull();
  });

  it('reflectionIndex 傳到心得場景', () => {
    const { container } = render(<RecapScene {...props} sceneKey="reflection" reflectionIndex={1} />);
    expect(text(container)).toContain('還行');
  });

  it('isPartial 與年份來自 recap 資料', () => {
    const { container } = render(<RecapScene {...props} recap={makeRecap({ is_partial: true })} sceneKey="opening" />);
    expect(text(container)).toContain('今年到目前為止');
    expect(text(container)).toContain('2026');
  });
});
