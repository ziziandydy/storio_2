// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import SceneFrame from '../SceneFrame';

/**
 * 海報上的文字可讀性。問題主因是海報自己的細節（大字、人臉、高對比邊緣）與場景文字互相干擾，
 * 不是整體太亮：所以在文字所在的中央帶狀區域做「失焦＋壓暗」（邊緣羽化，海報上下端維持清楚），
 * 再加上次要文字不可太淡（≥ 80% 不透明度）。
 */
describe('海報背景上的文字可讀性', () => {
  afterEach(cleanup);

  it('有海報時，文字帶（中央）有羽化的失焦壓暗層；沒有海報（純黑底）不需要', () => {
    const { rerender } = render(<SceneFrame aspectRatio="9:16" posters={['/image/p.png']}>x</SceneFrame>);
    const focus = screen.getByTestId('scene-focus') as HTMLElement;
    expect(focus.getAttribute('data-focus-blur')).toMatch(/^\d+px$/);
    expect(parseInt(focus.getAttribute('data-focus-blur') ?? '0', 10)).toBeGreaterThanOrEqual(8);
    rerender(<SceneFrame aspectRatio="9:16">x</SceneFrame>);
    expect(screen.queryByTestId('scene-focus')).toBeNull();
  });

  it('失焦層在文字層之下、海報之上（不蓋住文字）', () => {
    render(<SceneFrame aspectRatio="9:16" posters={['/image/p.png']}>x</SceneFrame>);
    const focusZ = Number((screen.getByTestId('scene-focus') as HTMLElement).style.zIndex || 0);
    const contentZ = Number((screen.getByTestId('scene-content') as HTMLElement).style.zIndex || 0);
    expect(focusZ).toBeLessThan(contentZ);
  });

  it('場景元件裡的文字顏色不透明度至少 80%（text-white/NN），小字至少 11px', () => {
    const dir = join(process.cwd(), 'src/components/recap/scenes');
    const offenders: string[] = [];
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.tsx'))) {
      const source = readFileSync(join(dir, file), 'utf-8');
      for (const m of source.matchAll(/text-white\/(\d+)/g)) {
        if (Number(m[1]) < 80) offenders.push(`${file}: text-white/${m[1]}`);
      }
      for (const m of source.matchAll(/text-\[(\d+)px\]/g)) {
        if (Number(m[1]) < 11) offenders.push(`${file}: text-[${m[1]}px]`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
