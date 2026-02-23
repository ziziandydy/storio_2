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
            className="px-8 py-4 bg-accent-gold text-folio-black rounded-full font-black uppercase tracking-widest text-xs hover:bg-white transition-all shadow-[0_0_30px_rgba(233,108,38,0.4)] flex items-center gap-2"
          >
            <ArrowLeft size={16} /> Return to Storio
          </Link>
    </div>
  );
}
