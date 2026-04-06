'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle } from 'lucide-react';

type ToastType = 'success' | 'error';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    // Limit to 1 toast at a time for cleaner UI - new replaces old
    setToasts([{ id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-[calc(var(--sa-top)+0.5rem)] inset-x-0 z-[200] flex justify-center pointer-events-none">
        <AnimatePresence mode="wait">
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`absolute top-0 flex items-center gap-3 px-6 py-3 rounded-full shadow-2xl backdrop-blur-xl border border-white/10 ${
                toast.type === 'success' 
                  ? 'bg-folio-black/90 text-white shadow-accent-gold/20' 
                  : 'bg-red-950/90 text-white shadow-red-500/20'
              }`}
            >
              <div className={`p-1 rounded-full ${toast.type === 'success' ? 'bg-accent-gold text-folio-black' : 'bg-red-500 text-white'}`}>
                {toast.type === 'success' ? (
                  <CheckCircle2 size={16} strokeWidth={3} />
                ) : (
                  <AlertCircle size={16} strokeWidth={3} />
                )}
              </div>
              <span className="text-sm font-bold tracking-wide pr-2">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
