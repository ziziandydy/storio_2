import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  language: 'zh-TW' | 'en-US' | 'system';
  notificationsEnabled: boolean;
  theme: 'dark' | 'light';
  setLanguage: (lang: 'zh-TW' | 'en-US' | 'system') => void;
  toggleNotifications: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'system',
      notificationsEnabled: true,
      theme: 'dark',
      setLanguage: (lang) => set({ language: lang }),
      toggleNotifications: () => set((state) => ({ notificationsEnabled: !state.notificationsEnabled })),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'storio-settings-storage',
    }
  )
);
