'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, CheckCircle2, Bookmark, ExternalLink, 
  Plus, History, MessageSquare, Star, ArrowRight,
  Loader2
} from 'lucide-react';
import Image from 'next/image';
import RateAndReflectForm from './RateAndReflectForm';
import { useTranslation } from '@/hooks/useTranslation';
import { getApiUrl } from '@/lib/api';

interface AddToFolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rating: number, notes: string) => Promise<void>;
  onViewDetails: () => void;
  title: string;
  external_id: string;
}

export default function AddToFolioModal({ isOpen, onClose, onSave, onViewDetails, title, external_id }: AddToFolioModalProps) {
  const [mode, setShowMode] = useState<'add' | 'prompt' | 'view_existing' | 'success'>('add');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useTranslation();

  // Reset mode when modal opens
  useEffect(() => {
    if (isOpen) {
      setShowMode('add');
    }
  }, [isOpen]);

  const handleSave = async (rating: number, notes: string) => {
    setIsSubmitting(true);
    try {
      await onSave(rating, notes);
      setShowMode('success');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-folio-card border border-white/10 rounded-[32px] overflow-hidden shadow-2xl flex flex-col"
          >
            {/* Success State */}
            {mode === 'success' && (
              <div className="p-10 flex flex-col items-center text-center gap-8">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center text-green-500">
                  <CheckCircle2 size={40} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2 font-serif">Successfully Curated</h2>
                  <p className="text-text-desc text-sm">
                    <span className="text-accent-gold font-bold">"{title}"</span> {t.modals.successMessage}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  <button 
                    onClick={onClose}
                    className="py-4 bg-white/5 text-white rounded-2xl font-bold text-xs uppercase tracking-widest border border-white/10 hover:bg-white/10 transition-all"
                  >
                    Close
                  </button>
                  <button 
                    onClick={() => {
                        onViewDetails();
                        onClose();
                    }}
                    className="py-4 bg-accent-gold text-folio-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-2"
                  >
                    {t.modals.viewDetails} <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Other modes: Add to Folio */}
            {mode === 'add' && (
              <>
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                  <div className="flex items-center gap-3">
                    <div className="bg-accent-gold/20 p-2 rounded-xl">
                      <Bookmark size={18} className="text-accent-gold" />
                    </div>
                    <h2 className="text-lg font-bold text-white font-serif">{t.modals.addToFolio}</h2>
                  </div>
                  <button onClick={onClose} className="p-2 text-text-desc hover:text-white transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="p-8 overflow-y-auto max-h-[70vh]">
                  <div className="mb-8">
                    <h3 className="text-2xl font-black text-white leading-tight">{title}</h3>
                  </div>

                  <RateAndReflectForm 
                    onSubmit={handleSave} 
                    isSubmitting={isSubmitting} 
                  />
                </div>
              </>
            )}

            {/* Note: Other modes like 'prompt' or 'view_existing' can be added here if needed */}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
