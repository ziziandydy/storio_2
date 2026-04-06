'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X, Download, Share2, Loader2, Check, Layout, RectangleVertical, Calendar, Image as ImageIcon, Book as BookIcon, LayoutList, RefreshCw } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import MonthlyRecapTemplate from './share/MonthlyRecapTemplate';
import { getApiUrl } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { getRenderServiceHealth } from '@/lib/share-api';
import { useProgressiveRenderQueue } from '@/hooks/useProgressiveRenderQueue';
import type { RenderPayload, RenderSettings } from '@/lib/share-api';
import type { TemplateId } from '@/hooks/useProgressiveRenderQueue';

type AspectRatio = '9:16' | '4:5' | '1:1';
type TemplateType = 'calendar' | 'collage' | 'waterfall' | 'shelf';
type ServiceStatus = 'idle' | 'checking' | 'ready' | 'cold' | 'timeout' | 'error';

interface MonthlyRecapModalProps {
  isOpen: boolean;
  onClose: () => void;
  monthValue: string; // YYYY-MM
  monthName: string; // e.g. FEB 2026
}

interface MonthlyStatsResponse {
  summary: { movie: number; book: number; tv: number };
  items: unknown[];
}

const MONTHLY_TEMPLATES: TemplateType[] = ['calendar', 'collage', 'waterfall', 'shelf'];

