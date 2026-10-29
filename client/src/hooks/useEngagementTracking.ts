import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import { useUserStore } from '@/store/userStore';
import { track } from '@/lib/analytics';
import { detectBot } from '@/lib/botDetection';
import { isNativePlatform } from '@/lib/appleAuth';

/**
 * 上報 open：auth 就緒後（有 token／bot／匿名登入失敗的真人）每次掛載最多一次；
 * 原生 App 另在回到前景時再上報（track 本身有同日去重）。
 */
export function useOpenTracking(): void {
  const loading = useUserStore((s) => s.loading);
  const token = useUserStore((s) => s.token);
  const anonSignInFailed = useUserStore((s) => s.anonSignInFailed);
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current || loading) return;
    if (token || detectBot().isBot || anonSignInFailed) {
      sent.current = true;
      track('open');
    }
  }, [loading, token, anonSignInFailed]);

  useEffect(() => {
    if (!isNativePlatform()) return;
    const handle = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) track('open');
    });
    return () => {
      handle.then((h) => h.remove());
    };
  }, []);
}

/** 第一次真實互動（scroll／wheel／touchstart）才上報 browse，之後移除監聽 */
export function useBrowseTracking(): void {
  useEffect(() => {
    const events = ['scroll', 'wheel', 'touchstart'] as const;
    const cleanup = () => events.forEach((e) => window.removeEventListener(e, onFirst));
    function onFirst() {
      cleanup();
      track('browse');
    }
    events.forEach((e) => window.addEventListener(e, onFirst, { passive: true }));
    return cleanup;
  }, []);
}
