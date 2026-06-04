'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettingsStore } from '@/store/settingsStore';
import { NOTIFICATION_CONFIG } from '@/lib/notification-config';

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export default function NotificationBanner({ visible, onDismiss }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const { markPrimerSeen } = useSettingsStore();

  const np = (t.profile as any).notificationsPage;

  const handleOpen = () => {
    markPrimerSeen();
    router.push('/profile/notifications');
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="fixed bottom-[env(safe-area-inset-bottom,0px)] left-0 right-0 z-[150] mx-4 mb-4"
        >
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl px-4 py-3 flex items-center justify-between shadow-xl backdrop-blur-sm">
            <span className="text-white text-sm font-medium flex-1 mr-3">{np.bannerText}</span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleOpen}
                className="px-4 py-1.5 bg-accent-gold text-folio-black text-xs font-black uppercase tracking-wider rounded-xl hover:bg-white transition-all"
              >
                {np.bannerOpen}
              </button>
              <button
                onClick={onDismiss}
                className="w-7 h-7 flex items-center justify-center text-text-desc hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
