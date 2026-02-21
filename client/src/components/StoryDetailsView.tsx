'use client';

import React from 'react';
import { 
  ArrowLeft, Star, Calendar, Clock, Globe, 
  User, Users, BookOpen, Film, Tv, Share2, Plus, Trash2,
  ChevronRight, Info
} from 'lucide-react';
import Image from 'next/image';
import { useTranslation } from '@/hooks/useTranslation';

interface StoryDetailsViewProps {
  item: {
    id?: string;
    title: string;
    media_type: 'movie' | 'book' | 'tv';
    year?: number;
    director?: string;
    cast?: string[];
    overview: string;
    poster_path?: string;
    backdrop_path?: string;
    source: string;
    rating?: number;
    notes?: string;
    created_at?: string;
  };
  showAddButton?: boolean;
  onAddClick?: () => void;
  onBack: () => void;
}

export default function StoryDetailsView({ item, showAddButton = true, onAddClick, onBack }: StoryDetailsViewProps) {
  const { t } = useTranslation();
  
  if (!item) return null;

  return (
    <div className="min-h-screen bg-folio-black text-text-primary pb-20 selection:bg-accent-gold/30">
      {/* Dynamic Backdrop */}
      <div className="relative h-[60vh] w-full overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image 
            src={item.backdrop_path || item.poster_path || '/image/defaultMoviePoster.svg'} 
            alt={item.title}
            fill
            className="object-cover opacity-40 scale-105 blur-[2px]"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-folio-black/20 via-folio-black/60 to-folio-black z-10" />
          <div className="absolute inset-0 bg-gradient-to-r from-folio-black via-transparent to-transparent z-10" />
        </div>

        {/* Header Overlay */}
        <header className="relative z-30 p-6 flex justify-between items-center max-w-container-max mx-auto">
          <button 
            onClick={onBack}
            className="group flex items-center gap-2 px-4 py-2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full text-white hover:bg-white hover:text-folio-black transition-all"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-widest">{t.common.back}</span>
          </button>
          
          <div className="flex gap-3">
            <button className="p-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full text-white hover:bg-white/10 transition-all">
              <Share2 size={20} />
            </button>
          </div>
        </header>

        {/* Hero Info */}
        <div className="relative z-20 max-w-container-max mx-auto px-6 h-full flex flex-col justify-end pb-20">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight tracking-tight font-serif drop-shadow-2xl">
              {item.title}
            </h1>

            <div className="flex flex-wrap items-center gap-6 text-sm font-medium mb-8">
              {item.director && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-widest text-text-desc font-bold opacity-50">{item.media_type === 'movie' ? t.details.director : t.details.author}</span>
                  <span className="text-white text-base">{item.director}</span>
                </div>
              )}
              {item.year && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-widest text-text-desc font-bold opacity-50">{t.collection.card.released}</span>
                  <span className="text-white text-base">{item.year}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-container-max mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Left Column: Details */}
          <div className="lg:col-span-8 space-y-12">
            {/* Cast Section */}
            {item.cast && item.cast.length > 0 && (
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                <h3 className="text-xs uppercase tracking-[0.3em] text-text-desc font-bold mb-6 flex items-center gap-3">
                  <Users size={16} className="text-accent-gold" />
                  {t.details.cast}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {item.cast.map((person, i) => (
                    <span key={i} className="px-4 py-2 bg-white/5 border border-white/5 rounded-full text-sm text-text-primary hover:bg-white/10 transition-colors">
                      {person}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Overview Section */}
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
              <h3 className="text-xs uppercase tracking-[0.3em] text-text-desc font-bold mb-6 flex items-center gap-3">
                <BookOpen size={16} className="text-accent-gold" />
                {t.details.plot}
              </h3>
              <p className="text-lg text-text-desc leading-relaxed font-roboto max-w-3xl">
                {item.overview}
              </p>
            </section>
          </div>

          {/* Right Column: Actions */}
          <div className="lg:col-span-4">
            <div className="sticky top-32 space-y-6">
              {showAddButton && (
                <button 
                  onClick={onAddClick}
                  className="w-full py-5 bg-accent-gold text-folio-black rounded-2xl font-black uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3 hover:bg-white hover:scale-[1.02] transition-all shadow-2xl shadow-accent-gold/20 active:scale-95 group"
                >
                  <Plus size={20} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
                  {t.details.add}
                </button>
              )}

              {/* Personal Reflection Snippet (if collected) */}
              {item.created_at && (
                <div className="bg-folio-card border border-white/5 rounded-3xl p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-500">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-accent-gold/10 p-2 rounded-xl">
                        <User size={18} className="text-accent-gold" />
                      </div>
                      <span className="text-xs uppercase tracking-widest font-black text-white">{t.profile.title}</span>
                    </div>
                    <span className="text-[10px] text-text-desc font-bold opacity-50">{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-text-desc font-bold mb-2 opacity-50">{t.details.rating}</div>
                    <div className="flex items-center gap-1 text-accent-gold">
                      {[...Array(10)].map((_, i) => (
                        <Star key={i} size={14} fill={i < (item.rating || 0) ? "currentColor" : "none"} className={i < (item.rating || 0) ? "" : "text-white/10"} />
                      ))}
                      <span className="ml-2 font-bold text-lg">{item.rating}/10</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-text-desc font-bold mb-2 opacity-50">{t.details.reflection}</div>
                    <p className="text-sm text-text-desc italic leading-relaxed">
                      "{item.notes || 'No reflection inscribed yet.'}"
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}