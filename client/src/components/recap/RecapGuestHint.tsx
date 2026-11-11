'use client';

import React from 'react';
import Image from 'next/image';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useToast } from '@/components/ToastProvider';
import { isNativePlatform, isIOSPlatform } from '@/lib/appleAuth';
import { loginWithProvider } from '@/lib/providerLogin';

/** 訪客看 Recap 時的登入提示：登入後 Recap 跟著帳號保存（登入流程與訪客登入卡共用 loginWithProvider）。 */
export default function RecapGuestHint() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const h = t.recap.guestHint;

  const login = async (provider: 'apple' | 'google') => {
    const result = await loginWithProvider(provider);
    if (result.error) {
      console.error('Login failed:', result.error.message);
      showToast(`${t.common.error}：${result.error.message}`, 'error');
    }
  };

  return (
    <div data-testid="recap-guest-hint" className="mx-4 rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col gap-3">
      <div className="flex gap-3">
        <span className="text-accent-gold mt-0.5"><ShieldCheck size={20} /></span>
        <div>
          <div className="text-[13px] font-bold text-white">{h.title}</div>
          <div className="text-[11px] text-text-desc mt-1 leading-relaxed">{h.body}</div>
        </div>
      </div>
      <div className="flex gap-2.5">
        {/* 與 GuestSaveCard 一致：只有 Android 原生 App 隱藏 Apple */}
        {(isIOSPlatform() || !isNativePlatform()) && (
          <button
            onClick={() => login('apple')}
            className="flex-1 h-11 bg-black border border-white/20 text-white rounded-xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Image src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" width={14} height={14} alt="" className="invert" />
            {t.onboarding.apple}
          </button>
        )}
        <button
          onClick={() => login('google')}
          className="flex-1 h-11 bg-white text-black rounded-xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <Image src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width={14} height={14} alt="" />
          {t.onboarding.google}
        </button>
      </div>
    </div>
  );
}