export default function MonthlyRecapModal({ isOpen, onClose, monthValue, monthName }: MonthlyRecapModalProps) {
  const { t } = useTranslation();
  const { token } = useAuth();

  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('calendar');
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);

  // Data state
  const [loading, setLoading] = useState(false);
  const [statsData, setStatsData] = useState<MonthlyStatsResponse | null>(null);

  // Service health check state
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>('idle');
  const healthRetryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const healthElapsedRef = useRef(0);

  const TEMPLATES: { id: TemplateType; icon: React.ElementType; label: string }[] = [
    { id: 'calendar', icon: Calendar, label: t.shareModal.templates.monthlyCalendar || 'Calendar' },
    { id: 'collage', icon: ImageIcon, label: t.shareModal.templates.monthlyCollage || 'Collage' },
    { id: 'waterfall', icon: LayoutList, label: t.shareModal.templates.monthlyWaterfall || 'Waterfall' },
    { id: 'shelf', icon: BookIcon, label: t.shareModal.templates.shelf || 'Shelf' },
  ];

  const ASPECT_RATIOS: { id: AspectRatio; icon: React.ElementType; label: string }[] = [
    { id: '9:16', icon: RectangleVertical, label: t.shareModal.formats.story },
  ];

  const fileName = `storio-monthly-${monthValue}`;
  const canNativeShare = Capacitor.isNativePlatform() || (typeof navigator !== 'undefined' && !!navigator.share);

  // Fetch monthly stats
  useEffect(() => {
    if (!isOpen || !monthValue || !token) return;
    let isMounted = true;

    const fetchStats = async () => {
      setLoading(true);
      try {
        const res = await fetch(getApiUrl(`/api/v1/collection/stats/monthly?month=${monthValue}`), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setStatsData({ summary: data.summary, items: data.items });
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchStats();
    return () => {
      isMounted = false;
    };
  }, [isOpen, monthValue, token]);

  // Render settings（共用：aspectRatio）
  const renderSettings: RenderSettings = { aspectRatio };

  // getPayload for monthly recap
  const getPayload = useCallback(
    (templateId: TemplateId): Omit<RenderPayload, 'settings'> => ({
      template: 'monthly-recap',
      item: {
        monthName,
        monthValue,
        statsData: statsData ?? { summary: { movie: 0, book: 0, tv: 0 }, items: [] },
      },
    }),
    [monthName, monthValue, statsData]
  );

  // Progressive Queue（只有 statsData 準備好且服務就緒才啟動）
  const { getCacheEntry, prioritize, isRendering, cleanup } = useProgressiveRenderQueue({
    allTemplates: MONTHLY_TEMPLATES,
    currentTemplate: selectedTemplate,
    getPayload,
    settings: renderSettings,
    enabled: serviceStatus === 'ready' && !!statsData,
  });

  // Service health check
  const stopHealthCheck = useCallback(() => {
    if (healthRetryTimerRef.current) {
      clearInterval(healthRetryTimerRef.current);
      healthRetryTimerRef.current = null;
    }
    healthElapsedRef.current = 0;
  }, []);

  const startHealthCheck = useCallback(() => {
    setServiceStatus('checking');
    healthElapsedRef.current = 0;

    const check = async () => {
      const ok = await getRenderServiceHealth();
      if (ok) {
        stopHealthCheck();
        setServiceStatus('ready');
        return;
      }
      healthElapsedRef.current += 3000;
      if (healthElapsedRef.current >= 60000) {
        stopHealthCheck();
        setServiceStatus('timeout');
        return;
      }
      setServiceStatus('cold');
    };

    check();
    healthRetryTimerRef.current = setInterval(check, 3000);
  }, [stopHealthCheck]);

  useEffect(() => {
    if (!isOpen) return;
    startHealthCheck();
    return () => stopHealthCheck();
  }, [isOpen, startHealthCheck, stopHealthCheck]);

  useEffect(() => {
    if (!isOpen) {
      cleanup();
      setServiceStatus('idle');
      setStatsData(null);
    }
  }, [isOpen, cleanup]);

  const handleTemplateChange = useCallback(
    (templateId: TemplateType) => {
      setSelectedTemplate(templateId);
      if (serviceStatus === 'ready') prioritize(templateId);
    },
    [serviceStatus, prioritize]
  );

  // Share action
  const handleShare = async () => {
    const cacheEntry = getCacheEntry(selectedTemplate);
    if (!cacheEntry) return;

    setIsSharing(true);
    const blob = cacheEntry.blob;
    const shareMessage = `${t.details.shareMessage} ${window.location.origin}`;

    try {
      if (Capacitor.isNativePlatform()) {
        const arrayBuffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        bytes.forEach((b) => (binary += String.fromCharCode(b)));
        const base64Data = btoa(binary);
        const fileNameWithExt = `${fileName}_${Date.now()}.png`;
        const savedFile = await Filesystem.writeFile({
          path: fileNameWithExt,
          data: base64Data,
          directory: Directory.Cache,
        });
        await Share.share({ title: monthName, text: shareMessage, url: savedFile.uri });
      } else {
        const file = new File([blob], `${fileName}.png`, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ title: monthName, text: shareMessage, files: [file] });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${fileName}.png`;
          a.click();
          URL.revokeObjectURL(url);
          setIsDownloaded(true);
          setTimeout(() => setIsDownloaded(false), 2000);
        }
      }
    } catch (err) {
      console.error('[MonthlyRecapModal] 分享失敗:', err);
      if (!Capacitor.isNativePlatform()) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownload = async () => {
    const cacheEntry = getCacheEntry(selectedTemplate);
    if (!cacheEntry) return;
    const url = URL.createObjectURL(cacheEntry.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.png`;
    a.click();
    URL.revokeObjectURL(url);
    setIsDownloaded(true);
    setTimeout(() => setIsDownloaded(false), 2000);
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y < -50 || info.velocity.y < -500) setIsDrawerOpen(true);
    else if (info.offset.y > 50 || info.velocity.y > 500) setIsDrawerOpen(false);
  };

  const currentCacheEntry = getCacheEntry(selectedTemplate);
  const isCurrentTemplateReady = !!currentCacheEntry;

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

          <button
            onClick={onClose}
            className="fixed top-[calc(var(--sa-top)+0.5rem)] right-6 z-[120] p-3 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all backdrop-blur-md"
          >
            <X size={24} />
          </button>

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full h-full sm:h-[90vh] sm:max-w-4xl sm:rounded-[32px] overflow-hidden flex flex-col sm:bg-folio-black sm:border sm:border-white/10 sm:shadow-2xl"
          >
            {/* Cold start UI */}
            {(serviceStatus === 'checking' || serviceStatus === 'cold') && (
              <div className="absolute inset-0 z-[116] flex flex-col items-center justify-center gap-4 bg-folio-black/90">
                <Loader2 className="animate-spin text-accent-gold" size={36} />
                <p className="text-sm text-white/70">圖片服務準備中...</p>
                {serviceStatus === 'cold' && (
                  <p className="text-xs text-white/40">冷啟動中，請稍候（最多 60 秒）</p>
                )}
              </div>
            )}

            {(serviceStatus === 'timeout' || serviceStatus === 'error') && (
              <div className="absolute inset-0 z-[116] flex flex-col items-center justify-center gap-4 bg-folio-black/90">
                <p className="text-sm text-white/70">服務暫時無法使用</p>
                <button
                  onClick={startHealthCheck}
                  className="flex items-center gap-2 px-6 py-3 bg-accent-gold text-folio-black rounded-2xl font-bold text-sm"
                >
                  <RefreshCw size={14} /> 稍後再試
                </button>
              </div>
            )}

            {/* Preview Area */}
            <div
              className="flex-1 relative w-full flex items-center justify-center p-4 sm:p-8 overflow-hidden transition-all duration-500 cursor-pointer"
              onClick={() => setIsDrawerOpen(false)}
            >
              {loading || !statsData ? (
                <div className="w-full h-full flex items-center justify-center p-8">
                  <div
                    className={`w-[280px] sm:w-[350px] aspect-[9/16] bg-white/5 rounded-2xl border border-white/10 animate-pulse flex flex-col items-center shadow-2xl transition-all duration-500 origin-center ${
                      isDrawerOpen ? '-translate-y-[10%] scale-[0.65] sm:scale-[0.85]' : 'scale-[0.8] sm:scale-100'
                    }`}
                  >
                    <div className="w-full flex-1 flex flex-col items-center justify-center gap-6 opacity-30">
                      <div className="w-16 h-16 rounded-full bg-white/20" />
                      <div className="w-32 h-6 rounded-lg bg-white/20" />
                      <div className="grid grid-cols-2 gap-4 mt-8 w-full px-8">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="w-full aspect-[2/3] rounded-lg bg-white/20" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-full flex items-center justify-center">
                  <div
                    className={`relative shadow-2xl rounded-xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] origin-center will-change-transform ${
                      isDrawerOpen
                        ? '-translate-y-[10%] scale-[0.65] sm:scale-[0.85]'
                        : 'translate-y-0 scale-[0.8] sm:scale-100'
                    }`}
                    style={{ maxHeight: '100%', maxWidth: '100%' }}
                  >
                    <div className="bg-folio-black overflow-hidden rounded-xl border border-white/10 relative">
                      {/* PNG cache 顯示 */}
                      {isCurrentTemplateReady && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={currentCacheEntry!.objectUrl}
                          alt={monthName}
                          style={{ display: 'block' }}
                        />
                      )}

                      {/* React component 預覽 + loading indicator */}
                      {!isCurrentTemplateReady && (
                        <>
                          <MonthlyRecapTemplate
                            monthName={monthName}
                            monthValue={monthValue}
                            statsData={statsData}
                            aspectRatio={aspectRatio}
                            selectedTemplate={selectedTemplate}
                          />
                          {serviceStatus === 'ready' && isRendering && (
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <Loader2 className="animate-spin text-accent-gold" size={24} />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Controls Drawer */}
            <motion.div
              initial={false}
              animate={{ height: isDrawerOpen ? 'auto' : '80px', y: 0 }}
              className="absolute bottom-0 left-0 right-0 z-[115] bg-[#121212] border-t border-white/10 rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden max-h-[70vh]"
            >
              <motion.div
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.2}
                onDragEnd={handleDragEnd}
                className="w-full h-12 flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors shrink-0 border-b border-white/5 touch-none"
              >
                <div className="w-12 h-1 bg-white/20 rounded-full mb-1" />
              </motion.div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32 sm:pb-6">
                {statsData && statsData.items.length > 0 ? (
                  <div className="flex flex-col gap-6">
                    {/* Templates */}
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase font-black tracking-widest text-text-desc opacity-50 flex items-center gap-2">
                        <LayoutList size={12} /> {t.shareModal.visualStyle}
                      </label>
                      <div className="grid grid-cols-2 gap-3 pb-2">
                        {TEMPLATES.map((tmpl) => {
                          const hasCache = !!getCacheEntry(tmpl.id);
                          return (
                            <button
                              key={tmpl.id}
                              onClick={() => handleTemplateChange(tmpl.id)}
                              className={`flex items-center gap-2 px-4 py-3 rounded-2xl border text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                                selectedTemplate === tmpl.id
                                  ? 'bg-white/10 border-accent-gold/50 text-white'
                                  : 'bg-transparent border-white/5 text-white hover:border-white/20'
                              }`}
                            >
                              <tmpl.icon size={14} />
                              {tmpl.label}
                              {hasCache && (
                                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-gold opacity-70" />
                              )}
                            </button>
                          );
                        })}
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
                            className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-2xl border text-[10px] font-bold transition-all ${
                              aspectRatio === ratio.id
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
                ) : loading ? (
                  <div className="flex flex-col gap-6 animate-pulse opacity-50">
                    <div className="space-y-3">
                      <div className="w-24 h-3 bg-white/20 rounded-full" />
                      <div className="grid grid-cols-2 gap-3">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="h-10 bg-white/10 rounded-2xl border border-white/5" />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-text-desc opacity-60">本月尚無典藏記憶可分享。</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  {canNativeShare ? (
                    <>
                      <button
                        onClick={handleShare}
                        disabled={isSharing || !isCurrentTemplateReady || loading || !statsData?.items.length}
                        className="flex-1 py-4 bg-accent-gold text-folio-black rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-white transition-all shadow-xl active:scale-[0.98] disabled:opacity-50"
                      >
                        {isSharing ? (
                          <Loader2 className="animate-spin" size={18} />
                        ) : !isCurrentTemplateReady ? (
                          <><Loader2 className="animate-spin" size={18} /> 請稍候...</>
                        ) : (
                          <><Share2 size={18} /> {t.details.share}</>
                        )}
                      </button>
                      <button
                        onClick={handleDownload}
                        disabled={isSharing || !isCurrentTemplateReady}
                        className="flex-1 py-4 bg-white/5 text-white hover:bg-white/10 rounded-2xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all border border-white/10 disabled:opacity-50"
                      >
                        {isDownloaded ? (
                          <><Check size={14} /> {t.shareModal.saved}</>
                        ) : (
                          <><Download size={14} /> {t.shareModal.download}</>
                        )}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleDownload}
                      disabled={isSharing || !isCurrentTemplateReady}
                      className="flex-1 py-4 bg-accent-gold text-folio-black rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-white transition-all shadow-xl active:scale-[0.98] disabled:opacity-50"
                    >
                      {!isCurrentTemplateReady ? (
                        <><Loader2 className="animate-spin" size={18} /> 請稍候...</>
                      ) : isDownloaded ? (
                        <><Check size={18} /> {t.shareModal.saved}</>
                      ) : (
                        <><Download size={18} /> {t.shareModal.download}</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
