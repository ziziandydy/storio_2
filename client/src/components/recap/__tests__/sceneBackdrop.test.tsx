// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { translations } from '@/i18n/locales';
import { makeRecap } from '@/lib/recap/__tests__/fixtures';
import type { SceneKey } from '@/lib/recap/types';
import RecapScene from '../RecapScene';

const copy = translations['zh-TW'].recap;

function renderScene(key: SceneKey, overrides = {}, reflectionIndex = 0) {
  return render(
    <RecapScene
      sceneKey={key}
      recap={makeRecap(overrides)}
      copy={copy}
      locale="zh-TW"
      aspectRatio="9:16"
      animate={false}
      reflectionIndex={reflectionIndex}
    />,
  );
}

const bgSources = () =>
  screen.getAllByTestId('scene-poster').map((i) => decodeURIComponent(i.getAttribute('data-poster') ?? ''));
const bgUsed = (needle: string) => bgSources().some((src) => src.includes(needle));

describe('每個場景都有海報背景', () => {
  afterEach(cleanup);

  // 原本沒有自己海報資料的場景，改用「今年收藏的海報」（total.posters）當背景
  it.each(['eras', 'title', 'monthly', 'months_active', 'top_rated', 'first_last', 'reflection'] as SceneKey[])(
    '%s 場景有背景海報',
    (key) => {
      renderScene(key);
      expect(screen.getAllByTestId('scene-poster').length).toBeGreaterThan(0);
    },
  );

  it('有自己海報資料的場景仍用自己的（類別場景用類別海報，不被總數海報蓋掉）', () => {
    renderScene('genres');
    const srcs = screen.getAllByTestId('scene-poster').map((i) => i.getAttribute('src') ?? '');
    expect(srcs.some((s) => decodeURIComponent(s).includes('/d1.jpg'))).toBe(true);
    expect(srcs.some((s) => decodeURIComponent(s).includes('/a.jpg'))).toBe(false);
  });

  it('今年沒有任何海報時不出現背景（純黑底），也不崩潰', () => {
    renderScene('eras', { total: { count: 3, minutes: 0, items_with_data: 0, estimated: false, posters: [] } });
    expect(screen.queryAllByTestId('scene-poster')).toHaveLength(0);
  });
});


describe('各場景用「自己的」海報當背景', () => {
  afterEach(cleanup);

  it('收藏年代：用第一名年代的作品海報（後端給的 posters），不是總數海報', () => {
    renderScene('eras', { eras: { decades: [{ decade: 2010, count: 3 }], posters: ['/era1.jpg', '/era2.jpg'] } });
    expect(bgUsed('/era1.jpg')).toBe(true);
    expect(bgUsed('/a.jpg')).toBe(false);
  });

  it('每月故事節奏：用收藏最多那個月的海報', () => {
    renderScene('monthly', { monthly: { counts: [0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0], posters: ['/mar1.jpg'] } });
    expect(bgUsed('/mar1.jpg')).toBe(true);
    expect(bgUsed('/a.jpg')).toBe(false);
  });

  it('這一年有 N 個月：每個有收藏的月份一張海報', () => {
    renderScene('months_active', { months_active: { count: 3, posters: ['/m1.jpg', '/m2.jpg', '/m3.jpg'] } });
    expect(bgSources()).toHaveLength(3);
    expect(bgUsed('/m2.jpg')).toBe(true);
  });

  it('稱號：用「讓你得到這個稱號」的作品海報', () => {
    renderScene('title', { title: { id: 'joy_maker', zh: '快樂製造機', en: 'The Joy Maker', posters: ['/src1.jpg'] } });
    expect(bgUsed('/src1.jpg')).toBe(true);
    expect(bgUsed('/a.jpg')).toBe(false);
  });

  it('這一年的起點：背景是第一部與最近一部作品的海報', () => {
    renderScene('first_last', {
      first_last: {
        first: { title: '第一部', poster_path: '/first.jpg', date: '2026-01-03' },
        last: { title: '最近一部', poster_path: '/last.jpg', date: '2026-11-09' },
      },
    });
    expect(bgSources()).toHaveLength(2);
    expect(bgUsed('/first.jpg')).toBe(true);
    expect(bgUsed('/last.jpg')).toBe(true);
  });

  it('這一年的起點：其中一部沒有海報就只用另一部；兩部都沒有退回今年的海報', () => {
    renderScene('first_last', {
      first_last: {
        first: { title: '甲', poster_path: null, date: '2026-01-03' },
        last: { title: '乙', poster_path: '/last.jpg', date: '2026-11-09' },
      },
    });
    expect(bgSources()).toHaveLength(1);
    cleanup();
    renderScene('first_last', {
      first_last: {
        first: { title: '甲', poster_path: null, date: '2026-01-03' },
        last: { title: '乙', poster_path: null, date: '2026-11-09' },
      },
    });
    expect(bgUsed('/a.jpg')).toBe(true);
  });

  it('你寫下的話：背景是這則心得那部作品的海報，按「換一句」換成另一部', () => {
    const reflection = {
      count: 2,
      candidates: [
        { id: 'r1', title: 'A', poster_path: '/refl-a.jpg', rating: 9, text: '很棒' },
        { id: 'r2', title: 'B', poster_path: '/refl-b.jpg', rating: 0, text: '還行' },
      ],
    };
    renderScene('reflection', { reflection }, 0);
    expect(bgSources()).toHaveLength(1);
    expect(bgUsed('/refl-a.jpg')).toBe(true);
    cleanup();
    renderScene('reflection', { reflection }, 1);
    expect(bgUsed('/refl-b.jpg')).toBe(true);
    expect(bgUsed('/refl-a.jpg')).toBe(false);
  });

  it('你寫下的話：那部作品沒有海報就退回今年的海報', () => {
    renderScene('reflection', {
      reflection: { count: 1, candidates: [{ id: 'r1', title: 'A', poster_path: null, rating: 0, text: '嗯' }] },
    });
    expect(bgUsed('/a.jpg')).toBe(true);
  });
});
