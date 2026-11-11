import { describe, it, expect } from 'vitest';
import { buildScenes, SCENE_ORDER } from '../scenes';
import { makeRecap, makeMinimalRecap } from './fixtures';

describe('buildScenes', () => {
  it('SCENE_ORDER 是固定的 15 個場景鍵', () => {
    expect(SCENE_ORDER).toEqual([
      'opening', 'total', 'movies', 'series', 'books', 'genres', 'story_age', 'title',
      'monthly', 'peak_month', 'months_active', 'top_rated', 'first_last', 'reflection', 'closing',
    ]);
  });

  it('分享：全部場景皆有資料 → 15 個且順序正確', () => {
    expect(buildScenes(makeRecap(), { forShare: true })).toEqual(SCENE_ORDER);
  });

  it('預覽：不含結尾場景（最後一頁是「繼續收藏」）', () => {
    const keys = buildScenes(makeRecap(), { forShare: false });
    expect(keys).toHaveLength(14);
    expect(keys).not.toContain('closing');
  });

  it('只有永遠存在的場景：預覽 [opening,total]，分享再加 closing', () => {
    const recap = makeMinimalRecap();
    expect(buildScenes(recap, { forShare: false })).toEqual(['opening', 'total']);
    expect(buildScenes(recap, { forShare: true })).toEqual(['opening', 'total', 'closing']);
  });

  it('null 場景一律跳過（monthly 與 months_active 各自獨立）', () => {
    const recap = makeRecap({ monthly: null, months_active: null, books: null, reflection: null });
    const keys = buildScenes(recap, { forShare: true });
    for (const skipped of ['monthly', 'months_active', 'books', 'reflection']) {
      expect(keys).not.toContain(skipped);
    }
    expect(keys).toContain('movies');
    expect(keys).toContain('peak_month');
  });
});
