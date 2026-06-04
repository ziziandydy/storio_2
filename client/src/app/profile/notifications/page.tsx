'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, BookMarked, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettingsStore } from '@/store/settingsStore';
import { useToast } from '@/components/ToastProvider';
import { useAuth } from '@/hooks/useAuth';
import { Capacitor } from '@capacitor/core';
import { checkAndRequestPermission, cancelAll, reschedule, fetchNotificationState } from '@/lib/notifications';
import { isNativePlatform } from '@/lib/appleAuth';

export default function NotificationsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const settingsLanguage = useSettingsStore(s => s.language);
  const { token } = useAuth();
  const { showToast } = useToast();
  const {
    notifEnabled, setNotifEnabled,
    notifLogStory, setNotifLogStory,
    notifFolioReflection, setNotifFolioReflection,
    notifPermissionDenied, setNotifPermissionDenied,
    markPrimerSeen,
  } = useSettingsStore();

  const [loading, setLoading] = useState(false);
  const np = (t.profile as any).notificationsPage;

  // 進入頁面時標記 primer 已見過
  useEffect(() => {
    markPrimerSeen();
  }, [markPrimerSeen]);

  // 檢查 iOS 權限狀態（每次進入頁面時同步）
  useEffect(() => {
    if (!isNativePlatform()) return;
    const { LocalNotifications } = require('@capacitor/local-notifications');
    LocalNotifications.checkPermissions().then(({ display }: { display: string }) => {
      setNotifPermissionDenied(display === 'denied');
    }).catch(() => {});
  }, [setNotifPermissionDenied]);

  const handleMainToggle = async (enabled: boolean) => {
    if (enabled) {
      setLoading(true);
      const granted = await checkAndRequestPermission();
      setLoading(false);
      if (granted) {
        setNotifEnabled(true);
        setNotifPermissionDenied(false);
        // 立即排程
        if (token) {
          const resolvedLang = settingsLanguage === 'system' ? 'zh-TW' : settingsLanguage as 'zh-TW' | 'en-US';
          const state = await fetchNotificationState(
            token, '', resolvedLang, true, notifLogStory, notifFolioReflection
          );
          await reschedule(state);
        }
      } else {
        setNotifPermissionDenied(true);
        showToast(np.permissionDeniedToast);
      }
    } else {
      setNotifEnabled(false);
      await cancelAll();
    }
  };

  const openIosSettings = () => {
    if (isNativePlatform()) {
      Capacitor.getPlatform(); // ensure Capacitor loaded
      (window as any).Capacitor?.Plugins?.App?.openUrl?.({ url: 'app-settings:' })
        ?? window.open('app-settings:', '_system');
    }
  };

  return (
    <div className="min-h-screen bg-folio-black text-text-primary font-sans antialiased">
      {/* 動態島遮罩 */}
      <div className="fixed top-0 left-0 right-0 h-[var(--sa-top)] bg-folio-black z-[100] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-[var(--sa-top)] z-30 bg-folio-black/90 backdrop-blur-xl border-b border-white/5 px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-text-desc hover:text-white transition-colors text-xs font-bold tracking-widest uppercase"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-white font-bold text-base">{np.title}</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6 pb-24">

        {/* 主開關 */}
        <div className="bg-[#121212] border border-white/5 rounded-2xl overflow-hidden">
          <div className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${notifEnabled ? 'bg-accent-gold/10' : 'bg-white/5'}`}>
                <Bell size={20} className={notifEnabled ? 'text-accent-gold' : 'text-text-desc'} />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{np.allNotifications}</p>
                <p className="text-text-desc text-xs mt-0.5">{np.allNotificationsDesc}</p>
              </div>
            </div>
            <button
              onClick={() => handleMainToggle(!notifEnabled)}
              disabled={loading}
              className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${notifEnabled ? 'bg-accent-gold' : 'bg-white/15'} disabled:opacity-50`}
            >
              <motion.span
                layout
                className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm"
                animate={{ left: notifEnabled ? '1.375rem' : '0.25rem' }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            </button>
          </div>

          {/* 權限被拒引導 */}
          {notifPermissionDenied && (
            <div className="px-5 pb-4 border-t border-white/5 pt-3">
              <p className="text-[11px] text-text-desc leading-relaxed">
                {np.permissionDeniedToast}
              </p>
              <button
                onClick={openIosSettings}
                className="mt-2 text-accent-gold text-xs font-bold uppercase tracking-widest hover:text-white transition-colors"
              >
                {np.permissionDeniedSettings} →
              </button>
            </div>
          )}
        </div>

        {/* 類型開關 */}
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-text-desc mb-3 px-1">
            {np.whatToRemind}
          </p>
          <div className={`bg-[#121212] border border-white/5 rounded-2xl overflow-hidden transition-opacity ${!notifEnabled ? 'opacity-40 pointer-events-none' : ''}`}>

            {/* Log a story */}
            <div className="p-5 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                  <BookMarked size={20} className="text-text-desc" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{np.logStory}</p>
                  <p className="text-text-desc text-xs mt-0.5">{np.logStoryDesc}</p>
                </div>
              </div>
              <button
                onClick={() => setNotifLogStory(!notifLogStory)}
                className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${notifLogStory ? 'bg-accent-gold' : 'bg-white/15'}`}
              >
                <motion.span
                  layout
                  className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm"
                  animate={{ left: notifLogStory ? '1.375rem' : '0.25rem' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              </button>
            </div>

            {/* Folio reflection */}
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                  <BookOpen size={20} className="text-text-desc" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{np.folioReflection}</p>
                  <p className="text-text-desc text-xs mt-0.5">{np.folioReflectionDesc}</p>
                </div>
              </div>
              <button
                onClick={() => setNotifFolioReflection(!notifFolioReflection)}
                className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${notifFolioReflection ? 'bg-accent-gold' : 'bg-white/15'}`}
              >
                <motion.span
                  layout
                  className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm"
                  animate={{ left: notifFolioReflection ? '1.375rem' : '0.25rem' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
