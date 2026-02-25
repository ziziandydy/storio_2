'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Layers } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { getApiUrl } from '@/lib/api';
import { useTranslation } from '@/hooks/useTranslation';
import { getTitleKeyByCount, TitleTranslationKey } from '@/utils/leveling';

export default function HeroStats() {
  const { token, loading: authLoading, user } = useAuth();
  const { t } = useTranslation();
  const [count, setCount] = useState(0);
  const [levelKey, setLevelKey] = useState<TitleTranslationKey>('apprentice');

  useEffect(() => {
    if (token) {
      fetch(getApiUrl('/api/v1/collection/'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(data => {
          const c = Array.isArray(data) ? data.length : 0;
          setCount(c);

          const isAnonymous = user?.is_anonymous !== false;
          setLevelKey(getTitleKeyByCount(c, isAnonymous));
        })
        .catch(err => console.error("Failed to fetch stats", err));
    }
  }, [token, user]);

  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4 relative z-10">
      <div className="mb-2 flex items-center gap-2 text-accent-gold/80 uppercase tracking-[0.3em] text-[10px] font-bold">
        <Layers size={12} />
        <span>{t.profile.titles[levelKey]}</span>
      </div>

      <h1 className="text-5xl md:text-7xl font-black text-text-primary mb-2 font-serif tracking-tight">
        {count.toLocaleString()}
      </h1>

      <p className="text-text-desc text-sm max-w-xs mb-8 leading-relaxed">
        Your personal folio for collected stories.
      </p>

      <Link
        href="/collection"
        className="group relative inline-flex items-center gap-3 px-8 py-4 bg-accent-gold text-folio-black rounded-full font-bold uppercase tracking-widest text-xs hover:bg-white transition-all duration-300 shadow-[0_0_20px_rgba(233,108,38,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)]"
      >
        <Layers size={18} strokeWidth={3} />
        <span>{t.home.viewStorio}</span>
      </Link>
    </div>
  );
}
