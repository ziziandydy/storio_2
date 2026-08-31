import { describe, it, expect } from 'vitest';
import { interpolate } from '@/lib/notifications';

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
