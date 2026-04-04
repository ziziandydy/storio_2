'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X, Download, Share2, Loader2, Check, Layout, Square, RectangleVertical, Type, Star, MessageSquare, Palette, Ticket, Book as BookIcon, Image as ImageIcon, Tv, RefreshCw } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import MemoryCardTemplate from './share/MemoryCardTemplate';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { getRenderServiceHealth } from '@/lib/share-api';
import { useProgressiveRenderQueue } from '@/hooks/useProgressiveRenderQueue';
import type { RenderPayload, RenderSettings } from '@/lib/share-api';
import type { TemplateId } from '@/hooks/useProgressiveRenderQueue';

type AspectRatio = '9:16' | '4:5' | '1:1';
type TemplateType = 'default' | 'pure' | 'ticket' | '3d' | 'tv' | 'desk';
type ServiceStatus = 'idle' | 'checking' | 'ready' | 'cold' | 'timeout' | 'error';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  item?: {
    title: string;
    year?: string | number;
    posterPath: string;
    rating?: number;
    reflection?: string;
    type: string;
    page_count?: number;
  };
  template?: React.ReactNode;
  fileName?: string;
}

export default function ShareModal({ isOpen, onClose, title, item, template, fileName = 'storio-memory' }: ShareModalProps) {
  const { t } = useTranslation();

  // 自訂設定 state
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('default');
  const [showTitle, setShowTitle] = useState(true);
  const [showRating, setShowRating] = useState(true);
  const [showReflection, setShowReflection] = useState(true);

  // UI state
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);

  // Service health check state（任務 7.1）
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>('idle');
  const healthRetryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const healthTimeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const healthElapsedRef = useRef(0);

  // 模板可見性邏輯
  const TEMPLATES: { id: TemplateType; icon: React.ElementType; label: string; hidden?: boolean }[] = [
    { id: 'default', icon: Palette, label: t.shareModal.templates.default },
    { id: 'pure', icon: ImageIcon, label: t.shareModal.templates.pure },
    { id: 'ticket', icon: Ticket, label: t.shareModal.templates.ticket, hidden: item?.type === 'book' },
    { id: 'tv', icon: Tv, label: t.shareModal.templates.retroTv, hidden: item?.type === 'book' },
    { id: '3d', icon: BookIcon, label: t.shareModal.templates.shelf, hidden: item?.type !== 'book' },
    { id: 'desk', icon: Layout, label: t.shareModal.templates.desk, hidden: item?.type !== 'book' },
  ];

  const ASPECT_RATIOS: { id: AspectRatio; icon: React.ElementType; label: string; hidden?: boolean }[] = [
    { id: '9:16', icon: RectangleVertical, label: t.shareModal.formats.story },
    { id: '4:5', icon: Layout, label: t.shareModal.formats.portrait, hidden: true },
    { id: '1:1', icon: Square, label: t.shareModal.formats.square, hidden: true },
  ];

  const isSingleItem = !!item;
  const canNativeShare = Capacitor.isNativePlatform() || (typeof navigator !== 'undefined' && !!navigator.share);

  // 可見模板 ID 列表（用於 Progressive Queue）
  const visibleTemplateIds = useMemo<TemplateId[]>(
    () => TEMPLATES.filter((t) => !t.hidden).map((t) => t.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [item?.type]
  );

  // 共用 render 設定（selectedTemplate 由 queue 覆蓋，此處只含通用設定）
  const renderSettings = useMemo<RenderSettings>(
    () => ({ aspectRatio, showTitle, showRating, showReflection }),
    [aspectRatio, showTitle, showRating, showReflection]
  );

  // getPayload：每個 templateId 對應的渲染 payload（不含 settings）
  const getPayload = useCallback(
    (templateId: TemplateId): Omit<RenderPayload, 'settings'> => ({
      template: 'memory-card',
      item: {
        title: item?.title ?? '',
        year: item?.year,
        posterPath: item?.posterPath ?? '/image/defaultMoviePoster.svg',
        rating: item?.rating ?? 0,
        reflection: item?.reflection,
        type: item?.type ?? 'movie',
        page_count: item?.page_count,
      },
    }),
    [item]
  );

  // Progressive Render Queue（任務 6.x）
  const { getCacheEntry, prioritize, isRendering, cleanup } = useProgressiveRenderQueue({
    allTemplates: visibleTemplateIds,
    currentTemplate: selectedTemplate,
    getPayload,
    settings: renderSettings,
    enabled: serviceStatus === 'ready' && isSingleItem,
  });

  // ── Service Health Check（任務 7.2）──────────────────────────────
  const stopHealthCheck = useCallback(() => {
    if (healthRetryTimerRef.current) {
      clearInterval(healthRetryTimerRef.current);
      healthRetryTimerRef.current = null;
    }
    if (healthTimeoutTimerRef.current) {
      clearTimeout(healthTimeoutTimerRef.current);
      healthTimeoutTimerRef.current = null;
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

    // 立即檢查一次
    check();
    // 每 3s 重試
    healthRetryTimerRef.current = setInterval(check, 3000);
  }, [stopHealthCheck]);

  // Modal 開啟時觸發 health check（任務 7.2）
  useEffect(() => {
    if (!isOpen || !isSingleItem) return;
    startHealthCheck();

    return () => {
      stopHealthCheck();
    };
  }, [isOpen, isSingleItem, startHealthCheck, stopHealthCheck]);

  // Modal 關閉時清理（任務 7.14）
  useEffect(() => {
    if (!isOpen) {
      cleanup();
      setServiceStatus('idle');
    }
  }, [isOpen, cleanup]);

  // 模板切換時優先處理目標模板（任務 7.5）
  const handleTemplateChange = useCallback(
    (templateId: TemplateType) => {
      setSelectedTemplate(templateId);
      if (serviceStatus === 'ready') {
        prioritize(templateId);
      }
    },
    [serviceStatus, prioritize]
  );

  // ── Share Action（任務 7.11–7.13）──────────────────────────────
  const handleShare = async () => {
    const cacheEntry = getCacheEntry(selectedTemplate);

    if (!cacheEntry) {
      // 尚未就緒：顯示「請稍候」（isSharing 短暫阻擋按鈕，queue 會自動補齊）
      return;
    }

    setIsSharing(true);
    const blob = cacheEntry.blob;
    const shareMessage = `${t.details.shareMessage} ${window.location.origin}`;

    try {
      if (Capacitor.isNativePlatform()) {
        // iOS Native share（任務 7.12）
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

        await Share.share({
          title,
          text: shareMessage,
          url: savedFile.uri,
        });
      } else {
        // Mobile Web share（任務 7.13）
        const file = new File([blob], `${fileName}.png`, { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ title, text: shareMessage, files: [file] });
        } else {
          // <a download> fallback
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
      console.error('[ShareModal] 分享失敗:', err);
      // Fallback：下載
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

  // 目前模板是否有 cache
  const currentCacheEntry = getCacheEntry(selectedTemplate);
  const isCurrentTemplateReady = !!currentCacheEntry;

  // ── Render ───────────────────────────────────────────────────────
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
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full h-full sm:h-[90vh] sm:max-w-4xl sm:rounded-[32px] overflow-hidden flex flex-col sm:bg-folio-black sm:border sm:border-white/10 sm:shadow-2xl"
          >
            {/* ── Cold Start UI（任務 7.3）────────────────────────── */}
            {(serviceStatus === 'checking' || serviceStatus === 'cold') && (
              <div className="absolute inset-0 z-[116] flex flex-col items-center justify-center gap-4 bg-folio-black/90">
                <Loader2 className="animate-spin text-accent-gold" size={36} />
                <p className="text-sm text-white/70">圖片服務準備中...</p>
                {serviceStatus === 'cold' && (
                  <p className="text-xs text-white/40">冷啟動中，請稍候（最多 60 秒）</p>
                )}
              </div>
            )}

            {/* ── Timeout / Error UI──────────────────────────────── */}
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

            {/* ── Top: Preview Area ───────────────────────────────── */}
            <div
              className="flex-1 relative w-full flex items-center justify-center p-4 sm:p-8 overflow-hidden transition-all duration-500 cursor-pointer"
              onClick={() => setIsDrawerOpen(false)}
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <div
                  className={`relative shadow-2xl overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] origin-center will-change-transform ${
                    isDrawerOpen
                      ? '-translate-y-[10%] scale-[0.65] sm:scale-[0.85]'
                      : 'translate-y-0 scale-[0.8] sm:scale-100'
                  }`}
                  style={{ maxHeight: '100%', maxWidth: '100%' }}
                >
                  <div className="bg-folio-black overflow-hidden rounded-xl border border-white/10 relative">
                    {/* PNG cache 顯示（任務 7.6）*/}
                    {isCurrentTemplateReady && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={currentCacheEntry!.objectUrl}
                        alt={title}
                        style={{ display: 'block' }}
                      />
                    )}

                    {/* React component 預覽 + loading indicator（任務 7.6）*/}
                    {!isCurrentTemplateReady && item && (
                      <>
                        <MemoryCardTemplate
                          title={item.title}
                          year={item.year}
                          posterPath={item.posterPath}
                          rating={item.rating ?? 0}
                          reflection={item.reflection}
                          type={item.type}
                          page_count={item.page_count}
                          aspectRatio={aspectRatio}
                          selectedTemplate={selectedTemplate}
                          showTitle={showTitle}
                          showRating={showRating}
                          showReflection={showReflection}
                        />
                        {/* Loading skeleton overlay */}
                        {serviceStatus === 'ready' && isRendering && (
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                            <Loader2 className="animate-spin text-accent-gold" size={24} />
                          </div>
                        )}
                      </>
                    )}

                    {/* 無 item 時顯示傳入的 template */}
                    {!item && template}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Bottom: Controls Drawer ─────────────────────────── */}
            <motion.div
              initial={false}
              animate={{ height: isDrawerOpen ? 'auto' : '80px', y: 0 }}
              className="absolute bottom-0 left-0 right-0 z-[115] bg-[#121212] border-t border-white/10 rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden max-h-[70vh]"
            >
              {/* Drawer Handle */}
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

              {/* Controls Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32 sm:pb-6">
                {isSingleItem ? (
                  <>
                    {/* Template Selector */}
                    <div className="flex flex-col gap-6">
                      <div className="space-y-3">
                        <label className="text-[10px] uppercase font-black tracking-widest text-text-desc opacity-50 flex items-center gap-2">
                          <Palette size={12} /> {t.shareModal.visualStyle}
                        </label>
                        <div className="grid grid-cols-2 gap-3 pb-2">
                          {TEMPLATES.filter((tmpl) => !tmpl.hidden).map((tmpl) => {
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
                                {/* 小圓點：表示已完成渲染 */}
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
                          {ASPECT_RATIOS.filter((r) => !r.hidden).map((ratio) => (
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

                    {/* Toggles */}
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase font-black tracking-widest text-text-desc opacity-50 flex items-center gap-2">
                        <Type size={12} /> {t.shareModal.content}
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { id: 'title', state: showTitle, setter: setShowTitle, icon: Type, label: t.shareModal.toggles.title },
                          { id: 'rating', state: showRating, setter: setShowRating, icon: Star, label: t.shareModal.toggles.rating },
                          { id: 'reflection', state: showReflection, setter: setShowReflection, icon: MessageSquare, label: t.shareModal.toggles.note },
                        ].map((toggle) => (
                          <button
                            key={toggle.id}
                            onClick={() => toggle.setter(!toggle.state)}
                            className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${
                              toggle.state
                                ? 'bg-white/10 border-accent-gold/50 text-white'
                                : 'bg-transparent border-white/5 text-text-desc opacity-50'
                            }`}
                          >
                            <toggle.icon size={14} className={toggle.state ? 'text-accent-gold' : ''} />
                            <span className="text-[10px] font-bold">{toggle.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-text-desc opacity-60">{t.shareModal.readyToShare}</p>
                  </div>
                )}

                {/* Action Buttons（任務 7.7）*/}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  {canNativeShare ? (
                    <>
                      <button
                        onClick={handleShare}
                        disabled={isSharing || !isCurrentTemplateReady}
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
