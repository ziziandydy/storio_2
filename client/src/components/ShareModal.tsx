'use client';

import React, { useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Share2, Loader2, Check, Layout, Square, RectangleVertical, Type, Star, MessageSquare, Palette, Ticket, Book as BookIcon, Image as ImageIcon } from 'lucide-react';
import { toPng } from 'html-to-image';
import download from 'downloadjs';
import { useTranslation } from '@/hooks/useTranslation';
import MemoryCardTemplate from './share/MemoryCardTemplate';

type AspectRatio = '9:16' | '4:5' | '1:1';
type TemplateType = 'default' | 'pure' | 'ticket' | '3d';

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

  // ... (handleCapture, handleDownload, handleShare remain same)

  const handleCapture = async () => {
    if (!templateRef.current) return null;
    
    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const dataUrl = await toPng(templateRef.current, {
        cacheBust: true,
        pixelRatio: 3, 
        backgroundColor: '#0d0d0d',
      });
      return dataUrl;
    } catch (err) {
      console.error('Failed to generate image:', err);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    const dataUrl = await handleCapture();
    if (dataUrl) {
      download(dataUrl, `${fileName}.png`);
      setIsDownloaded(true);
      setTimeout(() => setIsDownloaded(false), 3000);
    }
  };

  const handleShare = async () => {
    const dataUrl = await handleCapture();
    if (!dataUrl) return;

    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `${fileName}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: title,
          text: 'Shared from Storio.',
        });
      } else {
        handleDownload();
      }
    } catch (err) {
      console.error('Share failed:', err);
      handleDownload();
    }
  };

  const ASPECT_RATIOS: { id: AspectRatio; icon: any; label: string }[] = [
    { id: '9:16', icon: RectangleVertical, label: 'Story' },
    { id: '4:5', icon: Layout, label: 'Post' },
    { id: '1:1', icon: Square, label: 'Square' },
  ];

  const TEMPLATES: { id: TemplateType; icon: any; label: string; hidden?: boolean }[] = [
    { id: 'default', icon: Palette, label: 'Default' },
    { id: 'pure', icon: ImageIcon, label: 'Pure' },
    { id: 'ticket', icon: Ticket, label: 'Ticket', hidden: item?.type === 'book' },
    { id: '3d', icon: BookIcon, label: '3D Book', hidden: item?.type !== 'book' },
  ];

  const isSingleItem = !!item;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/95 backdrop-blur-xl"
          />

          {/* Modal Content */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className={`relative w-full ${isSingleItem ? 'max-w-xl' : 'max-w-md'} bg-folio-black border border-white/10 rounded-[32px] overflow-hidden shadow-2xl flex flex-col md:flex-row h-auto md:h-[85vh] max-h-[900px]`}
          >
            {/* Left: Preview Area */}
            <div className={`flex-[1.2] bg-black/40 flex flex-col items-center justify-center p-6 relative overflow-hidden min-h-[400px]`}>
              <div className="absolute top-6 left-6 z-10">
                <span className="text-[10px] font-black tracking-[0.2em] text-accent-gold/50 uppercase">Preview</span>
              </div>
              
              {/* Scaled Preview Container */}
              <div className="relative shadow-2xl rounded-xl overflow-hidden border border-white/10 scale-[0.6] sm:scale-[0.7] md:scale-[0.8] lg:scale-90 transition-transform origin-center">
                <div ref={templateRef} className="bg-folio-black overflow-hidden">
                  {item ? (
                    <MemoryCardTemplate 
                        {...item}
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

            {/* Right: Control Panel (Only for single item) */}
            <div className={`flex-1 border-l border-white/5 flex flex-col h-full bg-folio-card overflow-y-auto ${!isSingleItem ? 'hidden md:flex' : ''}`}>
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-sm font-bold font-serif text-white tracking-widest uppercase">{t.details.share}</h2>
                <button onClick={onClose} className="p-2 text-text-desc hover:text-white transition-colors bg-white/5 rounded-full">
                  <X size={16} />
                </button>
              </div>

              {isSingleItem ? (
                <div className="flex-1 p-6 space-y-8">
                    {/* 1. Templates */}
                    <section className="space-y-3">
                    <label className="text-[10px] uppercase font-black tracking-widest text-text-desc opacity-50 flex items-center gap-2">
                        <Palette size={12} /> Visual Style
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {TEMPLATES.filter(t => !t.hidden).map((temp) => (
                        <button
                            key={temp.id}
                            onClick={() => setSelectedTemplate(temp.id)}
                            className={`flex items-center gap-3 p-3 rounded-2xl border text-xs font-bold transition-all ${
                            selectedTemplate === temp.id 
                            ? 'bg-accent-gold border-accent-gold text-folio-black shadow-lg shadow-accent-gold/20' 
                            : 'bg-white/5 border-white/5 text-white hover:border-white/20'
                            }`}
                        >
                            <temp.icon size={14} />
                            {temp.label}
                        </button>
                        ))}
                    </div>
                    </section>

                    {/* 2. Aspect Ratio */}
                    <section className="space-y-3">
                    <label className="text-[10px] uppercase font-black tracking-widest text-text-desc opacity-50 flex items-center gap-2">
                        <Layout size={12} /> Format
                    </label>
                    <div className="flex gap-2">
                        {ASPECT_RATIOS.map((ratio) => (
                        <button
                            key={ratio.id}
                            onClick={() => setAspectRatio(ratio.id)}
                            className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-2xl border text-[10px] font-bold transition-all ${
                            aspectRatio === ratio.id 
                            ? 'bg-accent-gold border-accent-gold text-folio-black shadow-lg shadow-accent-gold/20' 
                            : 'bg-white/5 border-white/5 text-white hover:border-white/20'
                            }`}
                        >
                            <ratio.icon size={16} />
                            {ratio.label}
                        </button>
                        ))}
                    </div>
                    </section>

                    {/* 3. Content Toggles */}
                    <section className="space-y-3">
                    <label className="text-[10px] uppercase font-black tracking-widest text-text-desc opacity-50 flex items-center gap-2">
                        <Type size={12} /> Visible Content
                    </label>
                    <div className="space-y-2">
                        {[
                        { id: 'title', state: showTitle, setter: setShowTitle, icon: Type, label: 'Title' },
                        { id: 'rating', state: showRating, setter: setShowRating, icon: Star, label: 'Rating' },
                        { id: 'reflection', state: showReflection, setter: setShowReflection, icon: MessageSquare, label: 'Reflection' },
                        ].map((toggle) => (
                        <button
                            key={toggle.id}
                            onClick={() => toggle.setter(!toggle.state)}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                            toggle.state 
                            ? 'bg-white/5 border-accent-gold/30 text-white' 
                            : 'bg-transparent border-white/5 text-text-desc opacity-50'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                            <toggle.icon size={14} className={toggle.state ? 'text-accent-gold' : ''} />
                            <span className="text-xs font-bold">{toggle.label}</span>
                            </div>
                            <div className={`w-8 h-4 rounded-full transition-colors relative flex items-center px-1 ${toggle.state ? 'bg-accent-gold' : 'bg-white/10'}`}>
                            <div className={`w-2 h-2 bg-white rounded-full transition-transform ${toggle.state ? 'translate-x-4' : 'translate-x-0'}`} />
                            </div>
                        </button>
                        ))}
                    </div>
                    </section>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center p-8 text-center">
                    <p className="text-xs text-text-desc opacity-60 italic leading-relaxed">
                        Customization is currently optimized for single memories. Monthly recaps use a predefined elegant grid.
                    </p>
                </div>
              )}

              {/* Actions Footer */}
              <div className="p-6 bg-folio-black/50 border-t border-white/5 space-y-3">
                <button 
                  onClick={handleShare}
                  disabled={isGenerating}
                  className="w-full py-4 bg-accent-gold text-folio-black rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-white transition-all shadow-xl active:scale-[0.98] disabled:opacity-50"
                >
                  {isGenerating ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <><Share2 size={18} /> Share Memory</>
                  )}
                </button>
                <button 
                  onClick={handleDownload}
                  disabled={isGenerating}
                  className="w-full py-3 bg-white/5 text-white/60 hover:text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all"
                >
                  {isDownloaded ? <><Check size={14} /> Downloaded</> : <><Download size={14} /> Download Image</>}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}