'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Layers } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function HeroStats() {
  const { token, loading: authLoading } = useAuth();
  const [count, setCount] = useState(0);
  const [level, setLevel] = useState('Novice Builder');

  useEffect(() => {
    if (token) {
      fetch('http://127.0.0.1:8010/api/v1/collection/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => res.json())
      .then(data => {
        const c = data.length;
        setCount(c);
        if (c > 50) setLevel('Keeper');
        else if (c > 20) setLevel('Archivist');
        else if (c > 10) setLevel('Curator');
        else setLevel('Novice Collector');
      })
      .catch(err => console.error("Failed to fetch stats", err));
    }
  }, [token]);

  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4 relative z-10">
      <div className="mb-2 flex items-center gap-2 text-accent-gold/80 uppercase tracking-[0.3em] text-[10px] font-bold">
        <Layers size={12} />
        <span>{level}</span>
      </div>
      
      <h1 className="text-5xl md:text-7xl font-black text-text-primary mb-2 font-serif tracking-tight">
        {count} <span className="text-xl md:text-3xl text-text-desc font-light">Stories</span>
      </h1>
      
      <p className="text-text-desc text-sm max-w-xs mb-8 leading-relaxed">
        Your personal folio for collected stories.
      </p>

      <Link 
        href="/collection" 
        className="group relative inline-flex items-center gap-3 px-8 py-4 bg-accent-gold text-folio-black rounded-full font-bold uppercase tracking-widest text-xs hover:bg-white transition-all duration-300 shadow-[0_0_20px_rgba(233,108,38,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)]"
      >
        <Layers size={18} strokeWidth={3} />
        <span>View Folio</span>
      </Link>
    </div>
  );
}
