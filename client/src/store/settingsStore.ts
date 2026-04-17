import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { detectRegion } from '@/utils/detectRegion';

interface SettingsState {
  language: 'zh-TW' | 'en-US' | 'system';
  region: string; // ISO 3166-1 alpha-2 code, e.g., 'TW', 'US'
  notificationsEnabled: boolean;
  theme: 'dark' | 'light';
  setLanguage: (lang: 'zh-TW' | 'en-US' | 'system') => void;
  setRegion: (region: string) => void;
  toggleNotifications: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'system',
      region: detectRegion(),
      notificationsEnabled: true,
      theme: 'dark',
      setLanguage: (lang) => set({ language: lang }),
      setRegion: (region) => set({ region }),
      toggleNotifications: () => set((state) => ({ notificationsEnabled: !state.notificationsEnabled })),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'storio-settings-storage',
    }
  )
);
