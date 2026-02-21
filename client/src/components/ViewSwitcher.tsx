'use client';

import React, { useEffect, useState } from 'react';
import { LayoutGrid, CalendarDays, GalleryHorizontal } from 'lucide-react';
import { useViewStore, ViewMode } from '@/store/viewStore';
import { useToast } from '@/components/ToastProvider';

export default function ViewSwitcher() {
  const { currentView, cycleView } = useViewStore();
  // @ts-ignore - Context is verified to exist in page wrapper
  const { showToast } = useToast(); 
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggle = () => {
    const order: ViewMode[] = ['list', 'calendar', 'gallery'];
    const nextIndex = (order.indexOf(currentView) + 1) % order.length;
    const nextView = order[nextIndex];

    const viewNames: Record<ViewMode, string> = {
      list: 'Grid View',
      calendar: 'Calendar View',
      gallery: 'Gallery View'
    };

    cycleView();
    showToast(`Switched to ${viewNames[nextView]}`, 'success');
  };

  // Prevent hydration mismatch by rendering nothing on server
  if (!mounted) {
    return (
      <div className="w-8 h-8 rounded-full bg-folio-card border border-white/5 opacity-50" />
    );
  }

  return (
    <button
      onClick={handleToggle}
      className="group relative flex items-center justify-center w-8 h-8 rounded-full bg-folio-card border border-white/5 text-text-desc hover:text-accent-gold hover:border-accent-gold/30 transition-all duration-300 active:scale-95"
      aria-label="Switch View"
      title="Switch View Mode"
    >
      <div className="absolute inset-0 bg-accent-gold/5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
      
      {currentView === 'list' && (
        <LayoutGrid size={14} strokeWidth={2} className="animate-in fade-in zoom-in duration-300" />
      )}
      {currentView === 'calendar' && (
        <CalendarDays size={14} strokeWidth={2} className="animate-in fade-in zoom-in duration-300" />
      )}
      {currentView === 'gallery' && (
        <GalleryHorizontal size={14} strokeWidth={2} className="animate-in fade-in zoom-in duration-300" />
      )}
    </button>
  );
}
