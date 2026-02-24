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
                <div className="flex flex-col items-center justify-center pt-3 pb-6">
                    <h1 className="text-4xl font-sans font-black tracking-widest text-white mt-2">{monthShort}</h1>
                </div>

                <div className="grid grid-cols-7 mb-2 opacity-40">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                        <div key={i} className="text-center text-[10px] font-black font-sans uppercase text-white">{day}</div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1.5 flex-1 mb-6">
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

                <div className="flex justify-between items-end border-t border-white/10 pt-4 px-2">
                    <div className="flex items-center gap-2 opacity-50">
                        <img src="/image/logo/logo.png" className="w-4 h-4 grayscale" />
                        <span className="text-xs font-black tracking-widest uppercase text-white">Storio</span>
                    </div>
                    <div className="text-right flex items-center h-full">
                        <span className="text-sm font-bold text-white tracking-wide">{statsString}</span>
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
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none z-0" />
                <div className="mb-6 mt-4 relative z-10">
                    <h1 className="text-6xl font-black tracking-tight text-white leading-none uppercase">{monthShort}</h1>
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

                <div className="mt-6 mb-2 flex justify-between items-end">
                    <div className="text-xl font-bold text-white tracking-wider">{statsString}</div>
                    <div className="flex items-center gap-2 opacity-60">
                        <img src="/image/logo/logo.png" className="w-5 h-5 grayscale" />
                        <span className="text-sm font-black tracking-widest uppercase text-white">Storio</span>
                    </div>
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
                <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none z-0">
                    <h1 className="text-[80px] font-black tracking-widest text-white rotate-[-10deg] leading-none text-center">{monthShort}</h1>
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

                <div className="absolute bottom-6 left-6 z-20 bg-black/60 backdrop-blur-xl p-4 rounded-2xl border border-white/20 shadow-2xl">
                    <h2 className="text-2xl font-black uppercase text-white mb-1">{monthShort}</h2>
                    <p className="text-[10px] font-bold text-accent-gold uppercase tracking-wider">{statsString}</p>
                </div>

                <div className="absolute top-6 right-6 z-20 flex items-center gap-1.5 opacity-80 mix-blend-screen bg-black/40 backdrop-blur p-2 rounded-lg">
                    <img src="/image/logo/logo.png" className="w-4 h-4 grayscale" />
                    <span className="text-[10px] font-black tracking-[0.3em] uppercase text-white">Storio</span>
                </div>
            </div>
        )
    }

    // ==========================
    // T4: Shelf Template
    // ==========================
    if (selectedTemplate === 'shelf') {
        const stacks: any[][] = [];
        if (items.length > 7) {
            stacks.push(items.slice(0, Math.ceil(items.length / 2)));
            stacks.push(items.slice(Math.ceil(items.length / 2)));
        } else {
            stacks.push(items);
        }

        return (
            <div style={currentDim} className="bg-[#1a0f0a] relative flex flex-col items-center overflow-hidden font-serif">
                <div className="absolute inset-0 bg-gradient-to-b from-[#2a1a10] to-[#0a0502] z-0 opacity-80" />

                <div className="absolute top-10 z-10 w-full text-center">
                    <h1 className="text-[42px] font-black text-white/90 drop-shadow-lg tracking-tight uppercase">{monthShort}</h1>
                </div>

                <div className="relative z-10 flex-1 w-full flex flex-col justify-end px-10 pb-20">
                    <div className="w-full border-b-[14px] border-[#3e2723] shadow-[0_30px_50px_rgba(0,0,0,0.9)] relative flex justify-center items-end gap-12 pb-1">

                        <div className="absolute left-[-30px] right-[-30px] bottom-[-14px] h-[14px] bg-[#2d1b13] border-t border-[#6d4c41]/30"></div>

                        {stacks.map((stack, stackIdx) => (
                            <div key={stackIdx} className="flex flex-col-reverse items-center relative z-20">
                                {stack.map((item, idx) => {
                                    const isBook = item.media_type === 'book';
                                    const colors = ['#8b0000', '#2f4f4f', '#4682b4', '#d2691e', '#556b2f', '#4169e1', '#000000', '#222222', '#1a1a1a'];
                                    const randomIdx = item.id ? item.id.charCodeAt(0) % colors.length : idx % colors.length;
                                    const bgColor = isBook ? (item.dominant_color || colors[randomIdx]) : '#111';

                                    const w = isBook ? 140 - (idx % 3) * 6 : 130;
                                    const h = isBook ? 20 : 16;

                                    return (
                                        <div
                                            key={idx}
                                            className="relative flex items-center justify-center shadow-[0_-2px_6px_rgba(0,0,0,0.6)] border border-white/10"
                                            style={{
                                                width: `${w}px`,
                                                height: `${h}px`,
                                                backgroundColor: bgColor,
                                                marginBottom: '0px',
                                                borderRadius: isBook ? '1px' : '0 2px 2px 0'
                                            }}
                                        >
                                            {isBook ? (
                                                <div className="w-full h-full flex items-center justify-center px-4 relative overflow-hidden">
                                                    <div className="absolute top-0 w-full h-[1px] bg-white/20 left-0" />
                                                    <div className="absolute bottom-0 w-full h-[2px] bg-black/40 left-0" />
                                                    <span className="text-[7px] font-bold text-white uppercase tracking-widest drop-shadow-md truncate w-full text-center">
                                                        {item.title}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="w-full h-full flex bg-[#111] relative overflow-hidden">
                                                    <div className="w-3 h-full bg-blue-900 border-r border-black flex items-center justify-center">
                                                        <div className="w-1 h-3 bg-white/50 rounded-full" />
                                                    </div>
                                                    <div className="flex-1 h-full bg-[#111] relative flex items-center px-2">
                                                        <img {...getImageProps(item.poster_url)} className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-luminosity" />
                                                        <span className="relative z-10 text-[6px] font-bold text-white truncate w-full text-center drop-shadow-lg">
                                                            {item.title}
                                                        </span>
                                                    </div>
                                                    <div className="w-6 h-full flex justify-center items-center bg-black/80">
                                                        <span className="text-[3px] text-white">STORIO</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        ))}

                        {/* Tag */}
                        <div className="absolute top-[-50px] right-[5%] w-[60px] h-[90px] origin-top bg-[#efebd8] transform rotate-[10deg] border border-[#d7cbb6] shadow-[8px_8px_15px_rgba(0,0,0,0.8)] flex flex-col justify-center items-center rounded-[2px] z-50">
                            <div className="absolute top-2 w-2 h-2 rounded-full bg-[#3e2723] shadow-inner" />
                            <div className="absolute top-0 right-1/2 w-[1px] h-[30px] bg-white/40 -mt-[30px] origin-bottom transform rotate-[-15deg]" />

                            <div className="mt-4 text-center px-1 w-full flex flex-col items-center">
                                <p className="text-[10px] font-black text-[#5a4634] uppercase tracking-widest">{monthShort}</p>
                                <div className="w-4/5 h-px bg-[#5a4634]/30 my-1.5" />
                                <div className="space-y-1 w-full text-center">
                                    {summary.movie > 0 && <p className="text-[7px] font-bold text-[#3e2723] uppercase">{summary.movie} Movies</p>}
                                    {summary.book > 0 && <p className="text-[7px] font-bold text-[#3e2723] uppercase">{summary.book} Books</p>}
                                    {summary.tv > 0 && <p className="text-[7px] font-bold text-[#3e2723] uppercase">{summary.tv} Series</p>}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                <div className="absolute bottom-6 flex items-center gap-1.5 opacity-40 z-0">
                    <img src="/image/logo/logo.png" className="w-4 h-4 grayscale" />
                    <span className="text-[10px] font-black tracking-[0.4em] uppercase text-white">Storio</span>
                </div>
            </div>
        )
    }

    return null;
}
