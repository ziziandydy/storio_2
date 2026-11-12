import { describe, it, expect } from 'vitest';
import { buildRecapPayload, recapRenderSettings } from '../renderPayload';
import { makeRecap } from './fixtures';

describe('buildRecapPayload', () => {
  it('template 為 recap-scene，帶場景鍵與整份 recap', () => {
    const recap = makeRecap({ year: 2025 });
    const payload = buildRecapPayload(recap, 'reflection');
    expect(payload.template).toBe('recap-scene');
    expect(payload.item.sceneKey).toBe('reflection');
    expect(payload.item.recap?.year).toBe(2025);
  });
});

describe('recapRenderSettings', () => {
  it('只含比例、語系、心得索引三個值（供快取 key 雜湊）', () => {
    expect(recapRenderSettings({ aspectRatio: '4:5', locale: 'en-US', reflectionIndex: 1 })).toEqual({
      aspectRatio: '4:5',
      locale: 'en-US',
      recapReflectionIndex: 1,
    });
  });
});
