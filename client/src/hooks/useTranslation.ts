import { useState, useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { translations, Locale } from '@/i18n/locales';

export function useTranslation() {
  const { language } = useSettingsStore();
  const [resolvedLocale, setResolvedLocale] = useState<Locale>('zh-TW');

  useEffect(() => {
    if (language === 'system') {
      const browserLang = navigator.language;
      if (browserLang.toLowerCase().includes('zh')) {
        setResolvedLocale('zh-TW');
      } else {
        setResolvedLocale('en-US'); // Default to English for other languages
      }
    } else {
      setResolvedLocale(language);
    }
  }, [language]);
  
  const t = translations[resolvedLocale];

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return '';
    const d = new Date(date);
    
    if (resolvedLocale === 'zh-TW') {
      return d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });
    } else {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  return { t, locale: resolvedLocale, formatDate };
}
