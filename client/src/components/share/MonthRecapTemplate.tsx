'use client';

import React from 'react';
import { Story } from '@/types';

interface MonthRecapTemplateProps {
  monthName: string;
  stories: Story[];
  stats: {
    total: number;
    movies: number;
    series: number;
    books: number;
  };
}

export default function MonthRecapTemplate({ monthName, stories, stats }: MonthRecapTemplateProps) {
  
  // Show up to 12 items in the collage
  const displayStories = stories.slice(0, 12);
  const hasMore = stories.length > 12;

  return (
    <div 
      style={{ width: '400px', height: '500px' }} // Fixed aspect ratio 4:5
      className="relative flex flex-col font-sans text-white bg-folio-black overflow-hidden select-none"
    >
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent-gold/5 blur-[100px] rounded-full -mr-32 -mt-32" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-gold/5 blur-[100px] rounded-full -ml-32 -mb-32" />

      {/* 1. Header */}
      <div className="relative z-10 px-8 pt-10 pb-6">
        <p className="text-[10px] font-black tracking-[0.4em] uppercase text-accent-gold mb-2 opacity-80">Monthly Recap</p>
        <h1 className="text-3xl font-black font-serif tracking-tight text-white uppercase">
            {monthName}
        </h1>
      </div>

      {/* 2. Collage Area (Bento-ish Grid) */}
      <div className="relative z-10 flex-1 px-8 py-2">
        <div className="grid grid-cols-4 gap-3 h-full">
            {displayStories.map((story, i) => (
                <div 
                    key={story.id} 
                    className="relative rounded-lg overflow-hidden shadow-xl border border-white/5 bg-folio-card aspect-[2/3]"
                >
                    <img 
                        src={story.poster_path || '/image/defaultMoviePoster.svg'} 
                        alt="" 
                        className="w-full h-full object-cover"
                        crossOrigin="anonymous"
                    />
                    {/* If it's the last one and there's more, show overlay */}
                    {i === 11 && hasMore && (
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] flex items-center justify-center">
                            <span className="text-xs font-black text-white">+{stories.length - 11}</span>
                        </div>
                    )}
                </div>
            ))}
            
            {/* Fill empty slots if less than 4 */}
            {stories.length < 4 && Array.from({ length: 4 - stories.length }).map((_, i) => (
                <div key={`empty-${i}`} className="rounded-lg border border-dashed border-white/10 flex items-center justify-center aspect-[2/3]">
                    <div className="w-4 h-4 rounded-full bg-white/5" />
                </div>
            ))}
        </div>
      </div>

      {/* 3. Footer & Stats */}
      <div className="relative z-10 px-8 py-8 bg-gradient-to-t from-black/40 to-transparent">
        <div className="flex items-end justify-between">
            <div className="space-y-4">
                <div className="flex gap-6">
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black tracking-widest text-text-desc uppercase mb-1">Stories</span>
                        <span className="text-xl font-black text-white">{stats.total}</span>
                    </div>
                    <div className="w-px h-8 bg-white/10 self-end mb-1" />
                    <div className="flex gap-4">
                        {stats.movies > 0 && (
                            <div className="flex flex-col">
                                <span className="text-[8px] font-bold text-text-desc uppercase mb-1">Movies</span>
                                <span className="text-sm font-bold text-white/80">{stats.movies}</span>
                            </div>
                        )}
                        {stats.series > 0 && (
                            <div className="flex flex-col">
                                <span className="text-[8px] font-bold text-text-desc uppercase mb-1">Series</span>
                                <span className="text-sm font-bold text-white/80">{stats.series}</span>
                            </div>
                        )}
                        {stats.books > 0 && (
                            <div className="flex flex-col">
                                <span className="text-[8px] font-bold text-text-desc uppercase mb-1">Books</span>
                                <span className="text-sm font-bold text-white/80">{stats.books}</span>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center gap-2 pt-2">
                    <img src="/image/logo/logo.png" width={14} height={14} alt="" crossOrigin="anonymous" />
                    <span className="text-[10px] font-black tracking-[0.4em] uppercase text-white/60">Storio</span>
                </div>
            </div>
            
            <div className="text-right">
                <p className="text-[8px] font-bold text-white/20 tracking-widest uppercase italic">
                    Memories preserved in Folio
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}
