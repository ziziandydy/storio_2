'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, ArrowLeft, Trash2, Library } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import StoryCard from '@/components/StoryCard';
import ViewSwitcher from '@/components/ViewSwitcher';
import NavigationFAB from '@/components/NavigationFAB';
import { useAuth } from '@/hooks/useAuth';
import { useViewStore } from '@/store/viewStore';
import { Story } from '@/types';
import ListView from '@/components/views/ListView';
import CalendarView from '@/components/views/CalendarView';
import GalleryView from '@/components/views/GalleryView';
import { getApiUrl } from '@/lib/api';
import { useTranslation } from '@/hooks/useTranslation';

export default function CollectionPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const { token, loading: authLoading, user } = useAuth();
  const { currentView } = useViewStore();
  const { t } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    const fetchCollection = async () => {
      if (authLoading) return;
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(getApiUrl('/api/v1/collection/'), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await res.json();
        setStories(data);
      } catch (error) {
        console.error("Failed to fetch collection:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCollection();
  }, [token, authLoading]);

  // Calculate viewing numbers
  const getViewModel = () => {
    // Sort by created_at ascending to assign numbers correctly 1..N
    const sorted = [...stories].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const counts: Record<string, number> = {};
    const model: Record<string, number> = {}; // id -> viewing number

    sorted.forEach(story => {
      const current = counts[story.external_id] || 0;
      counts[story.external_id] = current + 1;
      model[story.id] = current + 1;
    });

    // Return stories sorted by created_at descending (newest first) with calculated numbers
    return stories.map(s => ({
      ...s,
      viewingNumber: model[s.id]
    })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  const processedStories = getViewModel();

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-48 h-48">
            <Image
              src="/image/loading.gif"
              alt="Loading..."
              fill
              className="object-contain"
              unoptimized
            />
          </div>
          <p className="text-accent-gold font-bold tracking-[0.3em] uppercase text-xs animate-pulse">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-folio-black text-text-primary">
      {/* Safe Area Top Cover */}
      <div className="fixed top-0 left-0 right-0 h-[var(--sa-top)] bg-folio-black z-[100] pointer-events-none" />
      
      <header className="sticky top-[var(--sa-top)] z-40 bg-folio-black/90 backdrop-blur-xl border-b border-white/5 p-4">
        <div className="max-w-container-max mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-text-desc hover:text-accent-gold transition-colors">
              <ArrowLeft size={24} />
            </Link>
            <div className="flex items-center gap-3">
              <img src="/image/logo/logo.svg" alt="Storio Logo" className="w-6 h-6" />
              <h1 className="text-2xl md:text-3xl font-bold font-serif tracking-tight text-white flex items-center gap-3">
                {t.collection.title}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-text-desc bg-folio-card px-4 py-1.5 rounded-full border border-white/5 flex items-center gap-2">
              <span>{user?.is_anonymous === false ? stories.length.toLocaleString() : `${stories.length} / 10`}</span>
              <Library size={12} className="text-accent-gold" />
            </div>
            <ViewSwitcher />
          </div>
        </div>
      </header>

      <main className="max-w-container-max mx-auto p-4">
        {processedStories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-text-desc text-center">
            <div className="w-20 h-20 rounded-full border border-white/10 flex items-center justify-center mb-6 bg-folio-card shadow-2xl relative">
              <Library size={32} strokeWidth={1} className="text-accent-gold opacity-40" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-text-primary">{t.collection.emptyTitle}</h2>
            <p className="max-w-xs mb-10 text-text-desc text-sm">{t.collection.emptyDesc}</p>

            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs justify-center">
              <Link href="/search" className="flex-1 px-8 py-3.5 bg-accent-gold text-folio-black font-black rounded-xl hover:bg-white transition-all shadow-xl shadow-accent-gold/10 uppercase text-[10px] tracking-widest">
                {t.common.explore}
              </Link>
              <Link href="/" className="flex-1 px-8 py-3.5 bg-white/5 text-white font-bold rounded-xl border border-white/10 hover:bg-white/10 transition-all uppercase text-[10px] tracking-widest">
                {t.nav.home}
              </Link>
            </div>
          </div>
        ) : (
          <div>
            {currentView === 'list' && <ListView stories={processedStories} />}
            {currentView === 'calendar' && <CalendarView stories={processedStories} />}
            {currentView === 'gallery' && <GalleryView stories={processedStories} />}
          </div>
        )}
      </main>

      {/* Floating Action Button - Only show if not empty */}
      {processedStories.length > 0 && (
        <NavigationFAB />
      )}

      {/* Mobile Bottom Safe Area Spacer */}
      <div className="h-12 md:hidden"></div>
    </div>
  );
}