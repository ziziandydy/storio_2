'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Loader2, Wand2, Save, X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettingsStore } from '@/store/settingsStore';
import { getApiUrl } from '@/lib/api';

interface RateAndReflectFormProps {
  initialRating?: number;
  initialNotes?: string;
  title: string;
  onSave: (rating: number, notes: string) => Promise<void>;
  onCancel?: () => void;
  isSaving?: boolean;
}

export default function RateAndReflectForm({ 
  initialRating = 0, 
  initialNotes = '', 
  title, 
  onSave, 
  onCancel,
  isSaving = false 
}: RateAndReflectFormProps) {
  const [rating, setRating] = useState(initialRating);
  const [notes, setNotes] = useState(initialNotes);
  const [hoverRating, setHoverRating] = useState(0);
  const { t } = useTranslation();
  const { language } = useSettingsStore();

  // AI States
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [loadingRefine, setLoadingRefine] = useState(false);
  const [refinedProposal, setRefinedProposal] = useState<string | null>(null);

  useEffect(() => {
    fetchSuggestions();
  }, [title]);

  const fetchSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const res = await fetch(getApiUrl('/api/v1/ai/suggestions'), {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Accept-Language': language
        },
        body: JSON.stringify({ title })
      });
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleRefine = async () => {
    if (!notes.trim()) return;
    setLoadingRefine(true);
    try {
      const res = await fetch(getApiUrl('/api/v1/ai/refine'), {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Accept-Language': language
        },
        body: JSON.stringify({ content: notes })
      });
      const data = await res.json();
      setRefinedProposal(data.refined_content);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingRefine(false);
    }
  };

  const acceptRefinement = () => {
    if (refinedProposal) {
      setNotes(refinedProposal);
      setRefinedProposal(null);
    }
  };

  const discardRefinement = () => {
    setRefinedProposal(null);
  };

  return (
    <div className="flex flex-col gap-6">
        {/* Rating Section */}
        <div className="flex flex-col items-center gap-4 bg-white/5 rounded-2xl p-6 border border-white/5">
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                <button
                    key={star}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="flex flex-col items-center gap-1.5 transition-transform hover:scale-110 focus:outline-none group px-0.5"
                >
                    <span className={`text-[9px] font-bold transition-colors ${(hoverRating || rating) >= star ? 'text-accent-gold' : 'text-white/30'}`}>
                        {star}
                    </span>
                    <Star 
                    size={22} 
                    className={`${(hoverRating || rating) >= star ? 'fill-accent-gold text-accent-gold shadow-[0_0_10px_rgba(233,108,38,0.5)]' : 'fill-transparent text-white/20 group-hover:text-white/40'} transition-colors duration-200`}
                    strokeWidth={1.5}
                    />
                </button>
                ))}
            </div>
            <span className="text-xs uppercase tracking-widest text-white font-bold h-4 transition-all duration-300">
                {hoverRating === 10 && (language === 'zh-TW' ? "傑作" : "Masterpiece")}
                {hoverRating >= 8 && hoverRating < 10 && (language === 'zh-TW' ? "極佳" : "Excellent")}
                {hoverRating >= 6 && hoverRating < 8 && (language === 'zh-TW' ? "很好" : "Very Good")}
                {hoverRating >= 4 && hoverRating < 6 && (language === 'zh-TW' ? "普通" : "Average")}
                {hoverRating >= 2 && hoverRating < 4 && (language === 'zh-TW' ? "較差" : "Poor")}
                {hoverRating === 1 && (language === 'zh-TW' ? "極差" : "Abysmal")}
                {!hoverRating && rating > 0 && `${rating} / 10`}
                {!hoverRating && rating === 0 && (language === 'zh-TW' ? "選擇評分" : "Select Rating")}
            </span>
        </div>

        {/* Reflection Section */}
        <div className="flex-grow relative">
            <div className="flex items-center justify-between mb-2 px-1">
                <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-text-desc">
                {t.details.reflection}
                </label>
                
                {loadingSuggestions && (
                <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-accent-gold animate-pulse">
                    <Loader2 size={10} className="animate-spin" />
                    <span>{t.common.loading}</span>
                </div>
                )}
            </div>

            <AnimatePresence>
                {suggestions.length > 0 && !notes && (
                <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-3 flex flex-wrap gap-2 overflow-hidden"
                >
                    {suggestions.slice(0, 3).map((s, i) => (
                    <button
                        key={i}
                        onClick={() => setNotes(prev => prev ? prev + "\n" + s : s)}
                        className="text-[10px] text-left bg-white/5 hover:bg-accent-gold/20 border border-white/10 hover:border-accent-gold/50 rounded-lg px-3 py-2 text-text-secondary hover:text-white transition-all active:scale-95"
                    >
                        {s}
                    </button>
                    ))}
                </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {refinedProposal && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-4 bg-accent-gold/5 border border-accent-gold/20 rounded-xl overflow-hidden shadow-lg"
                >
                    <div className="bg-accent-gold/10 px-4 py-2 flex items-center justify-between border-b border-accent-gold/10">
                        <span className="text-[9px] font-black uppercase tracking-widest text-accent-gold flex items-center gap-2">
                            <Wand2 size={12} /> {language === 'zh-TW' ? "AI 建議內容" : "AI Refined Proposal"}
                        </span>
                        <div className="flex gap-2">
                            <button 
                                onClick={discardRefinement}
                                className="text-[9px] font-bold uppercase px-2 py-1 hover:text-white transition-colors"
                            >
                                {t.common.cancel}
                            </button>
                            <button 
                                onClick={acceptRefinement}
                                className="text-[9px] font-bold uppercase px-2 py-1 bg-accent-gold text-folio-black rounded hover:bg-white transition-colors"
                            >
                                {t.common.confirm}
                            </button>
                        </div>
                    </div>
                    <div className="p-4">
                        <p className="text-sm text-gray-200 leading-relaxed italic">"{refinedProposal}"</p>
                    </div>
                </motion.div>
                )}
            </AnimatePresence>

            <div className="relative h-full">
                <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={language === 'zh-TW' ? "記錄你的感悟... (選填)" : "What resonated with you? (Optional)"}
                className="w-full h-48 bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-accent-gold/50 focus:bg-white/10 transition-all resize-none leading-relaxed font-roboto"
                />
                
                <div className="absolute bottom-3 right-3 flex gap-2">
                {(notes.length > 10 && !refinedProposal) && (
                    <button
                    onClick={handleRefine}
                    disabled={loadingRefine}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/50 hover:bg-accent-gold/20 text-accent-gold text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50 border border-accent-gold/20 hover:border-accent-gold/50 backdrop-blur-sm"
                    >
                    {loadingRefine ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                    <span>{language === 'zh-TW' ? "AI 潤飾" : "Refine"}</span>
                    </button>
                )}
                </div>
            </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
            {onCancel && (
                <button
                    onClick={onCancel}
                    className="flex-1 py-4 rounded-xl border border-white/10 text-text-desc font-bold text-xs uppercase tracking-widest hover:bg-white/5 hover:text-white transition-all"
                >
                    {t.common.cancel}
                </button>
            )}
            <button
                onClick={() => onSave(rating, notes)}
                disabled={isSaving}
                className="flex-1 py-4 bg-accent-gold text-folio-black rounded-xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2 hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(233,108,38,0.2)] hover:shadow-[0_0_30px_rgba(233,108,38,0.4)] hover:scale-[1.02] active:scale-[0.98]"
            >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {isSaving ? (language === 'zh-TW' ? "儲存中..." : "Saving...") : (language === 'zh-TW' ? "儲存至 Storio" : "Save to Storio")}
            </button>
        </div>
    </div>
  );
}
