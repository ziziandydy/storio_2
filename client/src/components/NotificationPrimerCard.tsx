'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettingsStore } from '@/store/settingsStore';
import { checkAndRequestPermission, reschedule, fetchNotificationState } from '@/lib/notifications';
import { useToast } from '@/components/ToastProvider';
import { useAuth } from '@/hooks/useAuth';
import { NOTIFICATION_CONFIG } from '@/lib/notification-config';

interface Props {
  visible: boolean;
}

export default function NotificationPrimerCard({ visible }: Props) {
  const { t } = useTranslation();
  const { token } = useAuth();
  const { showToast } = useToast();
  const {
    dismissPrimer,
    markPrimerSeen,
    setNotifEnabled,
    setNotifPermissionDenied,
    notifPrimerDismissCount,
    notifLogStory,
    notifFolioReflection,
    language,
  } = useSettingsStore();

  const np = (t.profile as any).notificationsPage;

  const handleEnable = async () => {
    markPrimerSeen();
    const granted = await checkAndRequestPermission();
    if (granted) {
      setNotifEnabled(true);
      setNotifPermissionDenied(false);
      if (token) {
        const resolvedLang = language === 'system' ? 'zh-TW' : language as 'zh-TW' | 'en-US';
        const state = await fetchNotificationState(
          token, '', resolvedLang, true, notifLogStory, notifFolioReflection
        );
        await reschedule(state);
      }
    } else {
      setNotifPermissionDenied(true);
      showToast(np.permissionDeniedToast);
    }
  };

  const handleDismiss = () => {
    dismissPrimer();
  };

  const willNeverShow = notifPrimerDismissCount >= NOTIFICATION_CONFIG.PRIMER_MAX_DISMISS_COUNT;

  return (
    <AnimatePresence>
      {visible && !willNeverShow && (
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 200 }}
          drag="y"
          dragConstraints={{ top: 0 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 60) handleDismiss();
          }}
          className="fixed bottom-0 left-0 right-0 z-[200] bg-[#121212] border-t border-white/10 rounded-t-3xl p-6 pb-10 shadow-2xl"
        >
          {/* 拖曳指示條 */}
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />

          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-accent-gold/10 border border-accent-gold/20 flex items-center justify-center">
              <Bell size={28} className="text-accent-gold" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-white font-bold text-lg font-serif">{np.primerTitle}</h3>
              <p className="text-text-desc text-sm leading-relaxed max-w-[280px]">{np.primerBody}</p>
            </div>

            <div className="flex flex-col gap-3 w-full mt-2">
              <button
                onClick={handleEnable}
                className="w-full py-4 bg-accent-gold text-folio-black rounded-2xl font-black uppercase tracking-[0.15em] text-sm hover:bg-white transition-all shadow-[0_0_20px_rgba(197,160,89,0.3)]"
              >
                {np.primerCTA}
              </button>
              <button
                onClick={handleDismiss}
                className="w-full py-3 text-text-desc text-sm font-medium hover:text-white transition-colors"
              >
                {np.primerDismiss}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
