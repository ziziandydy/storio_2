import { describe, it, expect } from 'vitest';
import { translations } from '../locales';

type Json = string | readonly string[] | { readonly [k: string]: Json };

/** 展開成 { 'a.b.c': 值 }；陣列視為葉節點。 */
function flatten(obj: Json, prefix = ''): Record<string, string | readonly string[]> {
  if (typeof obj === 'string' || Array.isArray(obj)) return { [prefix]: obj as string | readonly string[] };
  const out: Record<string, string | readonly string[]> = {};
  for (const [k, v] of Object.entries(obj as { [k: string]: Json })) {
    Object.assign(out, flatten(v, prefix ? `${prefix}.${k}` : k));
  }
  return out;
}

const zh = flatten(translations['zh-TW'].recap as unknown as Json);
const en = flatten(translations['en-US'].recap as unknown as Json);
const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();

describe('年度 Recap 文案', () => {
  it('兩語系的鍵集合完全相同', () => {
    expect(Object.keys(zh).sort()).toEqual(Object.keys(en).sort());
  });

  it('所有值皆為非空字串（months 為長度 12 的非空字串陣列）', () => {
    for (const [locale, flat] of [['zh-TW', zh], ['en-US', en]] as const) {
      for (const [key, value] of Object.entries(flat)) {
        if (key === 'months') {
          expect(Array.isArray(value), `${locale} months 應為陣列`).toBe(true);
          expect(value).toHaveLength(12);
          for (const m of value as readonly string[]) expect(m.trim().length).toBeGreaterThan(0);
        } else {
          expect(typeof value, `${locale}.${key}`).toBe('string');
          expect((value as string).trim().length, `${locale}.${key}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('兩語系的佔位符（{n}、{year}…）一致', () => {
    for (const key of Object.keys(zh)) {
      if (key === 'months') continue;
      expect(placeholders(zh[key] as string), key).toEqual(placeholders(en[key] as string));
    }
  });

  it('固定文案：Profile 鼓勵文案與結尾標語', () => {
    expect(translations['zh-TW'].recap.profileRowEncourage).toBe('再收藏 {n} 部，就能看到你的 {year}');
    expect(translations['zh-TW'].recap.scene.closing.tagline).toBe('Collect stories in your Folio');
    expect(translations['en-US'].recap.scene.closing.tagline).toBe('Collect stories in your Folio');
  });

  it('必要的佔位符存在', () => {
    for (const flat of [zh, en]) {
      expect(flat['profileRowEncourage']).toContain('{n}');
      expect(flat['profileRowEncourage']).toContain('{year}');
      expect(flat['notEnough']).toContain('{n}');
    }
  });

  it('文案不責備：不含「還沒」「尚未」「你沒有」等字眼', () => {
    const banned = ['還沒', '尚未', '你沒有', '沒有收藏', "haven't", "haven’t", ' yet', "don't have"];
    for (const flat of [zh, en]) {
      for (const [key, value] of Object.entries(flat)) {
        const text = Array.isArray(value) ? value.join(' ') : (value as string);
        for (const word of banned) {
          expect(text.toLowerCase().includes(word.toLowerCase()), `${key} 含禁用詞「${word}」`).toBe(false);
        }
      }
    }
  });

  it('月份名稱：中文「1 月」起、英文縮寫', () => {
    expect(translations['zh-TW'].recap.months[0]).toBe('1 月');
    expect(translations['zh-TW'].recap.months[11]).toBe('12 月');
    expect(translations['en-US'].recap.months[0]).toBe('Jan');
    expect(translations['en-US'].recap.months[11]).toBe('Dec');
  });
});
