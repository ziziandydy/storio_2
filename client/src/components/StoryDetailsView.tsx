'use client';

import React from 'react';
import { 
  ArrowLeft, Star, Calendar, Clock, Globe, 
  User, Users, BookOpen, Film, Tv, Share2, Plus, Trash2,
  ChevronRight, Info, Play, Copy
} from 'lucide-react';
import Image from 'next/image';
import { useTranslation } from '@/hooks/useTranslation';
import { ItemDetail } from '@/types';
import { useToast } from '@/components/ToastProvider';
import ShareModal from '@/components/ShareModal';
import MemoryCardTemplate from '@/components/share/MemoryCardTemplate';

interface StoryDetailsViewProps {
  item: ItemDetail;
  showAddButton?: boolean;
  onAddClick?: () => void;
  onBack: () => void;
}

export default function StoryDetailsView({ item, showAddButton = true, onAddClick, onBack }: StoryDetailsViewProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = React.useState(false);
  
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

  // Formatting helpers
  const formatMoney = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: "compact" }).format(amount);
  };

  const handleCopyISBN = () => {
    if (item.isbn) {
        navigator.clipboard.writeText(item.isbn);
        showToast("ISBN Copied", "success");
    }
  };

  const streamProviders = item.streaming_providers?.filter(p => p.type === 'flatrate') || [];
  const rentBuyProviders = item.streaming_providers?.filter(p => p.type === 'rent' || p.type === 'buy') || [];
  
  // Deduplicate rent/buy providers
  const uniqueRentBuy = Array.from(new Map(rentBuyProviders.map(item => [item.provider_name, item])).values());

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
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
                <span className="text-accent-gold">
                {item.media_type === 'movie' ? <Film size={14} /> : item.media_type === 'tv' ? <Tv size={14} /> : <BookOpen size={14} />}
                </span>
                <span className="text-[10px] uppercase tracking-[0.3em] font-black text-accent-gold">
                {item.media_type === 'movie' ? t.common.movies : item.media_type === 'tv' ? t.common.tv : t.common.books}
                </span>
            </div>
            {item.status && (
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-[9px] font-bold uppercase tracking-wider text-text-desc border border-white/5">
                    {item.status}
                </span>
            )}
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black text-white mb-2 leading-tight tracking-tight font-serif drop-shadow-2xl">
            {item.title}
          </h1>
          {item.subtitle && (
            <h2 className="text-lg md:text-xl text-text-secondary font-medium mb-6 opacity-80">
                {item.subtitle}
            </h2>
          )}

          {/* Genres Row */}
          {item.genres && item.genres.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
                {item.genres.map(genre => (
                    <span key={genre} className="whitespace-nowrap px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                        {genre}
                    </span>
                ))}
            </div>
          )}

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
            
            {/* The Dossier (Data Grid) */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Condition 1: Movie/TV Revenue */}
                {item.media_type !== 'book' && item.revenue && item.revenue > 0 ? (
                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col justify-center">
                        <span className="text-[9px] text-text-desc uppercase tracking-widest mb-1">{t.details.revenue}</span>
                        <span className="text-white font-bold font-mono">{formatMoney(item.revenue)}</span>
                    </div>
                ) : null}

                {/* Condition 2: Book ISBN */}
                {item.media_type === 'book' && item.isbn && (
                    <div 
                        onClick={handleCopyISBN}
                        className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col justify-center cursor-pointer hover:bg-white/10 transition-colors group relative"
                    >
                        <span className="text-[9px] text-text-desc uppercase tracking-widest mb-1 flex items-center gap-1">
                            {t.details.isbn} <Copy size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </span>
                        <span className="text-white font-bold font-mono text-sm">{item.isbn}</span>
                    </div>
                )}

                {/* Condition 3: Book Pages */}
                {item.media_type === 'book' && item.page_count && (
                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col justify-center">
                        <span className="text-[9px] text-text-desc uppercase tracking-widest mb-1">{t.details.pages}</span>
                        <span className="text-white font-bold">{item.page_count}</span>
                    </div>
                )}

                {/* Shared: Studio / Publisher */}
                {(item.production_companies?.length ?? 0) > 0 || item.publisher ? (
                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col justify-center overflow-hidden">
                        <span className="text-[9px] text-text-desc uppercase tracking-widest mb-1">{item.media_type === 'book' ? t.details.publisher : t.details.studio}</span>
                        <span className="text-white font-bold truncate block w-full" title={item.publisher || item.production_companies?.[0]}>
                            {item.publisher || item.production_companies?.[0]}
                        </span>
                    </div>
                ) : null}

                {/* Shared: Origin / Language */}
                {item.origin_country && (
                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col justify-center">
                        <span className="text-[9px] text-text-desc uppercase tracking-widest mb-1">{t.details.origin}</span>
                        <span className="text-white font-bold">{item.origin_country}</span>
                    </div>
                )}
                {item.original_language && (
                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col justify-center">
                        <span className="text-[9px] text-text-desc uppercase tracking-widest mb-1">{t.details.originalLanguage}</span>
                        <span className="text-white font-bold uppercase">{item.original_language}</span>
                    </div>
                )}
            </section>

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
          </div>

          {/* Right Column: Actions */}
          <div className="lg:col-span-4">
            <div className="sticky top-32 space-y-6">
              
              {/* Where to Watch Guide (Moved Above Add Button) */}
              {(streamProviders.length > 0 || uniqueRentBuy.length > 0) && (
                <div className="bg-[#121212] border border-white/5 rounded-2xl p-5 space-y-4 shadow-xl animate-in fade-in zoom-in-95 duration-500">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-desc mb-2 flex items-center gap-2">
                        <Play size={12} className="text-accent-gold" /> {item.media_type === 'book' ? t.details.whereToRead : t.details.whereToWatch}
                    </h4>
                    
                    {streamProviders.length > 0 && (
                        <div>
                            <div className="text-[9px] uppercase tracking-wider text-text-desc/60 mb-2">{t.details.stream}</div>
                            <div className="flex flex-wrap gap-3">
                                {streamProviders.map((p, i) => (
                                    <div key={i} className="w-10 h-10 rounded-xl overflow-hidden shadow-lg border border-white/10 relative group" title={p.provider_name}>
                                        <Image src={p.logo_path} alt={p.provider_name} fill className="object-cover" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {uniqueRentBuy.length > 0 && (
                        <div className={streamProviders.length > 0 ? "pt-2 border-t border-white/5" : ""}>
                            <div className="text-[9px] uppercase tracking-wider text-text-desc/60 mb-2">{t.details.rent}</div>
                            <div className="flex flex-wrap gap-3">
                                {uniqueRentBuy.map((p, i) => (
                                    <div key={i} className="w-10 h-10 rounded-xl overflow-hidden shadow-lg border border-white/10 relative group" title={p.provider_name}>
                                        <Image src={p.logo_path} alt={p.provider_name} fill className="object-cover" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
              )}

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
                <div className="bg-folio-card border border-white/5 rounded-3xl p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-500 relative group/archive">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-accent-gold/10 p-2 rounded-xl">
                        <User size={18} className="text-accent-gold" />
                      </div>
                      <span className="text-xs uppercase tracking-widest font-black text-white">{t.profile.title}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] text-text-desc font-bold opacity-50">{new Date(item.created_at).toLocaleDateString()}</span>
                        <button 
                            onClick={() => setIsShareModalOpen(true)}
                            className="p-2 rounded-full bg-white/5 text-accent-gold hover:bg-accent-gold hover:text-folio-black transition-all hover:scale-110 active:scale-95 shadow-xl"
                            title={t.details.share}
                        >
                            <Share2 size={14} />
                        </button>
                    </div>
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

      {/* Share Modal */}
      {item.created_at && (
        <ShareModal 
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            title={t.details.share}
            fileName={`storio-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
            item={{
                title: item.title,
                year: item.year,
                posterPath: item.poster_path || '',
                rating: (item.rating || 0) / 2, // 10分制轉為5星制
                reflection: item.notes,
                type: item.media_type,
                page_count: item.page_count
            }}
        />
      )}
    </div>
  );
}