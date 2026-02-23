'use client';

import React from 'react';
import { Star } from 'lucide-react';

interface MemoryCardTemplateProps {
  title: string;
  year?: string | number;
  posterPath: string;
  rating?: number;
  reflection?: string;
  type: string;
  page_count?: number;
  aspectRatio?: '9:16' | '4:5' | '1:1';
  selectedTemplate?: 'default' | 'pure' | 'ticket' | '3d';
  showTitle?: boolean;
  showRating?: boolean;
  showReflection?: boolean;
}

export default function MemoryCardTemplate({ 
  title, 
  year, 
  posterPath, 
  rating = 0, 
  reflection, 
  type,
  page_count,
  aspectRatio = '9:16',
  selectedTemplate = 'default',
  showTitle = true,
  showRating = true,
  showReflection = true
}: MemoryCardTemplateProps) {
  
  // Dimensions based on ratio
  const dimensions = {
    '9:16': { width: '400px', height: '711px' },
    '4:5': { width: '400px', height: '500px' },
    '1:1': { width: '400px', height: '400px' }
  };

  const currentDim = dimensions[aspectRatio];

  // Template Styles
  if (selectedTemplate === 'pure') {
    return (
        <div style={currentDim} className="bg-folio-black flex items-center justify-center overflow-hidden">
            <img 
                src={posterPath} 
                alt={title} 
                className="w-full h-full object-cover" 
                crossOrigin="anonymous"
            />
        </div>
    );
  }

  // --- Cinema Ticket Template ---
  if (selectedTemplate === 'ticket') {
    return (
        <div 
            style={currentDim} 
            className="bg-folio-black p-8 flex items-center justify-center font-serif text-folio-black"
        >
            <div className="w-full h-full bg-[#e5e5e5] rounded-lg relative flex flex-col shadow-2xl overflow-hidden">
                {/* Perforated Edge (Top) */}
                <div className="absolute top-0 inset-x-0 h-4 flex justify-around items-center -mt-2">
                    {Array.from({ length: 15 }).map((_, i) => (
                        <div key={i} className="w-3 h-3 rounded-full bg-folio-black" />
                    ))}
                </div>

                {/* Ticket Header */}
                <div className="p-6 border-b-2 border-dashed border-folio-black/20 flex justify-between items-start">
                    <div className="space-y-1">
                        <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Admit One</p>
                        <h2 className="text-xl font-black leading-tight uppercase">{title}</h2>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black">{year}</p>
                        <p className="text-[8px] font-bold uppercase">{type}</p>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 p-6 flex flex-col">
                    <div className="relative flex-1 rounded-md overflow-hidden border-2 border-folio-black mb-4">
                        <img src={posterPath} alt="" className="w-full h-full object-cover grayscale contrast-125" crossOrigin="anonymous" />
                    </div>
                    
                    <div className="space-y-4">
                        {showRating && (
                            <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map(s => (
                                    <Star key={s} size={14} fill={s <= rating ? "currentColor" : "none"} />
                                ))}
                            </div>
                        )}
                        {showReflection && reflection && (
                            <p className="text-[10px] leading-relaxed italic border-l-2 border-folio-black pl-3 py-1 font-sans font-medium">
                                "{reflection}"
                            </p>
                        )}
                    </div>
                </div>

                {/* Ticket Footer / Stub */}
                <div className="p-6 border-t-2 border-dashed border-folio-black/20 bg-black/5 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <img src="/image/logo/logo.png" width={14} height={14} className="grayscale" />
                        <span className="text-[10px] font-black tracking-tighter">STORIO FOLIO</span>
                    </div>
                    {/* Fake QR/Barcode Placeholder */}
                    <div className="w-12 h-12 bg-white p-1 border border-black/10">
                        <div className="w-full h-full bg-black/10 flex flex-wrap gap-[1px]">
                            {Array.from({ length: 64 }).map((_, i) => (
                                <div key={i} className={`w-[2px] h-[2px] ${Math.random() > 0.5 ? 'bg-black' : 'bg-transparent'}`} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Perforated Edge (Bottom) */}
                <div className="absolute bottom-0 inset-x-0 h-4 flex justify-around items-center -mb-2">
                    {Array.from({ length: 15 }).map((_, i) => (
                        <div key={i} className="w-3 h-3 rounded-full bg-folio-black" />
                    ))}
                </div>
            </div>
        </div>
    );
  }

  // --- 3D Book Template ---
  if (selectedTemplate === '3d') {
    const spineWidth = page_count ? Math.max(10, Math.min(page_count / 15, 40)) : 25;
    
    return (
        <div style={currentDim} className="bg-[#1a1a1a] flex flex-col items-center justify-center p-8 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-black via-folio-black to-[#222]" />
            
            {/* 3D Book Container */}
            <div className="relative perspective-[1000px] hover:rotate-y-[-10deg] transition-transform duration-700">
                <div 
                    className="relative transform-style-3d shadow-[20px_20px_60px_rgba(0,0,0,0.8)]"
                    style={{ 
                        width: '200px', 
                        height: '300px', 
                        transform: 'rotateY(-25deg) rotateX(5deg)' 
                    }}
                >
                    {/* Front Cover */}
                    <div className="absolute inset-0 z-20 rounded-sm overflow-hidden border-r border-white/10">
                        <img src={posterPath} alt={title} className="w-full h-full object-cover" crossOrigin="anonymous" />
                        <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-black/20" />
                    </div>
                    
                    {/* Spine */}
                    <div 
                        className="absolute top-0 right-full h-full bg-[#222] origin-right"
                        style={{ 
                            width: `${spineWidth}px`, 
                            transform: 'rotateY(-90deg)',
                            backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.5), rgba(255,255,255,0.1), rgba(0,0,0,0.5))`
                        }}
                    >
                        <div className="w-full h-full flex flex-col items-center justify-center p-2">
                            <span className="text-[6px] font-bold text-white/40 uppercase whitespace-nowrap rotate-90 w-max">{title}</span>
                        </div>
                    </div>

                    {/* Pages (Right edge) */}
                    <div 
                        className="absolute top-0 left-full h-full bg-[#f5f5f5] origin-left shadow-inner"
                        style={{ 
                            width: `${spineWidth * 0.8}px`, 
                            transform: 'rotateY(90deg)',
                            backgroundImage: 'repeating-linear-gradient(to right, #ddd, #ddd 1px, #f5f5f5 1px, #f5f5f5 3px)'
                        }}
                    />
                </div>
            </div>

            {/* Info overlay below book */}
            <div className="relative z-10 mt-12 text-center space-y-4 max-w-xs">
                {showTitle && <h2 className="text-xl font-serif font-black text-white">{title}</h2>}
                {showRating && (
                    <div className="flex justify-center gap-1">
                        {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} size={14} fill={s <= rating ? "#c5a059" : "none"} className={s <= rating ? "text-accent-gold" : "text-white/10"} />
                        ))}
                    </div>
                )}
                {showReflection && reflection && (
                    <p className="text-xs text-text-desc italic leading-relaxed opacity-80">"{reflection}"</p>
                )}
            </div>
            
            <div className="absolute bottom-8 flex items-center gap-2 opacity-30">
                <img src="/image/logo/logo.png" width={12} height={12} className="grayscale" />
                <span className="text-[8px] font-black tracking-widest text-white">STORIO</span>
            </div>
        </div>
    );
  }

  // --- Default Blur Template ---
  return (
    <div 
      style={currentDim} 
      className="relative flex flex-col items-center overflow-hidden font-sans text-white bg-folio-black select-none"
    >
      <div className="absolute inset-0 z-0">
        <img 
          src={posterPath} 
          alt="" 
          className="w-full h-full object-cover blur-[40px] opacity-40 grayscale-[0.3]"
          crossOrigin="anonymous"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-folio-black/40 via-folio-black/80 to-folio-black" />
      </div>

      <div className="relative z-10 w-full h-full flex flex-col items-center px-8 py-12">
        <div className="mb-6 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
            <span className="text-[8px] font-black tracking-[0.3em] uppercase text-accent-gold/80">
                {type} Memory
            </span>
        </div>

        <div className="relative w-56 h-[336px] rounded-2xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)] border border-white/10 mb-8">
          <img src={posterPath} alt={title} className="w-full h-full object-cover" crossOrigin="anonymous" />
        </div>

        {showTitle && (
            <div className="text-center mb-6 max-w-full">
                <h1 className="text-2xl font-black font-serif tracking-tight leading-tight mb-2 drop-shadow-lg line-clamp-2 px-2">
                    {title}
                </h1>
                <p className="text-[10px] font-bold text-white/40 tracking-[0.2em] uppercase">
                    Captured in {year || '---'}
                </p>
            </div>
        )}

        {showRating && rating > 0 && (
          <div className="flex gap-1.5 mb-8">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} size={16} fill={s <= rating ? "#c5a059" : "transparent"} className={s <= rating ? "text-accent-gold" : "text-white/10"} />
            ))}
          </div>
        )}

        {showReflection && (
            <div className="flex-1 w-full flex flex-col items-center justify-center">
                <div className="relative p-6 bg-white/[0.03] border border-white/5 rounded-[24px] backdrop-blur-sm w-full">
                    <div className="absolute -top-3 left-6 bg-accent-gold text-folio-black rounded-lg p-1.5 shadow-lg">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017V14H15.017C13.9124 14 13.017 13.1046 13.017 12V10C13.017 8.89543 13.9124 8 15.017 8H19.017C20.1216 8 21.017 8.89543 21.017 10V18C21.017 19.6569 19.6739 21 18.017 21H14.017ZM5.017 21L5.017 18C5.017 16.8954 5.91243 16 7.017 16H10.017V14H6.017C4.91243 14 4.017 13.1046 4.017 12V10C4.017 8.89543 4.91243 8 6.017 8H10.017C11.1216 8 12.017 8.89543 12.017 10V18C12.017 19.6569 10.6739 21 9.017 21H5.017Z" /></svg>
                    </div>
                    <p className="text-sm font-medium text-text-secondary leading-relaxed text-center italic">
                        {reflection || "A story preserved in the folio."}
                    </p>
                </div>
            </div>
        )}

        <div className="mt-8 flex flex-col items-center gap-2 pt-6 border-t border-white/5 w-full opacity-60">
            <div className="flex items-center gap-2">
                <img src="/image/logo/logo.png" width={16} height={16} alt="" crossOrigin="anonymous" />
                <span className="text-[10px] font-black tracking-[0.4em] uppercase text-white">Storio</span>
            </div>
        </div>
      </div>
    </div>
  );
}