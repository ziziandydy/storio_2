'use client';

import React from 'react';
import Image from 'next/image';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useToast } from '@/components/ToastProvider';
import { isNativePlatform, isIOSPlatform } from '@/lib/appleAuth';
import { loginWithProvider } from '@/lib/providerLogin';
import { PosterWithCheck, SuccessHeading } from './FirstCollectCelebration';

interface GuestSaveCardProps {
  /** 作品名稱 */
  title: string;
  posterUrl?: string;
  /** 「稍後再說，前往 My Storio」 */
  onLater: () => void;
  /** 原生登入成功（未取消）後呼叫，讓外層關閉視窗 */
  onLoggedIn: () => void;
}

/**
 * 訪客收藏成功的登入引導卡。登入沿用首頁 OnboardingModal 的既有流程：
 * iOS 原生 Apple／原生 Google，其餘走 Supabase OAuth（redirect 至 /auth/callback）。
 * 登入成功後由 useAuth 的 onAuthStateChange 呼叫既有 migrate_guest_data 搬移訪客收藏，這裡不另處理。
 */
export default function GuestSaveCard({ title, posterUrl, onLater, onLoggedIn }: GuestSaveCardProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();

  // 分派邏輯集中在 lib/providerLogin（與首頁 handleLogin 相同）
  const handleLogin = async (provider: 'apple' | 'google') => {
    const result = await loginWithProvider(provider);
    if (result.cancelled) return;
    if (result.error) {
      console.error('Login failed:', result.error.message);
      showToast(`${t.common.error}：${result.error.message}`, 'error');
      return;
    }
    // 原生登入成功才由這裡關閉視窗；OAuth 轉址會離開頁面
    if (!result.redirected) onLoggedIn();
  };

  return (
    <div
      data-testid="guest-save-card"
      className="rounded-[32px] px-7 pt-9 pb-6 flex flex-col items-center text-center gap-5"
      style={{ background: 'radial-gradient(ellipse at 50% 18%, rgba(197,160,89,0.20), transparent 62%), #121212' }}
    >
      <PosterWithCheck posterUrl={posterUrl} title={title} width={96} height={144} />

      <SuccessHeading title={title} />

      <div className="w-full rounded-2xl bg-white/5 border border-white/10 p-4 text-left flex gap-3">
        <span className="text-accent-gold mt-0.5"><ShieldCheck size={20} /></span>
        <div>
          <div className="text-[13px] font-bold text-white">{t.guestSave.title}</div>
          <div className="text-[11px] text-text-desc mt-1 leading-relaxed">{t.guestSave.body}</div>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 w-full">
        {/* 與 OnboardingModal 一致：只有 Android 原生 App 隱藏 Apple（外掛無 Android 實作） */}
        {(isIOSPlatform() || !isNativePlatform()) && (
          <button
            onClick={() => handleLogin('apple')}
            className="h-[50px] w-full bg-black border border-white/20 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-white/5 transition-all active:scale-[0.98]"
          >
            <Image src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" width={16} height={16} alt="" className="invert" />
            {t.onboarding.apple}
          </button>
        )}
        <button
          onClick={() => handleLogin('google')}
          className="h-[50px] w-full bg-white text-black rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-gray-200 transition-all active:scale-[0.98]"
        >
          <Image src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width={16} height={16} alt="" />
          {t.onboarding.google}
        </button>
      </div>

      <button onClick={onLater} className="text-[11px] font-bold text-white/50 hover:text-white transition-colors">
        {t.guestSave.later}
      </button>
    </div>
  );
}
