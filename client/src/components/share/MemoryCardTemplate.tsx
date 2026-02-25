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
    selectedTemplate?: 'default' | 'pure' | 'ticket' | '3d' | 'tv' | 'desk';
    showTitle?: boolean;
    showRating?: boolean;
    showReflection?: boolean;
    customLogoPath?: string | null;
    customDeskBg?: string | null;
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
    showReflection = true,
    customLogoPath,
    customDeskBg
}: MemoryCardTemplateProps) {

    // Dimensions based on ratio
    const dimensions = {
        '9:16': { width: '400px', height: '711px' },
        '4:5': { width: '400px', height: '500px' },
        '1:1': { width: '400px', height: '400px' }
    };

    const currentDim = dimensions[aspectRatio];

    const getImageProps = (src: string) => {
        const isDataUrl = src.startsWith('data:');
        const isLocalAsset = src.startsWith('/');
        const isBlobUrl = src.startsWith('blob:');
        return {
            src,
            // Only use crossOrigin for external absolute URLs (proxied)
            // Data URLs and Blob URLs don't need it. 
            // Local assets SHOULD NOT have it in Safari.
            ...((isDataUrl || isLocalAsset || isBlobUrl) ? {} : { crossOrigin: 'anonymous' as const })
        };
    };

    // Use Blob URL if available, otherwise fallback to standard path
    const LOGO_PATH = customLogoPath || "/image/logo/logo.png";
    const DESK_BG_PATH = customDeskBg || "/image/share/desk_bg.jpg";

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
                    {...getImageProps(posterPath)}
                    alt={title}
                    className="w-full h-full object-cover"
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
                                        {type === 'tv' ? 'TV SERIES' : type}
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
                                    &quot;{reflection}&quot;
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Branding */}
                    <div className="pt-4 border-t border-white/10 flex items-center gap-2 opacity-80">
                        <img {...getImageProps(LOGO_PATH)} width={14} height={14} alt="Storio" className="opacity-80" />
                        <span className="text-[10px] font-black tracking-[0.3em] text-white uppercase">Storio</span>
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
                            {...getImageProps(posterPath)}
                            alt={title}
                            className="w-full h-full object-contain opacity-90 contrast-125 saturate-125 bg-black/40"
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
                                &quot;{reflection}&quot;
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer Logo */}
                <div className="absolute bottom-6 flex items-center gap-2 opacity-40">
                    <img {...getImageProps(LOGO_PATH)} width={14} height={14} alt="Storio" className="opacity-80" />
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
                            <p className="text-[8px] font-bold uppercase">{type === 'tv' ? 'TV SERIES' : type}</p>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 p-6 flex flex-col items-center min-h-0 w-full">
                        <div className="relative flex-1 w-full rounded-md overflow-hidden border-2 border-folio-black mb-4 min-h-0 bg-white/40">
                            <img {...getImageProps(posterPath)} alt="" className="w-full h-full object-contain contrast-125" />
                        </div>

                        <div className="space-y-4 shrink-0 flex flex-col items-center w-full">
                            {showRating && rating > 0 && (
                                <div className="transform scale-75 -my-2">
                                    <StampRating />
                                </div>
                            )}
                            {showReflection && reflection && (
                                <p className="text-[10px] leading-relaxed italic border-l-2 border-folio-black pl-3 py-1 font-sans font-medium line-clamp-3 text-center w-full">
                                    &quot;{reflection}&quot;
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Ticket Footer / Stub */}
                    <div className="p-6 border-t-2 border-dashed border-folio-black/20 bg-black/5 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <img {...getImageProps(LOGO_PATH)} width={14} height={14} alt="Storio" className="opacity-80" />
                            <span className="text-[10px] font-black tracking-tighter">STORIO</span>
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

    if (selectedTemplate === '3d') {
        // 3:4 Aspect Ratio (e.g. 240px x 320px)
        const bookWidth = 240;
        const bookHeight = 320;
        // Thickness ~18-20% of width
        const spineWidth = 48;

        return (
            <div style={currentDim} className="bg-[#1a1a1a] flex flex-col items-center justify-center overflow-hidden relative font-serif perspective-[2000px]">
                {/* Environment / Background - Dark Library Shelf */}
                <div className="absolute inset-0 bg-[#2a1a10] overflow-hidden">
                    {/* Back wall of the shelf (Dark Library) */}
                    <div
                        className="absolute inset-0 opacity-40 mix-blend-multiply"
                        style={{
                            backgroundImage: `url('https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=2000&auto=format&fit=crop')`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                        }}
                    />

                    {/* The Shelf Board Top Surface (Perspective depth) */}
                    <div
                        className="absolute bottom-[20%] left-[-10%] right-[-10%] h-[150px] bg-gradient-to-t from-[#4a3018] to-[#2c1a0c] z-0"
                        style={{
                            transformOrigin: 'bottom',
                            transform: 'perspective(600px) rotateX(60deg)',
                        }}
                    />

                    {/* The Shelf Board Front Edge */}
                    <div
                        className="absolute bottom-[20%] left-[-10%] right-[-10%] h-[40px] bg-gradient-to-b from-[#4a3018] to-[#2a180a] border-t border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-10 translate-y-full"
                    />

                    {/* Main Light Source (Top Left) Spotlighting the shelf */}
                    <div className="absolute top-[-30%] left-[-10%] w-[150%] h-[150%] bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.7)_0%,transparent_60%)] pointer-events-none z-20 mix-blend-screen" />
                </div>

                {/* 3D Book Container */}
                {/* Adjusted Pitch and Translation to ground it on the CSS shelf */}
                <div
                    className="relative z-30 transition-transform duration-700 ease-out"
                    style={{
                        width: `${bookWidth}px`,
                        height: `${bookHeight}px`,
                        transform: 'translateY(15px) rotateX(-5deg) rotateY(25deg)', // Less pitch to stand up straighter on the shelf
                        transformStyle: 'preserve-3d',
                    }}
                >
                    {/* --- Front Cover --- */}
                    <div
                        className="absolute inset-0 z-30 rounded-r-[4px] rounded-l-[2px] bg-[#1a1a1a]"
                        style={{
                            transform: `translateZ(${spineWidth / 2}px)`,
                            width: '100%',
                            height: '100%',
                            backfaceVisibility: 'hidden',
                            boxShadow: 'inset 4px 0 10px rgba(255,255,255,0.1), inset -4px 0 15px rgba(0,0,0,0.6)' // Lighting from top-left, shadow on right
                        }}
                    >
                        <img {...getImageProps(posterPath)} alt={title} className="w-full h-full object-cover rounded-r-[4px] rounded-l-[2px]" />
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-black/40 mix-blend-overlay pointer-events-none" />
                        <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-black/60 via-black/20 to-transparent opacity-80" /> {/* Spine crease shadow */}
                    </div>

                    {/* --- Spine --- (On the left edge) */}
                    <div
                        className="absolute top-0 left-0 bg-[#0a0a0a] flex flex-col items-center justify-center overflow-hidden rounded-l-[4px]"
                        style={{
                            width: `${spineWidth}px`,
                            height: '100%',
                            transform: `translateX(-${spineWidth / 2}px) rotateY(-90deg)`,
                            transformStyle: 'preserve-3d',
                            backfaceVisibility: 'hidden',
                            borderRight: '1px solid rgba(255,255,255,0.1)' // Separator for spine edge
                        }}
                    >
                        <div className="absolute inset-0 bg-[#050505]">
                            <img {...getImageProps(posterPath)} alt="" className="w-full h-full object-cover blur-sm brightness-[0.5] saturate-50" />
                        </div>
                        <div className="relative z-20 w-full h-full flex flex-col items-center justify-between py-8">
                            <span className="text-[8px] font-black text-accent-gold/90 uppercase tracking-widest rotate-90 whitespace-nowrap drop-shadow-md">Storio</span>
                            <span className="text-[10px] font-bold text-white uppercase tracking-wider rotate-90 line-clamp-2 w-40 text-center drop-shadow-md" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}>{title}</span>
                            <span className="text-[8px] font-mono text-white/60 rotate-90 drop-shadow-md">{year}</span>
                        </div>
                        {/* Spine Lighting (Lit from top-left, meaning the front of the spine gets the light) */}
                        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-white/20 pointer-events-none mix-blend-overlay" />
                        <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-white/10 to-transparent pointer-events-none mix-blend-overlay" />
                    </div>

                    {/* --- Back Cover --- */}
                    <div
                        className="absolute top-0 left-0 bg-[#0f0f0f] rounded-[3px]"
                        style={{
                            width: '100%',
                            height: '100%',
                            transform: `translateZ(-${spineWidth / 2}px) rotateY(180deg)`,
                            backfaceVisibility: 'hidden',
                            boxShadow: 'inset 0 0 30px rgba(0,0,0,0.9)'
                        }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-bl from-black to-black/60 opacity-90" />
                    </div>

                    {/* --- Pages Block (The "Block" of paper) --- */}
                    {/* Book casing overhang (pages are smaller than cover: offset top/bottom/left/right by 3px) */}

                    {/* Right Edge of Pages (Visible because we rotated right) */}
                    <div
                        className="absolute top-[3px] right-[4px] bg-[#e0e0e0]"
                        style={{
                            width: `${spineWidth}px`, // Thickness = spineWidth
                            height: `${bookHeight - 6}px`, // 314px
                            transformOrigin: 'right center',
                            transform: `translateZ(${spineWidth / 2}px) rotateY(90deg)`,
                            backfaceVisibility: 'hidden',
                            backgroundImage: 'repeating-linear-gradient(to right, #e0e0e0, #e0e0e0 1px, #d4d4d4 1px, #d4d4d4 2px)',
                            boxShadow: 'inset -5px 0 15px rgba(0,0,0,0.3), inset 2px 0 5px rgba(0,0,0,0.3)' // Shadow from overhang
                        }}
                    />

                    {/* Top Edge of Pages */}
                    <div
                        className="absolute top-[-5px] left-[-20px] bg-[#fdfdfd]"
                        style={{
                            width: `${bookWidth - 6}px`,  // 234px
                            height: `${spineWidth}px`, // Thickness = spineWidth
                            transformOrigin: 'top center',
                            transform: `translateZ(${spineWidth / 2}px) rotateX(90deg)`,
                            backfaceVisibility: 'hidden',
                            backgroundImage: 'repeating-linear-gradient(to bottom, #f5f5f5, #f5f5f5 1px, #ebebeb 1px, #ebebeb 2px)',
                            boxShadow: 'inset 0 4px 15px rgba(0,0,0,0.2)'
                        }}
                    />

                    {/* Bottom Edge of Pages */}
                    <div
                        className="absolute bottom-[3px] left-[2px] bg-[#b0b0b0]"
                        style={{
                            width: `${bookWidth - 6}px`, // 234px
                            height: `${spineWidth}px`, // Thickness = spineWidth
                            transformOrigin: 'bottom center',
                            transform: `translateZ(${spineWidth / 2}px) rotateX(-90deg)`,
                            backfaceVisibility: 'hidden',
                            backgroundImage: 'repeating-linear-gradient(to top, #b0b0b0, #b0b0b0 1px, #a3a3a3 1px, #a3a3a3 2px)',
                            boxShadow: 'inset 0 -5px 15px rgba(0,0,0,0.6)'
                        }}
                    />
                    {/* --- Shadows & Reflection --- */}

                    {/* Dynamic Drop Shadow from the light source perfectly forming the books projection ON THE SHELF */}
                    <div
                        className="absolute right-[-60px] bottom-[-15px] bg-black/60 blur-[15px] origin-bottom-left pointer-events-none"
                        style={{
                            width: `${bookWidth + 20}px`,
                            height: '40px',
                            transform: 'skewX(-45deg) rotateZ(-5deg)',
                            opacity: 0.6,
                            boxShadow: '0 0 30px 15px rgba(0,0,0,0.4)',
                            zIndex: -1
                        }}
                    />

                    {/* Ambient Occlusion (Contact Shadow right under the book) */}
                    <div
                        className="absolute -bottom-[20px] left-0 w-[100%] h-12 bg-black/70 blur-xl pointer-events-none"
                        style={{
                            transform: 'rotateX(90deg) translateZ(-5px) scaleX(1.1)',
                            opacity: 0.8,
                            boxShadow: '0 0 30px 15px rgba(0,0,0,0.6)'
                        }}
                    />

                    {/* Mirror Reflection (Faint) on Floor */}
                    <div
                        className="absolute -bottom-[310px] left-0 w-full h-full opacity-10 pointer-events-none"
                        style={{
                            transform: 'scaleY(-1) skewX(-10deg)',
                            maskImage: 'linear-gradient(to top, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 100%)',
                            WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0) 60%, rgba(0,0,0,0.8) 100%)'
                        }}
                    >
                        <img {...getImageProps(posterPath)} alt="" className="w-full h-full object-cover blur-[1px]" />
                    </div>
                </div>

                {/* Rating Badge (Top, Larger) */}
                {showRating && rating > 0 && (
                    <div className="absolute top-16 z-40 transform scale-110 drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] pointer-events-none">
                        <StampRating />
                    </div>
                )}

                {/* Reflection (Bottom, Centered, Box Shadow) */}
                <div className="absolute bottom-10 left-8 right-8 z-40 flex flex-col items-center pointer-events-none gap-4">
                    {showTitle && (
                        <div className="bg-black/40 backdrop-blur-md border border-white/10 px-6 py-2 rounded-full shadow-[0_10px_20px_rgba(0,0,0,0.8)]">
                            <h2 className="text-sm font-bold text-white tracking-tight uppercase drop-shadow-md">{title}</h2>
                        </div>
                    )}

                    {showReflection && reflection && (
                        <div className="bg-[#121212]/95 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.9)] text-center w-full max-w-[340px]">
                            <p className="text-sm font-medium text-white/90 leading-relaxed italic drop-shadow-sm">
                                &quot;{reflection}&quot;
                            </p>
                        </div>
                    )}
                </div>

                {/* Branding Plate */}
                <div className="absolute top-6 right-6 flex items-center gap-2 opacity-30 mix-blend-screen">
                    <img {...getImageProps(LOGO_PATH)} width={12} height={12} className="opacity-80" />
                    <span className="text-[8px] font-black tracking-[0.3em] text-[#c5a059] uppercase">Storio</span>
                </div>
            </div>
        );
    }

    // --- Desk Flat-lay Template ---
    if (selectedTemplate === 'desk') {
        // Slightly smaller to avoid covering coffee and pen in the background
        const bookWidth = 220;
        const bookHeight = 310;

        return (
            <div style={currentDim} className="bg-[#e8e6e1] flex flex-col items-center justify-center overflow-hidden relative font-serif">
                {/* Environment / Background */}
                <div className="absolute inset-0 bg-[#d3d3d3] overflow-hidden">
                    {/* User's uploaded desk background image */}
                    <div className="absolute inset-0">
                        <img 
                            {...getImageProps(DESK_BG_PATH)}
                            alt="Desk Background" 
                            className="w-full h-full object-cover"
                        />
                    </div>
                    {/* Subtle overlay to ensure the book blends well */}
                    <div className="absolute inset-0 bg-black/5" />
                </div>

                {/* Flat-lay Book Container */}
                <div
                    className="relative z-30 transition-transform duration-700 ease-out"
                    style={{
                        width: `${bookWidth}px`,
                        height: `${bookHeight}px`,
                        transform: 'translateY(-30px)', // Move up to avoid overlapping title/reflection
                        borderRadius: '4px 8px 8px 4px',
                        // Minimal realistic drop shadow to match the background lighting
                        boxShadow: `
                            -6px 8px 15px rgba(0,0,0,0.3),
                            -1px 2px 4px rgba(0,0,0,0.2),
                            inset 2px 0 5px rgba(255,255,255,0.2)
                        `
                    }}
                >
                    {/* Page edges showing slightly because of perspective */}
                    <div
                        className="absolute top-[3px] bottom-[3px] right-[-4px] left-[10px] bg-[#eee] rounded-[4px_8px_8px_4px] z-0 border-r border-t border-b border-[#ccc]"
                        style={{ boxShadow: 'inset 8px 0 10px rgba(0,0,0,0.1)' }}
                    />

                    {/* The book cover wrapper */}
                    <div className="absolute inset-0 rounded-[4px_8px_8px_4px] overflow-hidden bg-[#111] z-10 text-center flex flex-col items-center">
                        <img {...getImageProps(posterPath)} alt={title} className="absolute inset-0 w-full h-full object-cover" />

                        {/* Left hinge / spine crease */}
                        <div
                            className="absolute top-0 bottom-0 left-0 w-[14px] mix-blend-overlay z-30 pointer-events-none"
                            style={{
                                background: `linear-gradient(to right, 
                                    rgba(255,255,255,0.4) 0%,
                                    rgba(255,255,255,0.1) 15%,
                                    rgba(0,0,0,0.3) 30%, 
                                    rgba(0,0,0,0.05) 50%,
                                    transparent 100%
                                )`
                            }}
                        />

                        {/* Soft glare across the cover */}
                        <div
                            className="absolute inset-0 z-40 pointer-events-none"
                            style={{
                                background: 'linear-gradient(120deg, rgba(255,255,255,0) 20%, rgba(255,255,255,0.2) 40%, rgba(255,255,255,0) 60%)'
                            }}
                        />
                    </div>
                </div>

                {/* Rating Badge (Top Right of entire image) */}
                {showRating && rating > 0 && (
                    <div className="absolute top-8 right-8 z-50 transform scale-100 drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)] pointer-events-none">
                        <StampRating />
                    </div>
                )}

                {/* Title and Reflection Info (Bottom of the image) */}
                <div className="absolute bottom-12 left-8 right-8 z-50 flex flex-col items-start pointer-events-none pb-6">
                    <div className="space-y-4 w-full">
                        {showTitle && (
                            <div className="bg-black/40 backdrop-blur-md px-6 py-4 rounded-2xl shadow-xl w-full">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 bg-accent-gold/20 backdrop-blur-md rounded text-[8px] font-black uppercase tracking-widest text-accent-gold border border-accent-gold/20">
                                        {type === 'tv' ? 'TV SERIES' : type}
                                    </span>
                                    <span className="text-[10px] font-bold text-white/60 tracking-widest uppercase">{year}</span>
                                </div>
                                <h1 className="text-2xl font-black font-serif text-white leading-tight drop-shadow-lg line-clamp-2">
                                    {title}
                                </h1>
                            </div>
                        )}

                        {showReflection && reflection && (
                            <div className="bg-[#121212]/95 backdrop-blur-xl border border-white/10 p-4 rounded-xl shadow-2xl w-full">
                                <div className="relative pl-3 border-l-2 border-accent-gold/50">
                                    <p className="text-xs font-medium text-white/90 leading-relaxed italic line-clamp-4 drop-shadow-md">
                                        &quot;{reflection}&quot;
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Branding Plate - Very subtle for flat lay */}
                <div className="absolute bottom-6 left-8 flex items-center gap-2 opacity-50 z-40 mix-blend-multiply pointer-events-none">
                    <img {...getImageProps(LOGO_PATH)} width={12} height={12} className="opacity-80" />
                    <span className="text-[8px] font-black tracking-[0.3em] text-black uppercase">Storio</span>
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
                    {...getImageProps(posterPath)}
                    alt=""
                    className="w-full h-full object-cover blur-[50px] opacity-60 scale-110"
                />
                <div className="absolute inset-0 bg-black/40" />
            </div>

            {/* Top Header */}
            <div className="relative z-10 w-full flex justify-center pt-2">
                <div className="px-3 py-1 bg-black/20 backdrop-blur-md border border-white/10 rounded-full">
                    <span className="text-[8px] font-black tracking-[0.3em] uppercase text-accent-gold/90 shadow-sm">
                        {type === 'tv' ? 'TV SERIES' : type} Memory
                    </span>
                </div>
            </div>

            {/* Center Poster - Adaptive Size */}
            <div className="relative z-10 flex-1 w-full flex items-center justify-center py-6 min-h-0">
                <div className="relative max-h-full aspect-[2/3] rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-white/10 overflow-hidden">
                    <img {...getImageProps(posterPath)} alt={title} className="w-full h-full object-cover" />
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
                                &quot;{reflection || "A story preserved in the folio."}&quot;
                            </p>
                        </div>
                    </div>
                )}

                <div className="pt-4 flex items-center gap-2 opacity-70">
                    <img {...getImageProps(LOGO_PATH)} width={14} height={14} alt="" className="opacity-80" />
                    <span className="text-[10px] font-black tracking-[0.4em] uppercase text-white">Storio</span>
                </div>
            </div>
        </div>
    );
}
