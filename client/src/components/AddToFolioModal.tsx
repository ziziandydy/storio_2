'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, RefreshCw, Eye, CheckCircle, ArrowRight, CornerUpLeft } from 'lucide-react';
import Image from 'next/image';
import confetti from 'canvas-confetti';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ToastProvider';
import { useRouter } from 'next/navigation';
import RateAndReflectForm from '@/components/RateAndReflectForm';

interface AddToFolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rating: number, notes: string) => Promise<void>;
  onViewDetails?: (id?: string) => void;
  title: string;
  external_id: string; 
}

interface StoryInstance {
  id: string;
  created_at: string;
  rating: number;
  notes?: string;
}

export default function AddToFolioModal({ isOpen, onClose, onSave, onViewDetails, title, external_id }: AddToFolioModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  
  // Status States
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [existingInstances, setExistingInstances] = useState<StoryInstance[]>([]);
  const [mode, setShowMode] = useState<'add' | 'prompt' | 'view_existing' | 'success'>('add');

  const { token } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
        setExistingInstances([]);
        setShowMode('add');
        checkStatus();
    }
  }, [isOpen, external_id]);

  const checkStatus = async () => {
    if (!token) return;
    setCheckingStatus(true);
    try {
      const res = await fetch(`http://127.0.0.1:8010/api/v1/collection/check/${external_id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.exists) {
          setExistingInstances(data.instances);
          setShowMode('prompt');
      }
    } catch (error) {
      console.error("Check status failed:", error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleSaveWrapper = async (rating: number, notes: string) => {
    setIsSaving(true);
    try {
      await onSave(rating, notes);
      
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#e96c26', '#ffffff', '#ffd700'],
        disableForReducedMotion: true
      });
      
      setShowMode('success');
      
    } catch (error: any) {
      console.error(error);
      showToast(error.message || "Failed to save. Please try again.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGoToFolio = () => {
    router.push('/collection');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
            onClick={mode === 'success' ? undefined : onClose}
          />

          {/* Modal Content */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-black border border-white/10 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(233,108,38,0.1)] p-6 min-h-[350px] flex flex-col"
          >
            {checkingStatus ? (
                <div className="flex-grow flex flex-col items-center justify-center gap-6">
                    <div className="relative w-32 h-32">
                        <Image 
                            src="/image/loading.gif" 
                            alt="Loading..." 
                            fill
                            className="object-contain"
                            unoptimized
                        />
                    </div>
                    <p className="text-[10px] text-accent-gold font-bold tracking-[0.3em] uppercase animate-pulse">Consulting the Archives...</p>
                </div>
            ) : mode === 'success' ? (
                <div className="flex-grow flex flex-col items-center justify-center gap-8 py-4 text-center">
                    <motion.div 
                        initial={{ scale: 0 }} 
                        animate={{ scale: 1 }} 
                        transition={{ type: "spring", stiffness: 200, damping: 10 }}
                        className="w-20 h-20 bg-accent-gold rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(233,108,38,0.5)]"
                    >
                        <CheckCircle size={40} className="text-black" strokeWidth={3} />
                    </motion.div>
                    
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold font-serif text-white tracking-wide">Artifact Secured</h2>
                        <p className="text-text-desc text-sm">
                            <span className="text-accent-gold font-bold">"{title}"</span> has been successfully added to your Folio.
                        </p>
                    </div>

                    <div className="flex flex-col w-full gap-3 mt-4">
                        <button 
                            onClick={handleGoToFolio}
                            className="w-full py-4 bg-white text-black rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-gray-200 transition-all shadow-lg group"
                        >
                            Visit My Storio <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button 
                            onClick={onClose}
                            className="w-full py-4 bg-white/5 border border-white/10 text-white rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
                        >
                            <CornerUpLeft size={16} /> Continue Browsing
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-lg font-bold font-serif tracking-wide text-white flex items-center gap-2">
                          {mode === 'prompt' ? <RefreshCw size={18} className="text-accent-gold" /> : mode === 'view_existing' ? <Eye size={18} className="text-accent-gold" /> : <Star size={18} className="text-accent-gold fill-accent-gold" />}
                          {mode === 'prompt' ? "Already Collected" : mode === 'view_existing' ? "Your Memories" : "Add to Folio"}
                      </h2>
                      <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors group">
                        <X size={20} className="text-text-desc group-hover:text-white transition-colors" />
                      </button>
                    </div>

                    {mode === 'prompt' && (
                        <div className="flex-grow flex flex-col justify-center gap-8">
                            <div className="flex flex-col items-center text-center gap-4 px-4">
                                <p className="text-text-secondary leading-relaxed text-sm">
                                    You have already collected <span className="text-white font-bold block mt-1 text-lg">"{title}"</span>
                                </p>
                                <p className="text-text-desc text-xs">Would you like to record a new reflection or view your past entries?</p>
                            </div>
                            
                            <div className="flex flex-col gap-3 w-full">
                                <button 
                                    onClick={() => setShowMode('add')}
                                    className="w-full py-4 rounded-xl bg-accent-gold text-folio-black font-black text-xs uppercase tracking-widest hover:bg-white transition-all shadow-lg hover:shadow-accent-gold/20"
                                >
                                    Record New Memory
                                </button>
                                <button 
                                    onClick={() => setShowMode('view_existing')}
                                    className="w-full py-4 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                                >
                                    View Past Entries <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px]">{existingInstances.length}</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {mode === 'view_existing' && (
                        <div className="flex-grow flex flex-col gap-4 overflow-hidden">
                            <div className="flex-grow overflow-y-auto pr-2 scrollbar-hide space-y-3">
                                {existingInstances.map((inst, idx) => (
                                    <button 
                                        key={inst.id}
                                        onClick={() => {
                                            if (onViewDetails) onViewDetails(inst.id);
                                            onClose();
                                        }}
                                        className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-left hover:border-accent-gold/50 transition-all group hover:bg-white/10"
                                    >
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-bold text-accent-gold uppercase tracking-widest bg-accent-gold/10 px-2 py-1 rounded">
                                                {existingInstances.length - idx === 1 ? '1st' : existingInstances.length - idx === 2 ? '2nd' : existingInstances.length - idx === 3 ? '3rd' : `${existingInstances.length - idx}th`} Entry
                                            </span>
                                            <span className="text-[10px] text-text-desc uppercase font-medium">
                                                {new Date(inst.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="flex gap-0.5">
                                                {[...Array(10)].map((_, i) => (
                                                    <Star key={i} size={10} className={i < inst.rating ? "fill-accent-gold text-accent-gold" : "text-white/10"} />
                                                ))}
                                            </div>
                                            <span className="text-xs font-bold text-white ml-2">{inst.rating}/10</span>
                                        </div>
                                        {inst.notes ? (
                                            <p className="text-xs text-text-secondary line-clamp-2 italic border-l-2 border-white/10 pl-3">"{inst.notes}"</p>
                                        ) : (
                                            <span className="text-[10px] text-text-desc italic pl-3 opacity-50">No written reflection</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                            <button 
                                onClick={() => setShowMode('add')}
                                className="w-full py-3 mt-2 text-center text-[10px] font-bold uppercase tracking-widest text-accent-gold hover:text-white transition-colors border-t border-white/10 pt-4"
                            >
                                + Add Another Entry
                            </button>
                        </div>
                    )}

                    {mode === 'add' && (
                        <>
                            <div className="mb-4 text-center">
                                <p className="text-[10px] uppercase tracking-[0.2em] text-accent-gold font-bold opacity-80">
                                    {existingInstances.length > 0 ? `New Entry #${existingInstances.length + 1}` : "Rate & Reflect"}
                                </p>
                            </div>
                            
                            <RateAndReflectForm 
                                title={title}
                                onSave={handleSaveWrapper}
                                isSaving={isSaving}
                            />
                        </>
                    )}
                </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}