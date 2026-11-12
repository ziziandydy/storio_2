// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { translations } from '@/i18n/locales';
import { makeRecap } from '@/lib/recap/__tests__/fixtures';
import type { SceneKey } from '@/lib/recap/types';
import RecapScene from '../RecapScene';

const copy = translations['zh-TW'].recap;

function renderScene(key: SceneKey, overrides = {}) {
  return render(
    <RecapScene sceneKey={key} recap={makeRecap(overrides)} copy={copy} locale="zh-TW" aspectRatio="9:16" animate={false} />,
  );
}

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
