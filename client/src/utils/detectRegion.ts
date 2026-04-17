/**
 * Detects the user's region from navigator.language (BCP 47 format).
 * e.g. "en-CA" → "CA", "zh-TW" → "TW", "en" → "TW" (fallback)
 * SSR-safe: returns "TW" if navigator is unavailable.
 */
export function detectRegion(): string {
  try {
    if (typeof navigator === 'undefined') return 'TW';
    const lang = navigator.language || '';
    const parts = lang.split('-');
    if (parts.length >= 2) {
      const region = parts[parts.length - 1].toUpperCase();
      if (/^[A-Z]{2}$/.test(region)) return region;
    }
    return 'TW';
  } catch {
    return 'TW';
  }
}
