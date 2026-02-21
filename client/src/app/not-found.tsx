'use client';

import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-folio-black flex flex-col items-center justify-center p-6 text-center">
      <div className="relative mb-8">
        <BookOpen size={64} className="text-text-desc opacity-40" strokeWidth={1} />
        <div className="absolute inset-0 bg-accent-gold/10 blur-3xl rounded-full"></div>
      </div>
      
      <h2 className="text-2xl font-serif font-bold text-white mb-2 tracking-wide">Page Not Found</h2>
      <p className="text-sm text-text-desc max-w-xs mx-auto mb-8 leading-relaxed">
        The page you are looking for has not been archived in the folio yet.
      </p>

      <Link 
        href="/"
        className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white text-xs font-bold uppercase tracking-widest transition-all hover:scale-105"
      >
        <ArrowLeft size={16} /> Return to Folio
      </Link>
    </div>
  );
}
