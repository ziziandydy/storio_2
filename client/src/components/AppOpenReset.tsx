'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSettingsStore } from '@/store/settingsStore';
import { notificationManager } from '@/lib/notifications';
import { isNativePlatform } from '@/lib/appleAuth';
import { NOTIFICATION_CONFIG } from '@/lib/notification-config';
import { onStoryAdded } from '@/lib/notification-events';
import NotificationPrimerCard from '@/components/NotificationPrimerCard';
import NotificationBanner from '@/components/NotificationBanner';

const LAST_SCHEDULED_KEY = 'storio_notif_last_scheduled';

export default function AppOpenReset() {
  const { token, loading: authLoading } = useAuth();
  const {
    notifEnabled, notifLogStory, notifFolioReflection,
    language, notifPrimerDismissCount, notifPrimerLastDismissedAt,
    notifPrimerSeen, dismissPrimer,
  } = useSettingsStore();

  const [showPrimer, setShowPrimer] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const hasRun = useRef(false);

  // App Open Reset：排程 + Permission Primer
  useEffect(() => {
    if (authLoading || hasRun.current) return;
    hasRun.current = true;

    if (!isNativePlatform()) return;

    const run = async () => {
      // 1. 記錄 engagement
      notificationManager.recordEngagement(1);

      // 2. 防止同一天重複全量重排程
      const lastScheduled = localStorage.getItem(LAST_SCHEDULED_KEY);
      const today = new Date().toDateString();
      const lastDay = lastScheduled ? new Date(Number(lastScheduled)).toDateString() : null;
      const alreadyScheduledToday = lastDay === today;

      // 3. 排程通知（需要有 token 才能讀 collection 資料）
      if (token && notifEnabled && !alreadyScheduledToday) {
        const resolvedLang = language === 'system' ? 'zh-TW' : language as 'zh-TW' | 'en-US';
        const state = await notificationManager.fetchNotificationState(
          token, '', resolvedLang, notifEnabled, notifLogStory, notifFolioReflection
        );
        await notificationManager.reschedule(state);
      }

      // 4. 檢查是否顯示 Permission Primer
      const hasSomeStories = token !== null;
      const cooldownOk = !notifPrimerLastDismissedAt ||
        (Date.now() - notifPrimerLastDismissedAt) > NOTIFICATION_CONFIG.PRIMER_DISMISS_COOLDOWN_DAYS * 86400000;

      if (
        hasSomeStories &&
        !notifEnabled &&
        !notifPrimerSeen &&
        notifPrimerDismissCount < NOTIFICATION_CONFIG.PRIMER_MAX_DISMISS_COUNT &&
        cooldownOk
      ) {
        setShowPrimer(true);
      }
    };

    run().catch(() => {});
  }, [authLoading, token, notifEnabled, notifLogStory, notifFolioReflection, language,
    notifPrimerDismissCount, notifPrimerLastDismissedAt, notifPrimerSeen]);

  // 舊用戶升級 Banner：新增 Storio 成功時觸發
  useEffect(() => {
    if (!isNativePlatform()) return;

    const unsubscribe = onStoryAdded(() => {
      // 觸發條件：尚未見過 primer、權限未啟用
      const cooldownOk = !notifPrimerLastDismissedAt ||
        (Date.now() - notifPrimerLastDismissedAt) > NOTIFICATION_CONFIG.PRIMER_DISMISS_COOLDOWN_DAYS * 86400000;

      if (
        !notifPrimerSeen &&
        !notifEnabled &&
        notifPrimerDismissCount < NOTIFICATION_CONFIG.PRIMER_MAX_DISMISS_COUNT &&
        cooldownOk
      ) {
        setShowBanner(true);
      }
    });

    return unsubscribe;
  }, [notifPrimerSeen, notifEnabled, notifPrimerDismissCount, notifPrimerLastDismissedAt]);

  const handleBannerDismiss = () => {
    setShowBanner(false);
    dismissPrimer();
  };

  return (
    <>
      <NotificationPrimerCard visible={showPrimer} />
      <NotificationBanner visible={showBanner} onDismiss={handleBannerDismiss} />
    </>
  );
}
