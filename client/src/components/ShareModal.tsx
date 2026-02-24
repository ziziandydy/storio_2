'use client';

import React, { useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Share2, Loader2, Check, Layout, Square, RectangleVertical, Type, Star, MessageSquare, Palette, Ticket, Book as BookIcon, Image as ImageIcon, Tv } from 'lucide-react';
import { toPng } from 'html-to-image';
import download from 'downloadjs';
import { useTranslation } from '@/hooks/useTranslation';
import MemoryCardTemplate from './share/MemoryCardTemplate';

type AspectRatio = '9:16' | '4:5' | '1:1';
type TemplateType = 'default' | 'pure' | 'ticket' | '3d' | 'tv' | 'desk';

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
  template?: React.ReactNode; // 允許直接傳入渲染好的模板
  fileName?: string;
}

export default function ShareModal({ isOpen, onClose, title, item, template, fileName = 'storio-memory' }: ShareModalProps) {
  const { t } = useTranslation();
  const templateRef = useRef<HTMLDivElement>(null);

  // Customization State (Only for single item)
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('default');
  const [showTitle, setShowTitle] = useState(true);
  const [showRating, setShowRating] = useState(true);
  const [showReflection, setShowReflection] = useState(true);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);

  // Create a proxied version of the item for CORS-safe capturing
  const [base64Poster, setBase64Poster] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);

  // Pre-fetch image as Base64 to guarantee capture success
  React.useEffect(() => {
    if (!item?.posterPath) return;

    let isMounted = true;
    const loadBase64 = async () => {
      try {
        let url = item.posterPath;

        // Use proxy for TMDB/Google Books
        if (url.includes('image.tmdb.org')) {
          url = url.replace('https://image.tmdb.org/t/p/', '/proxy/tmdb/');
        } else if (url.includes('books.google.com')) {
          url = url.replace(/^https?:\/\/books\.google\.com\//, '/proxy/googlebooks/');
        }

        // Add cache buster
        url += `${url.includes('?') ? '&' : '?'}t=${new Date().getTime()}`;

        // Ensure absolute URL if proxy is used
        if (url.startsWith('/')) {
          url = window.location.origin + url;
        }

        const response = await fetch(url);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          if (isMounted && typeof reader.result === 'string') {
            setBase64Poster(reader.result);
          }
        };
        reader.readAsDataURL(blob);
      } catch (e) {
        console.error("Failed to preload image:", e);
        // Fallback to original URL if fetch fails (though it might still fail in canvas)
        if (isMounted) setBase64Poster(null);
      } finally {
        if (isMounted) setIsImageLoading(false);
      }
    };

    setIsImageLoading(true);
    loadBase64();
    return () => { isMounted = false; };
  }, [item?.posterPath]);

  const proxiedItem = useMemo(() => {
    if (!item) return undefined;
    return {
      ...item,
      posterPath: base64Poster || item.posterPath // Use Base64 if available
    };
  }, [item, base64Poster]);

  // Template visibility logic
  const TEMPLATES: { id: TemplateType; icon: any; label: string; hidden?: boolean }[] = [
    { id: 'default', icon: Palette, label: t.shareModal.templates.default },
    { id: 'pure', icon: ImageIcon, label: t.shareModal.templates.pure },
    { id: 'ticket', icon: Ticket, label: t.shareModal.templates.ticket, hidden: item?.type === 'book' },
    { id: 'tv', icon: Tv, label: t.shareModal.templates.retroTv, hidden: item?.type === 'book' },
    { id: '3d', icon: BookIcon, label: t.shareModal.templates.shelf, hidden: item?.type !== 'book' },
    { id: 'desk', icon: Layout, label: t.shareModal.templates.desk, hidden: item?.type !== 'book' },
  ];

  const ASPECT_RATIOS: { id: AspectRatio; icon: any; label: string; hidden?: boolean }[] = [
    { id: '9:16', icon: RectangleVertical, label: t.shareModal.formats.story },
    { id: '4:5', icon: Layout, label: t.shareModal.formats.portrait, hidden: true },
    { id: '1:1', icon: Square, label: t.shareModal.formats.square, hidden: true },
  ];

  const isSingleItem = !!item;

  const handleCapture = async () => {
    if (!templateRef.current) return null;
    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 100)); // Ensure render
      
      // Limit pixel ratio for mobile Safari to prevent memory crash
      const ratio = window.devicePixelRatio > 2 ? 2 : window.devicePixelRatio;
      
      const dataUrl = await toPng(templateRef.current, {
        cacheBust: true,
        pixelRatio: ratio,
        backgroundColor: '#0d0d0d',
        skipAutoScale: true, // Prevent random scaling issues
        style: {
           transform: 'scale(1)', // Force reset scale during capture
           transformOrigin: 'top left'
        }
      });
      return dataUrl;
    } catch (error) {
      console.error('Failed to generate image:', error);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    const dataUrl = await handleCapture();
    if (!dataUrl) return;

    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `${fileName}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: title,
          text: `${t.details.shareMessage} ${window.location.origin}`,
          files: [file],
        });
      } else {
        download(dataUrl, `${fileName}.png`);
        setIsDownloaded(true);
        setTimeout(() => setIsDownloaded(false), 2000);
      }
    } catch (error) {
      console.error('Share failed:', error);
      // Fallback if share API fails unexpectedly
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

          {/* Close Button (Outside content, Top Right) */}
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
              {/* Visual Preview */}
              <div className="relative w-full h-full flex items-center justify-center">
                <div
                  className={`relative shadow-2xl overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] origin-center will-change-transform ${isDrawerOpen
                    ? '-translate-y-[10%] scale-[0.65] sm:scale-[0.85]'
                    : 'translate-y-0 scale-[0.8] sm:scale-100'
                    }`}
                  style={{
                    maxHeight: '100%',
                    maxWidth: '100%'
                  }}
                >
                  <div className="bg-folio-black overflow-hidden rounded-xl border border-white/10">
                    {proxiedItem ? (
                      <MemoryCardTemplate
                        {...proxiedItem}
                        aspectRatio={aspectRatio}
                        selectedTemplate={selectedTemplate}
                        showTitle={showTitle}
                        showRating={showRating}
                        showReflection={showReflection}
                      />
                    ) : template}
                  </div>
                </div>
              </div>

              {/* Hidden Capture Container (With Proxied Images) */}
              <div className="absolute top-0 left-0 opacity-0 pointer-events-none -z-50">
                <div ref={templateRef} className="bg-folio-black overflow-hidden">
                  {proxiedItem ? (
                    <MemoryCardTemplate
                      {...proxiedItem}
                      aspectRatio={aspectRatio}
                      selectedTemplate={selectedTemplate}
                      showTitle={showTitle}
                      showRating={showRating}
                      showReflection={showReflection}
                    />
                  ) : template}
                </div>
              </div>
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
                {/* Optional: Icon indicator */}
                {/* {isDrawerOpen ? <ChevronDown size={16} className="text-white/40 ml-2" /> : <ChevronUp size={16} className="text-white/40 ml-2" />} */}
              </div>

              {/* Controls Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32 sm:pb-6">
                {isSingleItem ? (
                  <>
                    {/* Visual Style & Format Row */}
                    <div className="flex flex-col gap-6">
                      {/* Templates */}
                      <div className="space-y-3">
                        <label className="text-[10px] uppercase font-black tracking-widest text-text-desc opacity-50 flex items-center gap-2">
                          <Palette size={12} /> {t.shareModal.visualStyle}
                        </label>
                        <div className="grid grid-cols-2 gap-3 pb-2">
                          {TEMPLATES.filter(t => !t.hidden).map((temp) => (
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
                          {ASPECT_RATIOS.filter(r => !r.hidden).map((ratio) => (
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
                            className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${toggle.state
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

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    onClick={handleShare}
                    disabled={isGenerating || isImageLoading}
                    className="flex-1 py-4 bg-accent-gold text-folio-black rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-white transition-all shadow-xl active:scale-[0.98] disabled:opacity-50"
                  >
                    {isGenerating || isImageLoading ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <><Share2 size={18} /> {t.details.share}</>
                    )}
                  </button>
                  <button
                    onClick={handleDownload}
                    disabled={isGenerating || isImageLoading}
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