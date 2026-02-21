'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, UserPlus, X, ShieldCheck, Sparkles, Star } from 'lucide-react';
import Image from 'next/image';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (provider: 'google' | 'apple' | 'email') => void;
  onContinueAsGuest: () => void;
}

export default function OnboardingModal({ isOpen, onClose, onLogin, onContinueAsGuest }: OnboardingModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/95 backdrop-blur-xl"
          />

          {/* Modal Content */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-folio-black border border-white/10 rounded-[32px] overflow-hidden shadow-[0_0_100px_rgba(233,108,38,0.15)] flex flex-col md:flex-row h-auto max-h-[90vh]"
          >
            {/* Left: Visual/Intro (Hidden on small mobile) */}
            <div className="hidden md:flex md:w-2/5 relative bg-folio-card overflow-hidden">
                <Image 
                    src="/image/authBackground.webp" 
                    alt="Storio Art" 
                    fill 
                    className="object-cover opacity-50 grayscale hover:grayscale-0 transition-all duration-1000"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-folio-black via-transparent to-transparent" />
                <div className="absolute bottom-8 left-8 right-8">
                    <div className="text-accent-gold mb-2"><Sparkles size={24} /></div>
                    <h3 className="text-xl font-serif font-bold text-white leading-tight">Begin your curation journey.</h3>
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex-1 p-8 md:p-12 flex flex-col justify-center gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-accent-gold rounded-xl flex items-center justify-center">
                            <Image src="/logo/logo.png" width={24} height={24} alt="Storio" />
                        </div>
                        <h2 className="text-2xl font-bold font-serif text-white tracking-wide">Welcome to Storio</h2>
                    </div>
                    <p className="text-text-secondary text-sm leading-relaxed">
                        A private space for your cinematic and literary memories. Sync across devices and preserve your folio forever.
                    </p>
                </div>

                <div className="flex flex-col gap-3">
                    <button 
                        onClick={() => onLogin('google')}
                        className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-gray-200 transition-all shadow-xl active:scale-[0.98]"
                    >
                        <Image src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width={18} height={18} alt="Google" />
                        Continue with Google
                    </button>
                    
                    <button 
                        onClick={() => onLogin('apple')}
                        className="w-full py-4 bg-black border border-white/20 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-white/5 transition-all active:scale-[0.98]"
                    >
                        <Image src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" width={18} height={18} alt="Apple" className="invert" />
                        Continue with Apple
                    </button>

                    <div className="relative py-4 flex items-center justify-center">
                        <div className="absolute inset-x-0 h-px bg-white/5" />
                        <span className="relative z-10 bg-folio-black px-4 text-[10px] uppercase font-bold tracking-widest text-text-desc">or</span>
                    </div>

                    <button 
                        onClick={onContinueAsGuest}
                        className="w-full py-4 rounded-2xl text-text-desc hover:text-white font-bold uppercase tracking-widest text-[10px] transition-colors border border-dashed border-white/10 hover:border-white/30"
                    >
                        Continue as Guest
                    </button>
                </div>

                <div className="flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
                    <ShieldCheck className="text-accent-gold shrink-0" size={18} />
                    <p className="text-[10px] text-text-desc leading-tight">
                        Guests are limited to <span className="text-white font-bold">10 Stories</span>. 
                        Login to unlock unlimited archives and cloud sync.
                    </p>
                </div>
            </div>

            {/* Close Button */}
            <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2 text-text-desc hover:text-white transition-colors"
            >
                <X size={24} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
