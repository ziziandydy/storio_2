'use client';

import React from 'react';
import { Star } from 'lucide-react';
import Image from 'next/image';

interface MemoryCardTemplateProps {
  title: string;
  year?: string | number;
  posterPath: string;
  rating?: number;
  reflection?: string;
  type: string;
}

export default function MemoryCardTemplate({ 
  title, 
  year, 
  posterPath, 
  rating = 0, 
  reflection, 
  type 
}: MemoryCardTemplateProps) {
  
  // Storio Gold: #c5a059
  // Folio Black: #0d0d0d
  
  return (
    <div 
      style={{ width: '400px', height: '711px' }} // Fixed aspect ratio 9:16 for capture
      className="relative flex flex-col items-center overflow-hidden font-sans text-white bg-folio-black select-none"
    >
      {/* 1. Background Layer (Blurred Poster) */}
      <div className="absolute inset-0 z-0">
        {posterPath && (
          <img 
            src={posterPath} 
            alt="" 
            className="w-full h-full object-cover blur-[40px] opacity-40 grayscale-[0.3]"
            crossOrigin="anonymous"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-folio-black/40 via-folio-black/80 to-folio-black" />
      </div>

      {/* 2. Main Content Container */}
      <div className="relative z-10 w-full h-full flex flex-col items-center px-8 py-12">
        
        {/* Category Label */}
        <div className="mb-6 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
            <span className="text-[8px] font-black tracking-[0.3em] uppercase text-accent-gold/80">
                {type} Memory
            </span>
        </div>

        {/* Poster Card */}
        <div className="relative w-56 h-[336px] rounded-2xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)] border border-white/10 mb-8 transform hover:scale-[1.02] transition-transform">
          {posterPath ? (
            <img 
              src={posterPath} 
              alt={title} 
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
            />
          ) : (
            <div className="w-full h-full bg-folio-card flex items-center justify-center">
                <span className="text-white/20 text-xs font-bold italic">No Poster</span>
            </div>
          )}
        </div>

        {/* Title & Metadata */}
        <div className="text-center mb-6 max-w-full">
          <h1 className="text-2xl font-black font-serif tracking-tight leading-tight mb-2 drop-shadow-lg line-clamp-2 px-2">
            {title}
          </h1>
          <p className="text-[10px] font-bold text-white/40 tracking-[0.2em] uppercase">
            Captured in {year || '---'}
          </p>
        </div>

        {/* Rating Stars */}
        {rating > 0 && (
          <div className="flex gap-1.5 mb-8">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star 
                key={s} 
                size={16} 
                fill={s <= rating ? "#c5a059" : "transparent"} 
                className={s <= rating ? "text-accent-gold" : "text-white/10"} 
              />
            ))}
          </div>
        )}

        {/* Reflection Box */}
        <div className="flex-1 w-full flex flex-col items-center justify-center">
            <div className="relative p-6 bg-white/[0.03] border border-white/5 rounded-[24px] backdrop-blur-sm w-full">
                {/* Quote Icon SVG (Mini) */}
                <div className="absolute -top-3 left-6 bg-accent-gold text-folio-black rounded-lg p-1.5 shadow-lg">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017V14H15.017C13.9124 14 13.017 13.1046 13.017 12V10C13.017 8.89543 13.9124 8 15.017 8H19.017C20.1216 8 21.017 8.89543 21.017 10V18C21.017 19.6569 19.6739 21 18.017 21H14.017ZM5.017 21L5.017 18C5.017 16.8954 5.91243 16 7.017 16H10.017V14H6.017C4.91243 14 4.017 13.1046 4.017 12V10C4.017 8.89543 4.91243 8 6.017 8H10.017C11.1216 8 12.017 8.89543 12.017 10V18C12.017 19.6569 10.6739 21 9.017 21H5.017Z" /></svg>
                </div>
                <p className="text-sm font-medium text-text-secondary leading-relaxed text-center italic">
                    {reflection || "A story preserved in the folio, a memory captured in time."}
                </p>
            </div>
        </div>

        {/* Footer: Brand */}
        <div className="mt-8 flex flex-col items-center gap-2 pt-6 border-t border-white/5 w-full opacity-60">
            <div className="flex items-center gap-2">
                <img src="/image/logo/logo.png" width={16} height={16} alt="" crossOrigin="anonymous" />
                <span className="text-[10px] font-black tracking-[0.4em] uppercase text-white">Storio</span>
            </div>
            <p className="text-[8px] font-bold text-white/30 tracking-widest uppercase">
                Collect stories in your folio
            </p>
        </div>
      </div>
    </div>
  );
}
