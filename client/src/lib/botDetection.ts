import { Capacitor } from '@capacitor/core';

export type BotReason = 'render_service' | 'webdriver' | 'user_agent';

// 已知爬蟲／無頭瀏覽器 UA 樣式（不分大小寫）
const BOT_UA_PATTERN = /bot|crawler|spider|crawling|headlesschrome|lighthouse|google-inspectiontool|googleother|facebookexternalhit|slurp|bingpreview|gptbot|chatgpt-user|oai-searchbot|claudebot|claude-user|claude-searchbot|perplexitybot|applebot|bytespider|ccbot|amazonbot|semrush|ahrefs|petalbot|yandex|duckduckbot|baiduspider/i;

/**
 * 判斷目前是否為疑似爬蟲／自家分享圖渲染服務。
 * 順序：native → render_service → webdriver → user_agent。原生 App 永遠不是 bot。
 */
export function detectBot(): { isBot: boolean; reason: BotReason | null } {
  if (typeof window === 'undefined') return { isBot: false, reason: null };
  if (Capacitor.isNativePlatform()) return { isBot: false, reason: null };

  if (window.location.pathname.startsWith('/share/render')) {
    return { isBot: true, reason: 'render_service' };
  }
  if (navigator.webdriver) return { isBot: true, reason: 'webdriver' };
  if (BOT_UA_PATTERN.test(navigator.userAgent || '')) {
    return { isBot: true, reason: 'user_agent' };
  }
  return { isBot: false, reason: null };
}
