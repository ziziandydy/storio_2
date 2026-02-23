'use client';

import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Share2, Loader2, Check } from 'lucide-react';
import { toPng } from 'html-to-image';
import download from 'downloadjs';
import { useTranslation } from '@/hooks/useTranslation';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  template: React.ReactNode; // The component to render for the image
  fileName?: string;
}

export default function ShareModal({ isOpen, onClose, title, template, fileName = 'storio-memory' }: ShareModalProps) {
  const { t } = useTranslation();
  const templateRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);

  const handleDownload = async () => {
    if (!templateRef.current) return;
    
    setIsGenerating(true);
    try {
      // Small delay to ensure styles are applied
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const dataUrl = await toPng(templateRef.current, {
        cacheBust: true,
        pixelRatio: 2, // Higher quality
        backgroundColor: '#0d0d0d',
      });
      
      download(dataUrl, `${fileName}.png`);
      setIsDownloaded(true);
      setTimeout(() => setIsDownloaded(false), 3000);
    } catch (err) {
      console.error('Failed to generate image:', err);
    } finally {
      setIsGenerating(false);
    }
  };

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
            className="fixed inset-0 bg-black/90 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-folio-card border border-white/10 rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-lg font-bold font-serif text-white">{title}</h2>
              <button onClick={onClose} className="p-2 text-text-desc hover:text-white transition-colors bg-white/5 rounded-full">
                <X size={20} />
              </button>
            </div>

            {/* Preview & Hidden Template */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center bg-black/20">
              <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-text-desc mb-6 opacity-60">Preview Area</p>
              
              {/* Scaled Preview Wrapper */}
              <div className="relative shadow-2xl rounded-2xl overflow-hidden border border-white/10 scale-[0.85] origin-top md:scale-100 transition-transform">
                {/* The actual element that will be converted to image */}
                <div ref={templateRef} className="bg-folio-black">
                  {template}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-8 bg-folio-black/50 border-t border-white/5 flex flex-col gap-3">
              <button 
                onClick={handleDownload}
                disabled={isGenerating}
                className="w-full py-4 bg-accent-gold text-folio-black rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-white transition-all shadow-xl active:scale-[0.98] disabled:opacity-50"
              >
                {isGenerating ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : isDownloaded ? (
                  <><Check size={18} /> Downloaded</>
                ) : (
                  <><Download size={18} /> Download PNG</>
                )}
              </button>
              
              <p className="text-center text-[10px] text-text-desc leading-relaxed">
                Image is optimized for <span className="text-white">Instagram Stories</span>.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
