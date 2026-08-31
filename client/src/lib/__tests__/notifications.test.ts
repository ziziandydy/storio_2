import { describe, it, expect } from 'vitest';
import { interpolate } from '@/lib/notifications';
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
