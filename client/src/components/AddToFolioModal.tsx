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
import GuestLimitModal from './GuestLimitModal';
import { useTranslation } from '@/hooks/useTranslation';
import { getApiUrl } from '@/lib/api';

import { useToast } from '@/components/ToastProvider';

interface AddToFolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rating: number, notes: string, date?: string) => Promise<any>;
  onViewDetails: (id?: string) => void;
  title: string;
  external_id: string;
  overview?: string; // Add overview prop
}

export default function AddToFolioModal({ isOpen, onClose, onSave, onViewDetails, title, external_id, overview }: AddToFolioModalProps) {
  const [mode, setShowMode] = useState<'add' | 'prompt' | 'view_existing' | 'success'>('add');
  const [showGuestLimit, setShowGuestLimit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | undefined>(undefined);
  const [forceAdd, setForceAdd] = useState(false);
  const { t } = useTranslation();
  const { showToast } = useToast();

  // Reset mode when modal opens
  useEffect(() => {
    if (isOpen) {
      setShowMode('add');
      setNewlyCreatedId(undefined);
      setForceAdd(false);
    }
  }, [isOpen]);

  const handleSave = async (rating: number, notes: string, date?: string) => {
    setIsSubmitting(true);
    try {
      const result = await onSave(rating, notes, date);

      if (result && result.status === 'duplicate' && !forceAdd) {
        setShowMode('prompt');
        return;
      }

      if (result && result.status === 'capacity_reached') {
        setShowGuestLimit(true);
        return;
      }

      if (result && result.id) {
        setNewlyCreatedId(result.id);
      }
      setShowMode('success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || t.common.error, 'error');
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
                <div className="w-20 h-20 bg-accent-gold/20 rounded-full flex items-center justify-center text-accent-gold">
                  <CheckCircle2 size={40} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2 font-serif">Successfully add to storio</h2>
                  <p className="text-text-desc text-sm">
                    <span className="text-accent-gold font-bold">&quot;{title}&quot;</span> {t.modals.successMessage}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  <button
                    onClick={onClose}
                    className="py-4 bg-white/5 text-white rounded-2xl font-bold text-xs uppercase tracking-widest border border-white/10 hover:bg-white/10 transition-all"
                  >
                    {t.modals.continueBrowsing}
                  </button>
                  <button
                    onClick={() => {
                      window.location.href = '/collection';
                    }}
                    className="py-4 bg-accent-gold text-folio-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-2"
                  >
                    {t.modals.goToMyStorio} <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Prompt State: Duplicate Warning */}
            {mode === 'prompt' && (
              <div className="p-10 flex flex-col items-center text-center gap-8">
                <div className="w-20 h-20 bg-accent-gold/20 rounded-full flex items-center justify-center text-accent-gold">
                  <History size={40} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-4 font-serif">Already in your Folio</h2>
                  <p className="text-text-desc text-sm leading-relaxed">
                    You&apos;ve already curated <span className="text-white font-bold">&quot;{title}&quot;</span>.
                    Are you logging a <span className="text-accent-gold font-bold">re-watch / re-read</span>?
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3 w-full">
                  <button
                    onClick={() => {
                      setForceAdd(true);
                      setShowMode('add');
                    }}
                    className="w-full py-4 bg-accent-gold text-folio-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={16} strokeWidth={3} /> Log as Re-watch
                  </button>
                  <button
                    onClick={() => {
                      onViewDetails();
                      onClose();
                    }}
                    className="w-full py-4 bg-white/5 text-white rounded-2xl font-bold text-xs uppercase tracking-widest border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                  >
                    <ExternalLink size={16} /> View Existing Record
                  </button>
                  <button
                    onClick={onClose}
                    className="w-full py-3 text-text-desc hover:text-white text-[10px] font-bold uppercase tracking-[0.2em] transition-colors"
                  >
                    {t.common.cancel}
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
                    {forceAdd && (
                      <div className="mt-2 text-[10px] font-black uppercase tracking-widest text-accent-gold flex items-center gap-2">
                        <History size={12} /> New Viewing Log
                      </div>
                    )}
                  </div>

                  <RateAndReflectForm
                    onSave={handleSave}
                    isSaving={isSubmitting}
                    title={title}
                    overview={overview} // Pass overview
                  />
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}

      {/* Guest Limit Modal overlay */}
      <GuestLimitModal
        isOpen={showGuestLimit}
        onClose={() => setShowGuestLimit(false)}
        onLogin={(provider) => {
          // We might want to close AddToFolioModal too, or trigger logic
          // To keep it simple, we redirect to login here or store auth attempt
          window.location.href = `/login?provider=${provider}`;
        }}
      />
    </AnimatePresence>
  );
}