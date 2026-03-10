'use client';

import React, { useState } from 'react';
import { PlayCircle, BookOpen, Plus, Info, Stamp, Calendar, Feather, Tv } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/hooks/useTranslation';

interface StoryCardProps {
  title: string;
  type: 'movie' | 'book' | 'tv';
  subtype?: string;
  year?: number;
  external_id: string;
  posterUrl?: string;
  source: string; // Kept for logic but hidden from UI
  rating?: number;
  notes?: string;
  addedAt?: string;
  viewingNumber?: number;
  onAdd?: () => void;
  onViewDetails?: () => void;
}

const StoryCard: React.FC<StoryCardProps> = ({
  title, type, subtype, year, external_id, posterUrl, source,
  rating, notes, addedAt, viewingNumber,
  onAdd, onViewDetails
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  const handleCardClick = () => {
    if (onViewDetails) {
      onViewDetails();
    } else {
      // Default behavior for search results: toggle overlay
      setIsHovered(!isHovered);
    }
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewDetails) {
      onViewDetails();
    } else {
      router.push(`/details?type=${type}&id=${external_id}`);
    }
  };

  let typeLabel = '未知';
  if (type === 'movie') {
    typeLabel = t.common.movies;
  } else if (type === 'tv') {
    typeLabel = t.common.tv;
  } else if (type === 'book') {
    typeLabel = t.common.books;
  }

  const typeColor = 'text-accent-gold';

  // Logic for missing components
  const isMissingRating = addedAt && (!rating || rating === 0);
  const isMissingNotes = addedAt && (!notes || notes.trim() === '');

  return (
    <div
      className="group relative overflow-hidden bg-folio-black rounded-xl transition-all duration-300 h-full w-full cursor-pointer select-none shadow-lg border border-transparent hover:border-accent-gold/20"
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* --- Top Indicators --- */}

      <div className="absolute top-3 left-3 z-20 flex flex-col gap-2 items-start">
        {/* Date Badge */}
        {addedAt && (
          <div className="bg-black/60 backdrop-blur-md border border-white/10 text-white text-[9px] font-bold px-2 py-1 rounded-md shadow-lg uppercase tracking-wider flex items-center gap-1.5">
            <Calendar size={10} className="text-accent-gold" />
            {new Date(addedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        )}

        {/* Rewatch Badge */}
        {viewingNumber && viewingNumber > 1 && (
          <div className="bg-accent-gold text-folio-black text-[9px] font-black px-2 py-1 rounded shadow-[0_0_10px_rgba(233,108,38,0.3)]">
            {viewingNumber === 2 ? '2ND' : viewingNumber === 3 ? '3RD' : `${viewingNumber}TH`} {t.collection.card.view}
          </div>
        )}
      </div>

      {/* Missing Metadata Hints (Now Top-Right and LARGER) */}
      {addedAt && isMissingNotes && (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
          <div className="relative group/hint">
            <div className="p-2 bg-black/60 backdrop-blur-md rounded-full border border-accent-gold/40 text-accent-gold animate-pulse shadow-lg">
              <Feather size={18} strokeWidth={2.5} />
            </div>
            <span className="absolute top-full right-0 mt-2 text-[8px] font-black text-accent-gold uppercase tracking-widest opacity-0 group-hover/hint:opacity-100 transition-opacity bg-black/80 px-2 py-1 rounded backdrop-blur-sm whitespace-nowrap pointer-events-none border border-accent-gold/20">{t.common.inscribe}</span>
          </div>
        </div>
      )}

      {/* Main Image Container */}
      <div className="relative w-full h-full min-h-[180px]">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={title}
            className={`h-full w-full object-cover transition-all duration-700 ${isHovered && !onViewDetails ? 'scale-110 blur-sm opacity-40' : 'opacity-100 group-hover:scale-105'}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-text-desc bg-folio-outline/20">
            {type === 'movie' ? <PlayCircle size={40} strokeWidth={1} /> : type === 'tv' ? <Tv size={40} strokeWidth={1} /> : <BookOpen size={40} strokeWidth={1} />}
          </div>
        )}

        {/* Bottom Gradient Overlay */}
        <div className={`absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/60 to-transparent transition-opacity duration-300 pointer-events-none ${isHovered && !onViewDetails ? 'opacity-0' : 'opacity-100'}`}></div>

        {/* Content Info */}
        <div className={`absolute inset-x-0 bottom-0 p-4 flex flex-col justify-end gap-1 transition-opacity duration-300 ${isHovered && !onViewDetails ? 'opacity-0' : 'opacity-100'}`}>
          {/* Folio Metadata */}
          {addedAt && (
            <div className="flex flex-col gap-1 mb-2">
              <div className="flex items-center gap-2">
                {rating && rating > 0 ? (
                  <div className="flex items-center gap-1 bg-accent-gold/10 backdrop-blur-md border border-accent-gold/30 px-1.5 py-0.5 rounded text-accent-gold">
                    <Stamp size={10} className="text-accent-gold" />
                    <span className="text-[10px] font-black tracking-wide">{rating}</span>
                  </div>
                ) : (
                  <div className="flex items-center bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-accent-gold border border-accent-gold/40 shadow-sm animate-pulse">
                    <span className="font-black text-[8px] tracking-widest uppercase">SCORE</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`${typeColor}`}>
              {type === 'movie' ? <PlayCircle size={10} /> : type === 'tv' ? <Tv size={10} /> : <BookOpen size={10} />}
            </span>
            <span className={`text-[9px] uppercase tracking-[0.2em] font-bold ${typeColor} drop-shadow-md flex items-center`}>
              {typeLabel}
              {year && <span className="text-white/40 ml-1.5 font-medium tracking-normal">({t.collection.card.released} {year})</span>}
            </span>
          </div>
          <h3 className="text-sm font-bold text-white leading-tight line-clamp-2 drop-shadow-md font-sans">
            {title}
          </h3>
        </div>

        {/* Active Overlay Actions (Only for Search results) */}
        {!onViewDetails && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 bg-black/80 backdrop-blur-md transition-all duration-300 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>

            {onAdd && (
              <button
                onClick={(e) => { e.stopPropagation(); onAdd(); }}
                className="w-full py-3 bg-accent-gold text-folio-black rounded-lg font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white hover:scale-105 transition-all shadow-xl"
              >
                <Plus size={16} strokeWidth={3} />
                {t.common.add}
              </button>
            )}

            <button
              onClick={handleViewDetails}
              className="w-full py-3 bg-white/10 backdrop-blur text-white border border-white/20 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/20 hover:border-white/40 transition-all"
            >
              <Info size={16} />
              {t.common.details}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryCard;
