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
    director?: string; // Legacy fallback
    directors?: string[]; // New array support
    author?: string; // Legacy fallback
    authors?: string[]; // New array support
    cast?: string[];
    overview: string;
    poster_path?: string;
    backdrop_path?: string;
    source: string;
    rating?: number;
    notes?: string;
    created_at?: string;
    related_media?: {
      type: 'video' | 'image' | 'link';
      url: string;
      thumbnail?: string;
      title: string;
    }[];
  };
  showAddButton?: boolean;
  onAddClick?: () => void;
  onBack: () => void;
}

export default function StoryDetailsView({ item, showAddButton = true, onAddClick, onBack }: StoryDetailsViewProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = React.useState(false);
  
  if (!item) return null;

  const OVERVIEW_LIMIT = 320;
  const isTooLong = item.overview?.length > OVERVIEW_LIMIT;
  const displayOverview = (isTooLong && !isExpanded) 
    ? item.overview.substring(0, OVERVIEW_LIMIT) + '...' 
    : item.overview;

  // Helper to get primary creator (director or author)
  const creators = item.directors || (item.director ? [item.director] : []) || [];
  const writers = item.authors || (item.author ? [item.author] : []) || [];
  const showCreators = item.media_type === 'book' ? writers : creators;
  const creatorLabel = item.media_type === 'book' ? t.details.author : t.details.director;

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
            className="object-cover opacity-60 scale-105"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-folio-black/10 via-folio-black/20 to-folio-black/80 z-10" />
          <div className="absolute inset-0 bg-gradient-to-r from-folio-black/40 via-transparent to-transparent z-10" />
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
        </header>
      </div>

      {/* Main Content Area */}
      <div className="max-w-container-max mx-auto px-6 py-12">
        {/* Title & Metadata Header (Moved below poster) */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-accent-gold">
              {item.media_type === 'movie' ? <Film size={14} /> : item.media_type === 'tv' ? <Tv size={14} /> : <BookOpen size={14} />}
            </span>
            <span className="text-[10px] uppercase tracking-[0.3em] font-black text-accent-gold">
              {item.media_type === 'movie' ? t.common.movies : item.media_type === 'tv' ? t.common.tv : t.common.books}
            </span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight tracking-tight font-serif drop-shadow-2xl">
            {item.title}
          </h1>

          <div className="flex flex-wrap items-center gap-6 text-sm font-medium">
            {showCreators.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-widest text-text-desc font-bold opacity-50">{creatorLabel}</span>
                <span className="text-white text-base">{showCreators.join(', ')}</span>
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Left Column: Details */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* Overview Section */}
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
              <h3 className="text-xs uppercase tracking-[0.3em] text-text-desc font-bold mb-6 flex items-center gap-3">
                <BookOpen size={16} className="text-accent-gold" />
                {t.details.plot}
              </h3>
              <div className="space-y-4 max-w-3xl">
                <p className="text-lg text-text-desc leading-relaxed font-roboto">
                  {displayOverview}
                </p>
                {isTooLong && (
                  <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-accent-gold text-xs font-bold uppercase tracking-widest hover:underline flex items-center gap-1"
                  >
                    {isExpanded ? 'View Less' : 'View More'}
                    <ChevronRight size={14} className={isExpanded ? "-rotate-90 transition-transform" : "rotate-90 transition-transform"} />
                  </button>
                )}
              </div>
            </section>

            {/* Related Media (Trailers/Images) */}
            {item.related_media && item.related_media.length > 0 && (
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <h3 className="text-xs uppercase tracking-[0.3em] text-text-desc font-bold mb-6 flex items-center gap-3">
                  <Film size={16} className="text-accent-gold" />
                  Media & Trailers
                </h3>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                  {item.related_media.map((media, i) => (
                    <a 
                      key={i} 
                      href={media.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="relative min-w-[200px] aspect-video rounded-xl overflow-hidden group border border-white/10 snap-center"
                    >
                      {media.thumbnail ? (
                        <Image src={media.thumbnail} alt={media.title} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full bg-white/5 flex items-center justify-center">
                          <Film size={24} className="text-white/20" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        {media.type === 'video' ? <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center"><div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-1"></div></div> : null}
                      </div>
                      <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black to-transparent">
                        <p className="text-[10px] font-bold text-white truncate">{media.title}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}
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