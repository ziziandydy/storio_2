// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

const isNative = vi.fn();
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => isNative() },
}));

import { detectBot } from '../botDetection';

const CHROME = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

function setEnv(ua: string, webdriver: boolean, path: string) {
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true });
  Object.defineProperty(navigator, 'webdriver', { value: webdriver, configurable: true });
  window.history.pushState({}, '', path);
}

describe('detectBot', () => {
  beforeEach(() => {
    isNative.mockReturnValue(false);
    setEnv(CHROME, false, '/');
  });

  it.each([
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 AppleWebKit/537.36; compatible; gptbot/1.0',
    'Mozilla/5.0 (compatible; CLAUDEBOT/1.0)',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0 Safari/537.36',
  ])('爬蟲 UA 判為 user_agent: %s', (ua) => {
    setEnv(ua, false, '/');
    expect(detectBot()).toEqual({ isBot: true, reason: 'user_agent' });
  });

  it('webdriver = true 判為 webdriver', () => {
    setEnv(CHROME, true, '/');
    expect(detectBot()).toEqual({ isBot: true, reason: 'webdriver' });
  });

  it('/share/render 判為 render_service', () => {
    setEnv(CHROME, false, '/share/render');
    expect(detectBot()).toEqual({ isBot: true, reason: 'render_service' });
  });

  it('原生 App 一律不是 bot', () => {
    isNative.mockReturnValue(true);
    setEnv('Googlebot/2.1', true, '/share/render');
    expect(detectBot()).toEqual({ isBot: false, reason: null });
  });

  it('一般 iPhone Safari 不是 bot', () => {
    setEnv(IPHONE, false, '/');
    expect(detectBot()).toEqual({ isBot: false, reason: null });
  });
});
