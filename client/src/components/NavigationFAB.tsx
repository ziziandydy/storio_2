'use client';

import React, { useState } from 'react';
import { Plus, Search, Layers, X } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function NavigationFAB() {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { icon: Search, label: 'Search', href: '/search', color: 'bg-blue-600' },
    { icon: Layers, label: 'Collection', href: '/collection', color: 'bg-emerald-600' },
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
                  className="flex items-center gap-3 group"
                  onClick={() => setIsOpen(false)}
                >
                  <span className="text-white text-sm font-bold bg-black/80 px-3 py-1 rounded-md backdrop-blur-md shadow-lg">
                    {item.label}
                  </span>
                  <div className={`w-12 h-12 rounded-full ${item.color} flex items-center justify-center text-white shadow-lg shadow-black/50 hover:scale-110 transition-transform`}>
                    <item.icon size={20} />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-full flex items-center justify-center text-folio-black shadow-2xl shadow-accent-gold/20 transition-all duration-300 z-50 ${
          isOpen ? 'bg-white rotate-45' : 'bg-accent-gold hover:scale-110'
        }`}
      >
        {isOpen ? <Plus size={28} /> : <Plus size={28} strokeWidth={3} />}
      </button>
    </div>
  );
}
