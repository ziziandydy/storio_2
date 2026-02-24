'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Sparkles, Mail } from 'lucide-react';
import Image from 'next/image';

interface GuestLimitModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLogin: (provider: 'google' | 'apple' | 'email') => void;
}

export default function GuestLimitModal({ isOpen, onClose, onLogin }: GuestLimitModalProps) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/95 backdrop-blur-xl"
                />

                {/* Modal Content */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-md bg-folio-black border border-white/10 rounded-[32px] overflow-hidden shadow-[0_0_100px_rgba(233,108,38,0.15)] flex flex-col h-auto min-h-[450px] transition-all duration-500"
                >
                    {/* Top Visual */}
                    <div className="relative h-48 bg-folio-card overflow-hidden flex items-center justify-center">
                        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-folio-black z-10" />
                        <div className="relative z-20 flex flex-col items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-accent-gold/10 border border-accent-gold/20 flex items-center justify-center text-accent-gold shadow-[0_0_30px_rgba(233,108,38,0.3)]">
                                <Lock size={28} />
                            </div>
                        </div>
                        {/* Decorative Background */}
                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-accent-gold via-folio-black to-folio-black" />
                    </div>

                    {/* Right/Bottom Actions */}
                    <div className="flex-1 px-8 pb-10 flex flex-col justify-center relative z-20 -mt-6">

                        <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-300">
                            <div className="space-y-3 text-center">
                                <h2 className="text-2xl font-bold font-serif text-white tracking-wide">Storio Capacity Reached</h2>
                                <p className="text-text-secondary text-sm leading-relaxed">
                                    Guest curators can store up to <strong className="text-white">10 Stories</strong>. Login to unlock unlimited cloud storage, cross-device sync, and preserve your memories forever.
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 mt-4">
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

                                <button
                                    onClick={() => onLogin('email')}
                                    className="w-full py-4 bg-white/5 text-white border border-white/10 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-white/10 transition-all active:scale-[0.98]"
                                >
                                    <Mail size={18} />
                                    Continue with Email
                                </button>

                                <button
                                    onClick={onClose}
                                    className="w-full py-3 mt-2 rounded-2xl text-text-desc hover:text-white font-bold uppercase tracking-widest text-[10px] transition-colors"
                                >
                                    Not now
                                </button>
                            </div>
                        </div>

                    </div>

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 text-text-desc hover:text-white transition-colors z-30 bg-black/40 rounded-full backdrop-blur-md"
                    >
                        <X size={20} />
                    </button>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
