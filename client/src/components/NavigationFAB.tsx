'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Plus, Search, Layers, Home, X } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/hooks/useTranslation';

export default function NavigationFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();
  const pathname = usePathname();

  const menuItems = pathname?.startsWith('/collection')
    ? [
      { icon: Home, label: t.nav.home, href: '/', color: 'bg-folio-card border border-white/10 text-white' },
      { icon: Search, label: t.nav.search, href: '/search', color: 'bg-folio-card border border-white/10 text-white' },
    ]
    : [
      { icon: Search, label: t.nav.search, href: '/search', color: 'bg-folio-card border border-white/10 text-white' },
      { icon: Layers, label: t.nav.collection, href: '/collection', color: 'bg-folio-card border border-white/10 text-white' },
    ];

  return (
    <div className="fixed bottom-8 right-6 z-50 flex flex-col items-end gap-4">
      <AnimatePresence>
        {isOpen && (
          <div className="flex flex-col items-end gap-3 mb-2">
            {menuItems.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.8 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  href={item.href}
                  className="flex items-center gap-4 group"
                  onClick={() => setIsOpen(false)}
                >
                  <span className="text-white text-[10px] uppercase font-black tracking-widest bg-folio-black/60 px-4 py-2 rounded-xl backdrop-blur-xl border border-white/10 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.label}
                  </span>
                  <div className={`w-14 h-14 rounded-2xl ${item.color} flex items-center justify-center shadow-2xl hover:bg-accent-gold hover:text-folio-black transition-all duration-300`}>
                    <item.icon size={22} />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-2xl flex items-center justify-center text-folio-black shadow-[0_0_30px_rgba(233,108,38,0.3)] transition-all duration-500 z-50 ${isOpen ? 'bg-white rotate-45 scale-90' : 'bg-accent-gold hover:scale-110 active:scale-95'
          }`}
      >
        {isOpen ? <X size={28} /> : <Plus size={28} strokeWidth={3} />}
      </button>
    </div>
  );
}
