import { describe, it, expect } from 'vitest';
import { translations } from '../locales';

const locales = ['zh-TW', 'en-US'] as const;
const paths = [
  'firstCollect.eyebrow',
  'firstCollect.title',
  'firstCollect.searchButton',
  'firstCollect.hint',
  'guestSave.title',
  'guestSave.body',
  'guestSave.later',
  'modals.successTitle',
  'onboardingGuide.getStarted',
];

const get = (obj: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], obj);

describe('首次收藏文案', () => {
  for (const locale of locales) {
    for (const p of paths) {
      it(`${locale} 具備非空的 ${p}`, () => {
        const v = get(translations[locale], p);
        expect(typeof v).toBe('string');
        expect((v as string).trim().length).toBeGreaterThan(0);
      });
    }
  }

  it('成功標題在地化', () => {
    expect(get(translations['zh-TW'], 'modals.successTitle')).toBe('收藏成功');
    expect(get(translations['en-US'], 'modals.successTitle')).toBe('Saved');
  });

  it('學習卡最後按鈕為新文案', () => {
    expect(translations['zh-TW'].onboardingGuide.getStarted).toBe('開始收藏第一部');
    expect(translations['en-US'].onboardingGuide.getStarted).toBe('Collect my first story');
  });
});
