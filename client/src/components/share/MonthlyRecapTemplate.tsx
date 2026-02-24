'use client';

import React, { useMemo } from 'react';
import { getDaysInMonth, startOfMonth, getDay } from 'date-fns';

interface MonthlyRecapTemplateProps {
    monthName: string; // FEB 2026
    monthValue: string; // YYYY-MM
    statsData: {
        summary: { movie: number; book: number; tv: number };
        items: any[];
    };
    aspectRatio: '9:16' | '4:5' | '1:1';
    selectedTemplate: 'calendar' | 'collage' | 'waterfall' | 'shelf';
}

export default function MonthlyRecapTemplate({
    monthName,
    monthValue,
    statsData,
    aspectRatio,
    selectedTemplate
}: MonthlyRecapTemplateProps) {

    // Dimensions based on ratio
    const dimensions = {
        '9:16': { width: '400px', height: '711px' },
        '4:5': { width: '400px', height: '500px' },
        '1:1': { width: '400px', height: '400px' }
    };

    const currentDim = dimensions[aspectRatio];

    const getImageProps = (src: string) => {
        const isDataUrl = src?.startsWith('data:');
        return {
            src: src || '/image/defaultMoviePoster.svg',
            ...(isDataUrl ? {} : { crossOrigin: 'anonymous' as const })
        };
    };

    const { items, summary } = statsData;

    const statsString = useMemo(() => {
        return [
            summary.movie > 0 ? `${summary.movie} Movies` : null,
            summary.book > 0 ? `${summary.book} Books` : null,
            summary.tv > 0 ? `${summary.tv} Series` : null,
        ].filter(Boolean).join(' · ');
    }, [summary]);

    const monthShort = monthName.toUpperCase();
    const latestPosterUrl = [...items].reverse().find(i => i.poster_url)?.poster_url || null;

    // ==========================
    // T1: Calendar Template
    // ==========================
    if (selectedTemplate === 'calendar') {
        const year = parseInt(monthValue.split('-')[0]);
        const month = parseInt(monthValue.split('-')[1]) - 1;
        const date = new Date(year, month, 1);
        const startDay = getDay(startOfMonth(date));
        const daysInMonth = getDaysInMonth(date);

        const itemsByDay: Record<number, any[]> = {};
        items.forEach(item => {
            if (item.created_at) {
                const d = new Date(item.created_at);
                const day = d.getDate();
                if (!itemsByDay[day]) itemsByDay[day] = [];
                itemsByDay[day].push(item);
            } else {
                const randomDay = Math.floor(Math.random() * daysInMonth) + 1;
                if (!itemsByDay[randomDay]) itemsByDay[randomDay] = [];
                itemsByDay[randomDay].push(item);
            }
        });

        const calendarCells = Array.from({ length: 42 }, (_, i) => {
            const dayNumber = i - startDay + 1;
            const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
            const dayItems = isCurrentMonth ? (itemsByDay[dayNumber] || []) : [];
            return { dayNumber, isCurrentMonth, dayItems };
        });

        return (
            <div style={currentDim} className="bg-folio-black border-2 border-white/5 relative flex flex-col font-sans p-6 overflow-hidden">
                {/* Blurred Background */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-folio-black opacity-80 z-10" />
                    {latestPosterUrl && (
                        <img {...getImageProps(latestPosterUrl)} className="w-full h-full object-cover opacity-40 blur-2xl scale-110" />
                    )}
                </div>

                <div className="flex flex-col items-center justify-center pt-3 pb-6 relative z-20">
                    <h1 className="text-4xl font-sans font-black tracking-widest text-accent-gold mt-2 drop-shadow-md">{monthShort}</h1>
                </div>

                <div className="grid grid-cols-7 mb-2 opacity-60 relative z-20">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                        <div key={i} className="text-center text-[10px] font-black font-sans uppercase text-accent-gold">{day}</div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1.5 flex-1 mb-6 relative z-20">
                    {calendarCells.map((cell, i) => {
                        if (!cell.isCurrentMonth) {
                            return <div key={i} className="aspect-square rounded flex-shrink-0 bg-white/5"></div>;
                        }

                        const count = cell.dayItems.length;
                        return (
                            <div key={i} className={`aspect-square relative rounded flex-shrink-0 transition-all duration-300 overflow-hidden ${count > 0 ? 'bg-white/10 ring-1 ring-white/20' : 'bg-transparent ring-1 ring-white/5'}`}>
                                <span className={`absolute top-1 left-1.5 text-[8px] font-bold z-20 ${count > 0 ? 'text-white drop-shadow-md' : 'text-white/40'}`}>
                                    {cell.dayNumber}
                                </span>

                                {count > 0 && (
                                    <div className="absolute inset-0 z-10 p-0.5 pt-3">
                                        {count === 1 ? (
                                            <img {...getImageProps(cell.dayItems[0].poster_url)} className="w-full h-full object-cover rounded-[2px] border border-white/10" />
                                        ) : (
                                            <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-[1px] rounded-[2px] overflow-hidden border border-white/10">
                                                {cell.dayItems.slice(0, 4).map((story, idx) => {
                                                    const isOverflow = idx === 3 && count > 4;
                                                    return (
                                                        <div key={idx} className="relative w-full h-full bg-folio-black">
                                                            <img {...getImageProps(story.poster_url)} className={`w-full h-full object-cover ${isOverflow ? 'opacity-40 blur-[1px]' : ''}`} />
                                                            {isOverflow && (
                                                                <div className="absolute inset-0 flex items-center justify-center text-[8px] font-bold bg-black/40 text-white">
                                                                    +{count - 3}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="flex justify-between items-end border-t border-white/20 pt-4 px-2 relative z-20">
                    <div className="flex items-center gap-2 opacity-90">
                        <img src="/image/logo/logo.png" className="w-4 h-4" style={{ filter: 'brightness(0) saturate(100%) invert(80%) sepia(21%) saturate(996%) hue-rotate(345deg) brightness(88%) contrast(87%)' }} />
                        <span className="text-xs font-black tracking-widest uppercase text-accent-gold drop-shadow-md">Storio</span>
                    </div>
                    <div className="text-right flex items-center h-full">
                        <span className="text-sm font-bold text-white tracking-wide drop-shadow-md">{statsString}</span>
                    </div>
                </div>
            </div>
        );
    }

    // ==========================
    // T2: Collage Template
    // ==========================
    if (selectedTemplate === 'collage') {
        const count = items.length || 1;
        let cols = 3;
        let rows = Math.ceil(count / cols);
        if (count <= 4) cols = 2;
        if (count === 1) cols = 1;

        return (
            <div style={currentDim} className="bg-[#1f1f1f] p-6 relative flex flex-col justify-between overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-[#1f1f1f] opacity-80 z-10 mix-blend-multiply" />
                    {latestPosterUrl && (
                        <img {...getImageProps(latestPosterUrl)} className="w-full h-full object-cover opacity-50 blur-3xl scale-110" />
                    )}
                </div>

                <div className="mb-6 mt-4 relative z-20 flex justify-between items-start">
                    <h1 className="text-6xl font-black tracking-tight text-accent-gold leading-none uppercase drop-shadow-md">{monthShort}</h1>
                    <div className="flex flex-col items-end gap-1 opacity-90">
                        <img src="/image/logo/logo.png" className="w-6 h-6" style={{ filter: 'brightness(0) saturate(100%) invert(80%) sepia(21%) saturate(996%) hue-rotate(345deg) brightness(88%) contrast(87%)' }} />
                        <span className="text-[10px] font-black tracking-[0.2em] uppercase text-accent-gold drop-shadow-md mr-1">Storio</span>
                    </div>
                </div>

                <div className="flex-1 flex flex-col justify-center min-h-0 relative z-10">
                    <div
                        className="grid gap-3 auto-rows-fr h-full"
                        style={{
                            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`
                        }}
                    >
                        {items.map((item, i) => (
                            <div key={i} className="relative w-full h-full rounded-xl overflow-hidden shadow-xl bg-folio-card">
                                <img {...getImageProps(item.poster_url)} className="absolute inset-0 w-full h-full object-cover rounded-xl border-2 border-white/10" />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-6 mb-2 flex justify-start items-end relative z-20">
                    <div className="text-xl font-bold text-white tracking-wider drop-shadow-md">{statsString}</div>
                </div>
            </div>
        )
    }

    // ==========================
    // T3: Waterfall Template
    // ==========================
    if (selectedTemplate === 'waterfall') {
        let displayItems = [...items];
        if (displayItems.length > 0 && displayItems.length < 9) {
            while (displayItems.length < 9) {
                displayItems = [...displayItems, ...items];
            }
        }
        displayItems = displayItems.slice(0, 9);

        return (
            <div style={currentDim} className="bg-folio-black relative flex overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                    <img src="/image/logo/logo.png" className="w-[300px] h-auto grayscale opacity-[0.05]" />
                </div>

                <div className="absolute inset-0 grid grid-cols-[4fr_5fr_4fr] gap-3 z-10 -mx-6">
                    <div className="flex flex-col gap-3 transform -translate-y-6">
                        {displayItems.slice(0, 3).map((item, i) => (
                            <img key={i} {...getImageProps(item.poster_url)} className="w-full h-auto object-cover rounded-xl opacity-80" />
                        ))}
                    </div>

                    <div className="flex flex-col gap-4 transform translate-y-6 shadow-2xl">
                        {displayItems.slice(3, 6).map((item, i) => (
                            <img key={i} {...getImageProps(item.poster_url)} className="w-full h-auto object-cover rounded-xl border-2 border-white/20" />
                        ))}
                    </div>

                    <div className="flex flex-col gap-3 transform -translate-y-12">
                        {displayItems.slice(6, 9).map((item, i) => (
                            <img key={i} {...getImageProps(item.poster_url)} className="w-full h-auto object-cover rounded-xl opacity-80" />
                        ))}
                    </div>
                </div>

                <div className="absolute bottom-6 left-6 z-20 bg-black/60 backdrop-blur-xl p-4 rounded-2xl border border-accent-gold/20 shadow-2xl">
                    <h2 className="text-2xl font-black uppercase text-accent-gold mb-1">{monthShort}</h2>
                    <p className="text-[10px] font-bold text-white uppercase tracking-wider">{statsString}</p>
                </div>

                <div className="absolute top-6 right-6 z-20 flex items-center gap-1.5 opacity-90 drop-shadow-md bg-black/40 backdrop-blur p-2 rounded-lg">
                    <img src="/image/logo/logo.png" className="w-4 h-4" style={{ filter: 'brightness(0) saturate(100%) invert(80%) sepia(21%) saturate(996%) hue-rotate(345deg) brightness(88%) contrast(87%)' }} />
                    <span className="text-[10px] font-black tracking-[0.3em] uppercase text-accent-gold">Storio</span>
                </div>
            </div>
        )
    }

    // ==========================
    // T4: Shelf Template
    // ==========================
    if (selectedTemplate === 'shelf') {
        const stack = items; // Only one single stack now

        return (
            <div style={currentDim} className="bg-[#241710] relative flex flex-col items-center overflow-hidden font-serif">
                <div className="absolute inset-0 bg-gradient-to-b from-[#3a2518] to-[#120a06] z-0 opacity-80" />

                <div className="absolute top-10 z-10 w-full text-center">
                    <h1 className="text-[48px] font-black text-accent-gold drop-shadow-lg tracking-tight uppercase">{monthShort}</h1>
                </div>

                <div className="relative z-10 flex-1 w-full flex flex-col justify-end px-12 pb-24">
                    <div className="w-full border-b-[20px] border-[#5e4334] shadow-[0_40px_60px_rgba(0,0,0,0.9)] relative flex justify-center items-end pb-1 bg-gradient-to-b from-transparent to-[#2d1b13]">

                        <div className="absolute left-[-40px] right-[-40px] bottom-[-20px] h-[20px] bg-[#3a261c] border-t border-[#8c6751]/30"></div>

                        {/* Tag */}
                        <div className="absolute top-[-100px] left-[5%] w-[80px] h-[110px] origin-top bg-[#efebd8] transform rotate-[-8deg] border border-[#d7cbb6] shadow-[10px_10px_20px_rgba(0,0,0,0.8)] flex flex-col justify-center items-center rounded-[3px] z-50">
                            <div className="absolute top-3 w-3 h-3 rounded-full bg-[#3e2723] shadow-inner" />
                            <div className="absolute top-0 right-1/2 w-[2px] h-[40px] bg-white/40 -mt-[40px] origin-bottom transform rotate-[15deg]" />

                            <div className="mt-5 text-center px-1 w-full flex flex-col items-center">
                                <p className="text-[12px] font-black text-[#5a4634] uppercase tracking-widest">{monthShort}</p>
                                <div className="w-4/5 h-px bg-[#5a4634]/30 my-2" />
                                <div className="space-y-1 w-full text-center">
                                    {summary.movie > 0 && <p className="text-[9px] font-bold text-[#3e2723] uppercase">{summary.movie} Movies</p>}
                                    {summary.book > 0 && <p className="text-[9px] font-bold text-[#3e2723] uppercase">{summary.book} Books</p>}
                                    {summary.tv > 0 && <p className="text-[9px] font-bold text-[#3e2723] uppercase">{summary.tv} Series</p>}
                                </div>
                            </div>
                        </div>

                        {/* Stacked Items (Books & Media) */}
                        <div className="flex flex-col-reverse items-center relative z-20">
                            {stack.map((item, idx) => {
                                const isBook = item.media_type === 'book';
                                const colors = ['#8b0000', '#2f4f4f', '#4682b4', '#d2691e', '#556b2f', '#4169e1', '#000000', '#222222', '#1a1a1a'];
                                const randomIdx = item.id ? item.id.charCodeAt(0) % colors.length : idx % colors.length;
                                const bgColor = isBook ? (item.dominant_color || colors[randomIdx]) : '#1a1a1a';

                                // Make items 2.5x larger compared to before
                                const w = isBook ? 320 - (idx % 3) * 12 : 300;
                                const h = isBook ? 48 : 36;

                                return (
                                    <div
                                        key={idx}
                                        className="relative flex items-center justify-center shadow-[0_-3px_10px_rgba(0,0,0,0.7)] border border-white/20"
                                        style={{
                                            width: `${w}px`,
                                            height: `${h}px`,
                                            backgroundColor: bgColor,
                                            marginBottom: '0px',
                                            borderRadius: isBook ? '3px' : '0 4px 4px 0',
                                            backgroundImage: isBook ? 'linear-gradient(90deg, rgba(0,0,0,0.4) 0%, rgba(255,255,255,0.1) 10%, rgba(0,0,0,0.2) 90%, rgba(0,0,0,0.5) 100%)' : 'none',
                                        }}
                                    >
                                        {isBook ? (
                                            <div className="w-full h-full flex items-center justify-center px-6 relative overflow-hidden">
                                                <div className="absolute top-1 bottom-1 left-2 w-[2px] border-l border-white/20 border-r border-black/40" />
                                                <div className="absolute top-1 bottom-1 right-2 w-[2px] border-l border-white/20 border-r border-black/40" />
                                                <div className="absolute top-0 w-full h-[2px] bg-white/30 left-0" />
                                                <div className="absolute bottom-0 w-full h-[4px] bg-black/60 left-0" />
                                                <span className="text-[14px] font-bold text-white uppercase tracking-widest drop-shadow-[1px_1px_2px_rgba(0,0,0,0.8)] truncate w-full text-center" style={{ fontFamily: 'Georgia, serif' }}>
                                                    {item.title}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="w-full h-full flex bg-[#1a1a1a] relative overflow-hidden">
                                                <div className="w-6 h-full bg-blue-900 border-r-2 border-black flex items-center justify-center">
                                                    <div className="w-2 h-6 bg-white/40 rounded-full shadow-inner" />
                                                </div>
                                                <div className="flex-1 h-full bg-[#1a1a1a] relative flex items-center px-4">
                                                    <img {...getImageProps(item.poster_url)} className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-luminosity" />
                                                    <span className="relative z-10 text-[12px] font-bold text-white truncate w-full text-center drop-shadow-[1px_1px_3px_black]">
                                                        {item.title}
                                                    </span>
                                                </div>
                                                <div className="w-12 h-full flex justify-center items-center bg-black/90 border-l border-white/10">
                                                    <span className="text-[6px] font-black text-accent-gold tracking-widest">STORIO</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-8 flex items-center gap-2 opacity-80 z-20">
                    <img src="/image/logo/logo.png" className="w-6 h-6 grayscale" />
                    <span className="text-[14px] font-black tracking-[0.4em] uppercase text-white drop-shadow-md">Storio</span>
                </div>
            </div>
        )
    }

    return null;
}
