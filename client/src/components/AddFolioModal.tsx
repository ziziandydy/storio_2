'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X, CheckCircle2, Loader2 } from 'lucide-react';

interface AddFolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rating: number, notes: string) => Promise<void>;
  itemTitle: string;
}

export default function AddFolioModal({ isOpen, onClose, onSave, itemTitle }: AddFolioModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(rating, notes);
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      alert("Failed to preserve memory. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div 
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-folio-card border-t sm:border border-white/10 rounded-t-[2rem] sm:rounded-2xl p-8 overflow-hidden"
          >
            {/* Success Overlay */}
            {isSuccess && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-20 bg-accent-gold flex flex-col items-center justify-center text-folio-black gap-4"
              >
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                  <CheckCircle2 size={64} strokeWidth={2.5} />
                </motion.div>
                <p className="font-black uppercase tracking-[0.2em] text-sm text-center">Memory Preserved in Folio</p>
              </motion.div>
            )}

            {/* Content */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-[10px] uppercase font-bold tracking-[0.3em] text-accent-gold mb-2">Preserving Memory</h3>
                <h2 className="text-xl font-bold text-white line-clamp-1">{itemTitle}</h2>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 text-text-desc transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-8">
              {/* Star Rating */}
              <div className="flex flex-col items-center gap-4">
                <p className="text-xs text-text-desc font-medium">How did this story resonate with you?</p>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="p-1 transition-transform active:scale-90 hover:scale-110"
                    >
                      <Star 
                        size={32} 
                        className={`transition-all duration-200 ${
                          star <= (hoverRating || rating) 
                            ? 'fill-accent-gold text-accent-gold' 
                            : 'text-white/10'
                        }`} 
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Reflection Text */}
              <div className="flex flex-col gap-3">
                <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-text-desc">Personal Reflection</label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Capture your thoughts... What will you remember most?"
                  className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white placeholder:text-text-desc/30 focus:outline-none focus:ring-1 focus:ring-accent-gold/50 transition-all resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 pt-4">
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full py-4 bg-accent-gold text-folio-black rounded-full font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(233,108,38,0.2)] disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : 'Preserve Memory'}
                </button>
                <button 
                  onClick={handleSave} // Skip rating/notes but still save
                  disabled={isSaving}
                  className="w-full py-3 text-text-desc hover:text-white rounded-full font-bold uppercase tracking-[0.2em] text-[10px] transition-colors"
                >
                  Skip for Now
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
