import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { detectRegion } from '@/utils/detectRegion';

interface SettingsState {
  language: 'zh-TW' | 'en-US' | 'system';
  region: string;
  notificationsEnabled: boolean;
  theme: 'dark' | 'light';

  // 通知開關
  notifEnabled: boolean;
  notifComeBack: boolean;
  notifFolioReflection: boolean;
  notifPermissionDenied: boolean;

  // Permission Primer 狀態
  notifPrimerDismissCount: number;
  notifPrimerLastDismissedAt: number | null;
  notifPrimerSeen: boolean;

  // Actions
  setLanguage: (lang: 'zh-TW' | 'en-US' | 'system') => void;
  setRegion: (region: string) => void;
  toggleNotifications: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setNotifEnabled: (enabled: boolean) => void;
  setNotifComeBack: (enabled: boolean) => void;
  setNotifFolioReflection: (enabled: boolean) => void;
  setNotifPermissionDenied: (denied: boolean) => void;
  dismissPrimer: () => void;
  markPrimerSeen: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'system',
      region: detectRegion(),
      notificationsEnabled: true,
      theme: 'dark',

      notifEnabled: false,
      notifComeBack: true,
      notifFolioReflection: true,
      notifPermissionDenied: false,

      notifPrimerDismissCount: 0,
      notifPrimerLastDismissedAt: null,
      notifPrimerSeen: false,

      setLanguage: (lang) => set({ language: lang }),
      setRegion: (region) => set({ region }),
      toggleNotifications: () => set((state) => ({ notificationsEnabled: !state.notificationsEnabled })),
      setTheme: (theme) => set({ theme }),
      setNotifEnabled: (enabled) => set({ notifEnabled: enabled }),
      setNotifComeBack: (enabled) => set({ notifComeBack: enabled }),
      setNotifFolioReflection: (enabled) => set({ notifFolioReflection: enabled }),
      setNotifPermissionDenied: (denied) => set({ notifPermissionDenied: denied }),
      dismissPrimer: () => set((state) => ({
        notifPrimerDismissCount: state.notifPrimerDismissCount + 1,
        notifPrimerLastDismissedAt: Date.now(),
      })),
      markPrimerSeen: () => set({ notifPrimerSeen: true }),
    }),
    {
      name: 'storio-settings-storage',
    }
  )
);
