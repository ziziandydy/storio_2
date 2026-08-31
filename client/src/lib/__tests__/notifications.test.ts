import { describe, it, expect, vi, afterEach } from 'vitest';
import { interpolate, getOptimalHour, applyBlackout, fetchNotificationState } from '@/lib/notifications';
import { CHURN_TIERS, CHURN_MESSAGE_VARIANTS } from '@/lib/notification-config';

describe('interpolate', () => {
  it('替換 {username}（有值時）', () => {
    const result = interpolate('{username}，已經一週沒有更新Storio了', {
      username: '小明',
      collectionCount: 0,
      lastTitle: null,
    });
    expect(result).toBe('小明，已經一週沒有更新Storio了');
  });

  it('{username} 為空字串時，移除開頭的「{username}，」前綴', () => {
    const result = interpolate('{username}，已經一週沒有更新Storio了', {
      username: '',
      collectionCount: 0,
      lastTitle: null,
    });
    expect(result).toBe('已經一週沒有更新Storio了');
  });

  it('{username} 為空字串時，移除開頭的「{username}, 」英文前綴（含空白）', () => {
    const result = interpolate("{username}, it's been a week since your last update", {
      username: '',
      collectionCount: 0,
      lastTitle: null,
    });
    expect(result).toBe("it's been a week since your last update");
  });

  it('替換 {collectionCount}', () => {
    const result = interpolate('你已典藏了{collectionCount}個故事', {
      username: '',
      collectionCount: 42,
      lastTitle: null,
    });
    expect(result).toBe('你已典藏了42個故事');
  });

  it('{lastTitle} 有值時正確代入', () => {
    const result = interpolate('三個月了，我還留著你上次收藏的《{lastTitle}》，你呢？', {
      username: '',
      collectionCount: 0,
      lastTitle: '進擊的巨人',
    });
    expect(result).toBe('三個月了，我還留著你上次收藏的《進擊的巨人》，你呢？');
  });

  it('模板需要 {lastTitle} 但值為 null 時，回傳 null（該變體應被排除）', () => {
    const result = interpolate('三個月了，我還留著你上次收藏的《{lastTitle}》，你呢？', {
      username: '',
      collectionCount: 0,
      lastTitle: null,
    });
    expect(result).toBeNull();
  });

  it('不含任何 placeholder 的模板原樣回傳', () => {
    const result = interpolate('這兩天有看了什麼新的書籍、電影或影集嗎？📚🎬🍿', {
      username: '',
      collectionCount: 0,
      lastTitle: null,
    });
    expect(result).toBe('這兩天有看了什麼新的書籍、電影或影集嗎？📚🎬🍿');
  });
});

describe('CHURN_TIERS / CHURN_MESSAGE_VARIANTS', () => {
  it('共有 7 層，天數遞增且符合規格', () => {
    expect(CHURN_TIERS.map(t => t.days)).toEqual([3, 7, 14, 30, 60, 90, 180]);
  });

  it('每層在 zh-TW 與 en-US 都恰好有 2 則變體', () => {
    for (const tier of CHURN_TIERS) {
      expect(CHURN_MESSAGE_VARIANTS['zh-TW'][tier.key]).toHaveLength(2);
      expect(CHURN_MESSAGE_VARIANTS['en-US'][tier.key]).toHaveLength(2);
    }
  });
});

describe('getOptimalHour', () => {
  it('type 為 come_back 時，資料不足回傳 fallback hour', () => {
    expect(getOptimalHour('come_back')).toBe(21);
  });

  it('type 為 folio_reflection 時，資料不足回傳 fallback hour', () => {
    expect(getOptimalHour('folio_reflection')).toBe(20);
  });
});

describe('applyBlackout', () => {
  it('落在 00:00–07:59 的小時，推延到 BLACKOUT_END_HOUR (8)', () => {
    expect(applyBlackout(0)).toBe(8);
    expect(applyBlackout(3)).toBe(8);
    expect(applyBlackout(7)).toBe(8);
  });

  it('落在 08:00–23:59 的小時，原樣回傳', () => {
    expect(applyBlackout(8)).toBe(8);
    expect(applyBlackout(21)).toBe(21);
    expect(applyBlackout(23)).toBe(23);
  });
});

describe('fetchNotificationState', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('API 回傳空陣列時回傳 defaultState（不含 lastMediaType/daysSinceLastLog 欄位）', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ groups: [] }),
    }) as any;

    const state = await fetchNotificationState('token', 'Tina', 'zh-TW', true, true, true);

    expect(state).toEqual({
      username: 'Tina',
      lastTitle: null,
      collectionCount: 0,
      hasUnratedItemsWithin14Days: false,
      daysSinceLastReflection: 0,
      language: 'zh-TW',
      notifEnabled: true,
      notifComeBack: true,
      notifFolioReflection: true,
    });
  });

  it('有收藏資料時正確計算 collectionCount 與 lastTitle', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        groups: [{
          instances: [
            { title: '進擊的巨人', media_type: 'tv', created_at: new Date().toISOString(), rating: 5, notes: '' },
            { title: '花束般的戀愛', media_type: 'movie', created_at: new Date(Date.now() - 86400000).toISOString(), rating: 0, notes: '' },
          ],
        }],
      }),
    }) as any;

    const state = await fetchNotificationState('token', 'Tina', 'zh-TW', true, true, true);

    expect(state.collectionCount).toBe(2);
    expect(state.lastTitle).toBe('進擊的巨人');
    expect(state.hasUnratedItemsWithin14Days).toBe(true);
  });
});
