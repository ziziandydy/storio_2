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
  selectedTemplate?: 'default' | 'pure' | 'ticket' | '3d' | 'tv';
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

  // --- Helper: Stamp Component ---
  const StampRating = () => (
    <div className="border-4 border-accent-gold/40 rounded-xl px-4 py-2 flex flex-col items-center justify-center transform -rotate-12 backdrop-blur-sm bg-black/10 shadow-lg">
        <span className="text-[10px] font-black uppercase tracking-widest text-accent-gold/80 mb-1">Score</span>
        <span className="text-4xl font-serif font-black text-accent-gold drop-shadow-sm">
            {rating ? Math.round(rating * 2) : '-'}
        </span>
    </div>
  );

  // --- Pure Image Template ---
  if (selectedTemplate === 'pure') {
    return (
        <div style={currentDim} className="bg-folio-black flex items-center justify-center overflow-hidden relative">
            <img 
                src={posterPath} 
                alt={title} 
                className="w-full h-full object-cover" 
                crossOrigin="anonymous"
            />
            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
            
            {/* Content Overlay */}
            <div className="absolute inset-0 flex flex-col justify-end p-8 space-y-6">
                 {/* Top: Stamp */}
                 {showRating && rating > 0 && (
                    <div className="absolute top-8 right-8">
                        <StampRating />
                    </div>
                 )}

                 {/* Bottom: Text Info */}
                 <div className="space-y-4">
                    {showTitle && (
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-0.5 bg-accent-gold/20 backdrop-blur-md rounded text-[8px] font-black uppercase tracking-widest text-accent-gold border border-accent-gold/20">
                                    {type}
                                </span>
                                <span className="text-[10px] font-bold text-white/60 tracking-widest uppercase">{year}</span>
                            </div>
                            <h1 className="text-3xl font-black font-serif text-white leading-tight drop-shadow-lg line-clamp-3">
                                {title}
                            </h1>
                        </div>
                    )}

                    {showReflection && reflection && (
                        <div className="relative pl-4 border-l-2 border-accent-gold/50">
                            <p className="text-xs font-medium text-white/90 leading-relaxed italic line-clamp-3 drop-shadow-md">
                                "{reflection}"
                            </p>
                        </div>
                    )}
                 </div>

                 {/* Branding */}
                 <div className="pt-4 border-t border-white/10 flex items-center gap-2 opacity-80">
                    <img src="/image/logo/logo.png" width={14} height={14} alt="Storio" crossOrigin="anonymous" />
                    <span className="text-[10px] font-black tracking-[0.3em] text-white uppercase">Storio Folio</span>
                 </div>
            </div>
        </div>
    );
  }

  // --- Retro TV Template (New) ---
  if (selectedTemplate === 'tv') {
    const displayType = type === 'tv' ? 'TV Series' : type;
    
    return (
        <div style={currentDim} className="bg-[#1a1a1a] flex flex-col items-center justify-center p-8 overflow-hidden relative font-mono">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            
            {/* TV Frame */}
            <div className="relative z-10 bg-[#2b2b2b] p-4 pb-6 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.8)] border-4 border-[#3a3a3a] w-full max-w-[340px] flex flex-col items-center">
                {/* Screen */}
                <div className="relative w-full aspect-square bg-black rounded-[20px] overflow-hidden border-4 border-black shadow-inner">
                    <img 
                        src={posterPath} 
                        alt={title} 
                        className="w-full h-full object-contain opacity-90 contrast-125 saturate-125 bg-black/40" 
                        crossOrigin="anonymous" 
                    />
                    
                    {/* Scanlines Effect */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_4px,6px_100%] pointer-events-none"></div>
                    
                    {/* Screen Glare */}
                    <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-white/5 to-transparent skew-x-12 opacity-30 z-20"></div>
                </div>

                {/* TV Controls */}
                <div className="w-full flex justify-between items-center mt-4 px-2">
                    <div className="flex gap-2 items-center">
                        <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse"></div>
                        <span className="text-[8px] text-white/40 tracking-widest uppercase">REC</span>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full border-2 border-[#111] bg-[#222] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] flex items-center justify-center">
                            <div className="w-1 h-3 bg-white/20 rounded-full"></div>
                        </div>
                        <div className="w-8 h-8 rounded-full border-2 border-[#111] bg-[#222] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] flex items-center justify-center">
                            <div className="w-3 h-3 border-t-2 border-white/20 rounded-full rotate-45"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Info Overlay */}
            <div className="mt-8 text-center space-y-4 z-10 w-full max-w-[300px] flex flex-col items-center">
                {showTitle && <h2 className="text-xl font-bold text-white tracking-tight uppercase line-clamp-2 w-full">{title}</h2>}
                
                {showRating && rating > 0 && (
                    <div className="transform scale-75 -mt-2">
                        <StampRating />
                    </div>
                )}

                {showReflection && reflection && (
                    <div className="bg-black/40 border border-white/10 p-3 rounded-lg backdrop-blur-sm w-full">
                        <p className="text-[10px] text-text-desc leading-relaxed line-clamp-3">
                            "{reflection}"
                        </p>
                    </div>
                )}
            </div>

            {/* Footer Logo */}
            <div className="absolute bottom-6 flex items-center gap-2 opacity-40">
                <img src="/image/logo/logo.png" width={14} height={14} alt="Storio" crossOrigin="anonymous" className="grayscale" />
                <span className="text-[10px] font-black tracking-[0.3em] text-white uppercase">Storio</span>
            </div>
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
                        <h2 className="text-xl font-black leading-tight uppercase line-clamp-2">{title}</h2>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black">{year}</p>
                        <p className="text-[8px] font-bold uppercase">{type}</p>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 p-6 flex flex-col items-center min-h-0 w-full">
                    <div className="relative flex-1 w-full rounded-md overflow-hidden border-2 border-folio-black mb-4 min-h-0 bg-white/40">
                        <img src={posterPath} alt="" className="w-full h-full object-contain contrast-125" crossOrigin="anonymous" />
                    </div>
                    
                    <div className="space-y-4 shrink-0 flex flex-col items-center w-full">
                        {showRating && rating > 0 && (
                            <div className="transform scale-75 -my-2">
                                <StampRating />
                            </div>
                        )}
                        {showReflection && reflection && (
                            <p className="text-[10px] leading-relaxed italic border-l-2 border-folio-black pl-3 py-1 font-sans font-medium line-clamp-3 text-center w-full">
                                "{reflection}"
                            </p>
                        )}
                    </div>
                </div>

                {/* Ticket Footer / Stub */}
                <div className="p-6 border-t-2 border-dashed border-folio-black/20 bg-black/5 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <img src="/image/logo/logo.png" width={14} height={14} className="grayscale" crossOrigin="anonymous" />
                        <span className="text-[10px] font-black tracking-tighter">STORIO FOLIO</span>
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
    // Standardized spine width for aesthetic consistency
    const spineWidth = 120;
    
    return (
        <div style={currentDim} className="bg-[#1a1a1a] flex flex-col items-center justify-center overflow-hidden relative font-serif">
            {/* Bookshelf Background Environment */}
            <div className="absolute inset-0 bg-[#120f0d]">
                {/* Wall/Back of shelf */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05),transparent_70%)] opacity-50" />
                <div className="absolute inset-0" style={{ 
                    backgroundImage: 'repeating-linear-gradient(90deg, rgba(0,0,0,0.2) 0px, rgba(0,0,0,0.2) 1px, transparent 1px, transparent 40px)',
                    opacity: 0.1 
                }} />
                
                {/* The Shelf Surface */}
                <div className="absolute bottom-0 inset-x-0 h-32 bg-[#2d241e] shadow-[0_-5px_20px_rgba(0,0,0,0.5)] border-t border-[#3e322a]">
                    <div className="absolute inset-0 opacity-20" style={{ 
                        backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100\' height=\'100\' filter=\'url(%23noise)\' opacity=\'0.5\'/%3E%3C/svg%3E")',
                    }} />
                    {/* Shadow cast by book on shelf */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-8 bg-black/60 blur-xl rounded-full transform scale-x-150 translate-y-2" />
                </div>
            </div>

            {/* Lighting Spot */}
            <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-orange-100/10 to-transparent pointer-events-none z-10 blur-3xl" />
            
            {/* 3D Book Container */}
            <div className="relative z-20 perspective-[1200px] mb-12">
                <div 
                    className="relative transform-style-3d transition-transform duration-500 ease-out hover:rotate-y-[-15deg] hover:rotate-x-[5deg]"
                    style={{ 
                        width: '220px', 
                        height: '340px', 
                        transform: 'rotateY(-25deg) rotateX(5deg) rotateZ(-2deg)' 
                    }}
                >
                    {/* Front Cover */}
                    <div className="absolute inset-0 z-30 rounded-[2px] overflow-hidden bg-[#1a1a1a] shadow-[-2px_0_5px_rgba(0,0,0,0.5)]">
                        <img src={posterPath} alt={title} className="w-full h-full object-cover" crossOrigin="anonymous" />
                        
                        {/* Realistic Lighting/Sheen on cover */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/10 mix-blend-overlay" />
                        <div className="absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-black/60 to-transparent opacity-80" /> {/* Spine crease shadow */}
                        
                         {/* Hardcover indentation line */}
                        <div className="absolute left-3 inset-y-0 w-[1px] bg-white/20 opacity-30 mix-blend-overlay" />
                    </div>
                    
                    {/* Spine */}
                    <div 
                        className="absolute top-0 right-full h-full bg-[#111] origin-right flex flex-col items-center justify-center overflow-hidden border-l border-white/5"
                        style={{ 
                            width: `${spineWidth}px`, 
                            transform: 'rotateY(-90deg)',
                        }}
                    >
                        {/* Spine texture/color extracted from poster (approximated dark) */}
                         <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/80 z-10" />
                         <img src={posterPath} alt="" className="absolute w-full h-full object-cover blur-sm brightness-50" crossOrigin="anonymous" />
                         
                         {/* Spine Text */}
                        <div className="relative z-20 w-full h-full flex flex-col items-center justify-between py-6">
                            <span className="text-[8px] font-black text-accent-gold/60 uppercase tracking-widest rotate-90 whitespace-nowrap">Storio</span>
                            <span className="text-[10px] font-bold text-white/90 uppercase tracking-wider rotate-90 line-clamp-2 w-48 text-center" style={{ textShadow: '0 1px 2px black' }}>{title}</span>
                            <span className="text-[8px] font-mono text-white/40 rotate-90">{year}</span>
                        </div>
                    </div>

                    {/* Back Cover (Visible slightly) */}
                    <div 
                        className="absolute top-0 left-0 h-full w-full bg-[#1a1a1a] origin-left -z-10"
                        style={{ 
                            transform: `translateZ(-${spineWidth}px)`,
                            boxShadow: '-10px 10px 30px rgba(0,0,0,0.8)'
                        }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-l from-black/80 to-transparent" />
                    </div>

                    {/* Pages (Top) */}
                    <div 
                        className="absolute top-0 left-0 w-full bg-[#fdfdfd] origin-top"
                        style={{ 
                            height: `${spineWidth - 4}px`, 
                            transform: `translateY(2px) translateZ(-${spineWidth - 2}px) rotateX(90deg)`,
                            backgroundImage: 'repeating-linear-gradient(90deg, #fdfdfd, #fdfdfd 1px, #f0f0f0 2px, #f0f0f0 3px)'
                        }}
                    />

                    {/* Pages (Right) */}
                    <div 
                        className="absolute top-[2px] right-[2px] h-[calc(100%-4px)] bg-[#fdfdfd] origin-right"
                        style={{ 
                            width: `${spineWidth - 4}px`, 
                            transform: `translateZ(-2px) rotateY(90deg)`,
                            backgroundImage: 'repeating-linear-gradient(to bottom, #fdfdfd, #fdfdfd 1px, #f0f0f0 2px, #f0f0f0 3px)',
                            boxShadow: 'inset 5px 0 10px -5px rgba(0,0,0,0.2)'
                        }}
                    />

                    {/* Pages (Bottom) */}
                    <div 
                        className="absolute bottom-0 left-0 w-full bg-[#fdfdfd] origin-bottom"
                        style={{ 
                            height: `${spineWidth - 4}px`, 
                            transform: `translateY(-2px) translateZ(-${spineWidth - 2}px) rotateX(-90deg)`,
                             backgroundImage: 'repeating-linear-gradient(90deg, #fdfdfd, #fdfdfd 1px, #f0f0f0 2px, #f0f0f0 3px)'
                        }}
                    />
                </div>
            </div>

            {/* Info Overlay (Floating above shelf) */}
            <div className="relative z-30 text-center space-y-3 max-w-[280px] flex flex-col items-center">
                {/* Title Card */}
                {showTitle && (
                    <div className="bg-black/60 backdrop-blur-md border border-white/10 px-6 py-4 rounded-xl shadow-2xl w-full">
                        <h2 className="text-xl font-bold text-white tracking-tight leading-tight line-clamp-2">{title}</h2>
                        {year && <p className="text-[10px] font-mono text-accent-gold mt-1 tracking-widest">{year}</p>}
                    </div>
                )}
                
                {showRating && rating > 0 && (
                    <div className="transform scale-75">
                        <StampRating />
                    </div>
                )}
            </div>
            
            {/* Branding Plate on Shelf */}
            <div className="absolute bottom-6 flex items-center gap-2 opacity-60 mix-blend-screen">
                <img src="/image/logo/logo.png" width={14} height={14} className="grayscale" crossOrigin="anonymous" />
                <span className="text-[10px] font-black tracking-[0.3em] text-[#c5a059] uppercase">Storio Library</span>
            </div>
        </div>
    );
  }

  // --- Default Blur Template ---
  return (
    <div 
      style={currentDim} 
      className="relative flex flex-col items-center justify-between overflow-hidden font-sans text-white bg-folio-black select-none p-8"
    >
      {/* Background Blur */}
      <div className="absolute inset-0 z-0">
        <img 
          src={posterPath} 
          alt="" 
          className="w-full h-full object-cover blur-[50px] opacity-60 scale-110"
          crossOrigin="anonymous"
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Top Header */}
      <div className="relative z-10 w-full flex justify-center pt-2">
        <div className="px-3 py-1 bg-black/20 backdrop-blur-md border border-white/10 rounded-full">
            <span className="text-[8px] font-black tracking-[0.3em] uppercase text-accent-gold/90 shadow-sm">
                {type} Memory
            </span>
        </div>
      </div>

      {/* Center Poster - Adaptive Size */}
      <div className="relative z-10 flex-1 w-full flex items-center justify-center py-6 min-h-0">
        <div className="relative max-h-full aspect-[2/3] rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-white/10 overflow-hidden">
             <img src={posterPath} alt={title} className="w-full h-full object-cover" crossOrigin="anonymous" />
        </div>
      </div>

      {/* Bottom Info */}
      <div className="relative z-10 w-full flex flex-col items-center space-y-4 pb-2">
        {showTitle && (
            <div className="text-center w-full">
                <h1 className="text-2xl font-black font-serif tracking-tight leading-tight drop-shadow-lg line-clamp-2">
                    {title}
                </h1>
                <p className="text-[10px] font-bold text-white/60 tracking-[0.2em] uppercase mt-1">
                    {year || '---'}
                </p>
            </div>
        )}

        {showRating && rating > 0 && (
          <div className="mb-8 transform hover:scale-110 transition-transform duration-300">
             <StampRating />
          </div>
        )}

        {showReflection && (
            <div className="w-full">
                <div className="relative p-4 bg-black/30 border border-white/5 rounded-xl backdrop-blur-md">
                    <p className="text-xs font-medium text-white/90 leading-relaxed text-center italic line-clamp-3">
                        "{reflection || "A story preserved in the folio."}"
                    </p>
                </div>
            </div>
        )}

        <div className="pt-4 flex items-center gap-2 opacity-70">
            <img src="/image/logo/logo.png" width={14} height={14} alt="" crossOrigin="anonymous" />
            <span className="text-[10px] font-black tracking-[0.4em] uppercase text-white">Storio</span>
        </div>
      </div>
    </div>
  );
}
