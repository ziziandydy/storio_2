// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { translations } from '@/i18n/locales';
import { makeRecap } from '@/lib/recap/__tests__/fixtures';
import type { SceneKey } from '@/lib/recap/types';
import RecapScene from '../RecapScene';

const copy = translations['zh-TW'].recap;

function frameOf(key: SceneKey): string | null {
  const { container } = render(
    <RecapScene sceneKey={key} recap={makeRecap()} copy={copy} locale="zh-TW" aspectRatio="9:16" animate={false} />,
  );
  const frame = container.querySelector('[data-testid="scene-frame"]');
  const value = frame ? frame.getAttribute('data-frame') : 'NO-FRAME-ELEMENT';
  cleanup();
  return value;
}

describe('媒體場景各有專屬外框', () => {
  afterEach(cleanup);

  it('電影＝底片邊、影集＝電視螢幕、書＝書本', () => {
    expect(frameOf('movies')).toBe('film');
    expect(frameOf('series')).toBe('tv');
    expect(frameOf('books')).toBe('book');
  });

  it('其他場景沒有外框', () => {
    for (const key of ['total', 'genres', 'eras', 'monthly', 'top_rated', 'reflection'] as SceneKey[]) {
      expect(frameOf(key)).toBeNull();
    }
  });
});
