'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Share2, Loader2, Check, Layout, Square, RectangleVertical, Calendar, Image as ImageIcon, Book as BookIcon, LayoutList } from 'lucide-react';
import { toPng } from 'html-to-image';
import download from 'downloadjs';
import { useTranslation } from '@/hooks/useTranslation';
import MonthlyRecapTemplate from './share/MonthlyRecapTemplate';
import { getApiUrl } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Story } from '@/types';

type AspectRatio = '9:16' | '4:5' | '1:1';
type TemplateType = 'calendar' | 'collage' | 'waterfall' | 'shelf';

interface MonthlyRecapModalProps {
    isOpen: boolean;
    onClose: () => void;
    monthValue: string; // YYYY-MM
    monthName: string; // e.g. FEB 2026
}

interface MonthlyStatsResponse {
    summary: { movie: number; book: number; tv: number };
    items: any[];
}

export default function MonthlyRecapModal({ isOpen, onClose, monthValue, monthName }: MonthlyRecapModalProps) {
    const { t } = useTranslation();
    const { token } = useAuth();
    const templateRef = useRef<HTMLDivElement>(null);

    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('calendar');

    const [isGenerating, setIsGenerating] = useState(false);
    const [isDownloaded, setIsDownloaded] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(true);

    // Safari Canvas Fix: Prefetch Logo as Base64
    const [base64Logo, setBase64Logo] = useState<string | null>(null);
    useEffect(() => {
        let isMounted = true;
        const loadLogo = async () => {
            try {
                console.log('[ShareDebug] Monthly: Converting Logo to Base64...');
                const res = await fetch('/image/logo/logo.png');
                const blob = await res.blob();
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (isMounted && typeof reader.result === 'string') {
                        console.log(`[ShareDebug] Monthly: Logo Base64 created (len: ${reader.result.length})`);
                        setBase64Logo(reader.result);
                    }
                };
                reader.readAsDataURL(blob);
            } catch (e) {
                console.error('[ShareDebug] Monthly: Logo Base64 failed:', e);
            }
        };
        loadLogo();
        return () => {
            isMounted = false;
        };
    }, []);

    // Data State
    const [loading, setLoading] = useState(false);
    const [statsData, setStatsData] = useState<MonthlyStatsResponse | null>(null);

    useEffect(() => {
        if (!isOpen || !monthValue || !token) return;
        let isMounted = true;

        const fetchStats = async () => {
            setLoading(true);
            try {
                const res = await fetch(getApiUrl(`/api/v1/collection/stats/monthly?month=${monthValue}`), {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (isMounted) {
                        // Also preload images for the items to prevent CORS issues on capture
                        const itemsWithProxiedImages = data.items.map((item: any) => {
                            let url = item.poster_url;
                            if (!url) return item;

                            // Use proxy for TMDB/Google Books directly
                            if (url.includes('image.tmdb.org')) {
                                url = url.replace('https://image.tmdb.org/t/p/', '/proxy/tmdb/');
                            } else if (url.includes('books.google.com')) {
                                url = url.replace(/^https?:\/\/books\.google\.com\//, '/proxy/googlebooks/');
                            }

                            // Add cache buster to force fresh fetch and avoid Tainted Canvas
                            // Check if url already has params
                            url += `${url.includes('?') ? '&' : '?'}t=${new Date().getTime()}`;

                            return { ...item, poster_url: url };
                        });
                        
                        setStatsData({
                            summary: data.summary,
                            items: itemsWithProxiedImages
                        });
                    }
                }
            } catch (e) {
                console.error(e);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchStats();
        return () => { isMounted = false; };
    }, [isOpen, monthValue, token]);

    const TEMPLATES: { id: TemplateType; icon: any; label: string }[] = [
        { id: 'calendar', icon: Calendar, label: t.shareModal.templates.monthlyCalendar || 'Calendar' },
        { id: 'collage', icon: ImageIcon, label: t.shareModal.templates.monthlyCollage || 'Collage' },
        { id: 'waterfall', icon: LayoutList, label: t.shareModal.templates.monthlyWaterfall || 'Waterfall' },
        { id: 'shelf', icon: BookIcon, label: t.shareModal.templates.shelf || 'Shelf' },
    ];

    const ASPECT_RATIOS: { id: AspectRatio; icon: any; label: string }[] = [
        { id: '9:16', icon: RectangleVertical, label: t.shareModal.formats.story },
    ];

    const waitForAllImages = async (element: HTMLElement) => {
        const images = Array.from(element.querySelectorAll('img'));
        console.log(`[ShareDebug] Monthly Recap: Found ${images.length} images in capture area.`);
        await Promise.all(images.map((img, i) => {
            console.log(`[ShareDebug] Monthly Image ${i} src:`, img.src.substring(0, 50) + '...', 'Complete:', img.complete);
            if (img.complete) return Promise.resolve();
            return new Promise((resolve) => {
                img.onload = () => { console.log(`[ShareDebug] Monthly Image ${i} loaded`); resolve(undefined); };
                img.onerror = () => { console.error(`[ShareDebug] Monthly Image ${i} failed:`, img.src); resolve(undefined); }; // resolve on error to prevent hanging
            });
        }));
    };

    const handleCapture = async () => {
        console.log('[ShareDebug] Starting Monthly Capture Process...');
        if (!templateRef.current) return null;
        setIsGenerating(true);
        try {
            await waitForAllImages(templateRef.current);
            // Wait slightly longer to ensure DOM and fonts fully painted and layout settled
            await new Promise(resolve => setTimeout(resolve, 500));
            // Limit pixel ratio for mobile Safari to prevent memory crash
            const ratio = window.devicePixelRatio > 2 ? 2 : window.devicePixelRatio;
            console.log('[ShareDebug] Monthly Pixel Ratio:', ratio);

            const dataUrl = await toPng(templateRef.current, {
                cacheBust: true,
                pixelRatio: ratio,
                backgroundColor: '#0d0d0d',
                skipAutoScale: true,
                style: {
                    transform: 'scale(1)', // Force reset scale during capture
                    transformOrigin: 'top left'
                }
            });
            console.log('[ShareDebug] Monthly Capture success. Data URL length:', dataUrl.length);
            return dataUrl;
        } catch (error) {
            console.error('[ShareDebug] Monthly Capture failed:', error);
            return null;
        } finally {
            setIsGenerating(false);
        }
    };

    const fileName = `storio-monthly-${monthValue}`;

    const handleShare = async () => {
        const dataUrl = await handleCapture();
        if (!dataUrl) return;

        try {
            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], `${fileName}.png`, { type: 'image/png' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: monthName,
                    text: `${t.details.shareMessage} ${window.location.origin}`,
                    files: [file],
                });
            } else {
                download(dataUrl, `${fileName}.png`);
                setIsDownloaded(true);
                setTimeout(() => setIsDownloaded(false), 2000);
            }
        } catch (error) {
            download(dataUrl, `${fileName}.png`);
        }
    };

    const handleDownload = async () => {
        const dataUrl = await handleCapture();
        if (dataUrl) {
            download(dataUrl, `${fileName}.png`);
            setIsDownloaded(true);
            setTimeout(() => setIsDownloaded(false), 2000);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center sm:p-4 overflow-hidden">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/95 backdrop-blur-xl"
                    />

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="fixed top-6 right-6 z-[120] p-3 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all backdrop-blur-md"
                    >
                        <X size={24} />
                    </button>

                    {/* Modal Container */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className={`relative w-full h-full sm:h-[90vh] sm:max-w-4xl sm:rounded-[32px] overflow-hidden flex flex-col sm:bg-folio-black sm:border sm:border-white/10 sm:shadow-2xl`}
                    >
                        {/* Top: Preview Area */}
                        <div
                            className={`flex-1 relative w-full flex items-center justify-center p-4 sm:p-8 overflow-hidden transition-all duration-500 cursor-pointer`}
                            onClick={() => setIsDrawerOpen(false)}
                        >
                            {loading || !statsData ? (
                                <div className="w-full h-full flex items-center justify-center p-8">
                                    <div className={`w-[280px] sm:w-[350px] aspect-[9/16] bg-white/5 rounded-2xl border border-white/10 animate-pulse flex flex-col items-center shadow-2xl transition-all duration-500 origin-center ${isDrawerOpen ? '-translate-y-[10%] scale-[0.65] sm:scale-[0.85]' : 'scale-[0.8] sm:scale-100'}`}>
                                        <div className="w-full flex-1 flex flex-col items-center justify-center gap-6 opacity-30">
                                            <div className="w-16 h-16 rounded-full bg-white/20" />
                                            <div className="w-32 h-6 rounded-lg bg-white/20" />
                                            <div className="grid grid-cols-2 gap-4 mt-8 w-full px-8">
                                                <div className="w-full aspect-[2/3] rounded-lg bg-white/20" />
                                                <div className="w-full aspect-[2/3] rounded-lg bg-white/20" />
                                                <div className="w-full aspect-[2/3] rounded-lg bg-white/20" />
                                                <div className="w-full aspect-[2/3] rounded-lg bg-white/20" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Visual Preview */}
                                    <div className="relative w-full h-full flex items-center justify-center">
                                        <div
                                            className={`relative shadow-2xl rounded-xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] origin-center will-change-transform flex items-center justify-center ${isDrawerOpen
                                                ? '-translate-y-[10%] scale-[0.65] sm:scale-[0.85]'
                                                : 'translate-y-0 scale-[0.8] sm:scale-100'
                                                }`}
                                            style={{
                                                maxHeight: '100%',
                                                maxWidth: '100%',
                                                width: 'auto',
                                                height: 'auto'
                                            }}
                                        >
                                            <div className="bg-folio-black overflow-hidden rounded-xl border border-white/10 flex-shrink-0">
                                                <MonthlyRecapTemplate
                                                    monthName={monthName}
                                                    monthValue={monthValue}
                                                    statsData={statsData}
                                                    aspectRatio={aspectRatio}
                                                    selectedTemplate={selectedTemplate}
                                                    customLogoPath={base64Logo}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Hidden Capture Container */}
                                    <div className="absolute top-0 left-0 opacity-0 pointer-events-none -z-50 flex items-center justify-center">
                                        <div ref={templateRef} className="bg-folio-black overflow-hidden flex-shrink-0">
                                            <MonthlyRecapTemplate
                                                monthName={monthName}
                                                monthValue={monthValue}
                                                statsData={statsData}
                                                aspectRatio={aspectRatio}
                                                selectedTemplate={selectedTemplate}
                                                customLogoPath={base64Logo}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Bottom: Controls Drawer */}
                        <motion.div
                            initial={false}
                            animate={{
                                height: isDrawerOpen ? 'auto' : '80px',
                                y: 0
                            }}
                            className={`absolute bottom-0 left-0 right-0 z-[115] bg-[#121212] border-t border-white/10 rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden max-h-[70vh]`}
                        >
                            {/* Drawer Handle / Header */}
                            <div
                                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                                className="w-full h-12 flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors shrink-0 border-b border-white/5"
                            >
                                <div className="w-12 h-1 bg-white/20 rounded-full mb-1" />
                            </div>

                            {/* Controls Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32 sm:pb-6">
                                {statsData && statsData.items.length > 0 ? (
                                    <>
                                        <div className="flex flex-col gap-6">
                                            {/* Templates */}
                                            <div className="space-y-3">
                                                <label className="text-[10px] uppercase font-black tracking-widest text-text-desc opacity-50 flex items-center gap-2">
                                                    <LayoutList size={12} /> {t.shareModal.visualStyle}
                                                </label>
                                                <div className="grid grid-cols-2 gap-3 pb-2">
                                                    {TEMPLATES.map((temp) => (
                                                        <button
                                                            key={temp.id}
                                                            onClick={() => setSelectedTemplate(temp.id)}
                                                            className={`flex items-center gap-2 px-4 py-3 rounded-2xl border text-xs font-bold whitespace-nowrap transition-all shrink-0 ${selectedTemplate === temp.id
                                                                ? 'bg-white/10 border-accent-gold/50 text-white'
                                                                : 'bg-transparent border-white/5 text-white hover:border-white/20'
                                                                }`}
                                                        >
                                                            <temp.icon size={14} />
                                                            {temp.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Aspect Ratio */}
                                            <div className="space-y-3">
                                                <label className="text-[10px] uppercase font-black tracking-widest text-text-desc opacity-50 flex items-center gap-2">
                                                    <Layout size={12} /> {t.shareModal.format}
                                                </label>
                                                <div className="flex gap-2">
                                                    {ASPECT_RATIOS.map((ratio) => (
                                                        <button
                                                            key={ratio.id}
                                                            onClick={() => setAspectRatio(ratio.id)}
                                                            className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-2xl border text-[10px] font-bold transition-all ${aspectRatio === ratio.id
                                                                ? 'bg-white/10 border-accent-gold/50 text-white'
                                                                : 'bg-transparent border-white/5 text-white hover:border-white/20'
                                                                }`}
                                                        >
                                                            <ratio.icon size={16} />
                                                            {ratio.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : loading ? (
                                    <div className="flex flex-col gap-6 animate-pulse opacity-50">
                                        <div className="space-y-3">
                                            <div className="w-24 h-3 bg-white/20 rounded-full" />
                                            <div className="grid grid-cols-2 gap-3">
                                                {[1, 2, 3, 4].map(i => (
                                                    <div key={i} className="h-10 bg-white/10 rounded-2xl border border-white/5" />
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="w-24 h-3 bg-white/20 rounded-full" />
                                            <div className="flex gap-2">
                                                <div className="h-14 flex-1 bg-white/10 rounded-2xl border border-white/5" />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <p className="text-sm text-text-desc opacity-60">
                                            No memories to share for this month.
                                        </p>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                    <button
                                        onClick={handleShare}
                                        disabled={isGenerating || loading || !statsData?.items.length}
                                        className="flex-1 py-4 bg-accent-gold text-folio-black rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-white transition-all shadow-xl active:scale-[0.98] disabled:opacity-50"
                                    >
                                        {isGenerating ? (
                                            <Loader2 className="animate-spin" size={18} />
                                        ) : (
                                            <><Share2 size={18} /> {t.details.share}</>
                                        )}
                                    </button>
                                    <button
                                        onClick={handleDownload}
                                        disabled={isGenerating || loading || !statsData?.items.length}
                                        className="flex-1 py-4 bg-white/5 text-white hover:bg-white/10 rounded-2xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all border border-white/10 disabled:opacity-50"
                                    >
                                        {isDownloaded ? <><Check size={14} /> {t.shareModal.saved}</> : <><Download size={14} /> {t.shareModal.download}</>}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
