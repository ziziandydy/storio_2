'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  parseISO,
  isSameDay
} from 'date-fns';
import { zhTW, enUS } from 'date-fns/locale';
import { X, Stamp, Share2 } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Story } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/hooks/useTranslation';
import MonthlyRecapModal from '@/components/MonthlyRecapModal';

interface CalendarViewProps {
  stories: Story[];
}

export default function CalendarView({ stories }: CalendarViewProps) {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const dateLocale = locale === 'zh-TW' ? zhTW : enUS;

  // Initial state: current month and one future month for space
  const [months, setMonths] = useState<Date[]>([new Date(), addMonths(new Date(), 1)]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [sharingMonth, setSharingMonth] = useState<Date | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const isFetchingRef = useRef(false);

  // Group stories by date
  const storiesByDate = useMemo(() => {
    const groups: Record<string, Story[]> = {};
    stories.forEach(story => {
      const dateKey = format(parseISO(story.created_at), 'yyyy-MM-dd');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(story);
    });
    return groups;
  }, [stories]);

  // Load more logic
  const loadMoreMonths = useCallback((direction: 'prev' | 'next') => {
    if (isFetchingRef.current) return;

    setMonths(prev => {
      if (direction === 'prev') {
        isFetchingRef.current = true;
        const first = prev[0];

        // Reset lock after render
        setTimeout(() => { isFetchingRef.current = false; }, 500);

        // Prepend 2 months
        return [subMonths(first, 2), subMonths(first, 1), ...prev];
      } else {
        // Disable auto-loading further into the future
        return prev;
      }
    });
  }, []);

  // Initial scroll to Current Month
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentMonthId = `month-${format(new Date(), 'yyyy-MM')}`;
      const element = document.getElementById(currentMonthId);
      if (element) {
        element.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Intersection Observer
  useEffect(() => {
    const options = { root: null, rootMargin: '200px', threshold: 0.1 };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (entry.target === topSentinelRef.current) {
            // Maintain scroll position logic would go here, but for simplicity we just load
            // To prevent jumping, we might need a more complex layout, 
            // but let's try standard prepend first.
            // Actually, prepend usually causes jump. 
            // Let's stick to append (downwards) logic for "Past -> Future" or just "Future -> Past"?
            // Calendar is usually chronological. 

            // For this iteration, let's implement "Load Previous" button behavior automatically?
            // Or better: Let's focus on the UX. Infinite scroll upwards is hard without specific virtualization libs.

            // Simplification: We only auto-load downwards (Future) or Upwards (Past)?
            // Let's try loading previous months.

            // NOTE: Saving scroll position is tricky in React purely with state.
            // We will skip auto-prepend to avoid UX glitches and instead just rely on
            // the user scrolling up into "newly added space".

            const currentScrollHeight = document.documentElement.scrollHeight;
            loadMoreMonths('prev');
            // Restoration of scroll position happens in useLayoutEffect ideally
          } else if (entry.target === bottomSentinelRef.current) {
            loadMoreMonths('next');
          }
        }
      });
    }, options);

    if (topSentinelRef.current) observer.observe(topSentinelRef.current);
    if (bottomSentinelRef.current) observer.observe(bottomSentinelRef.current);

    return () => observer.disconnect();
  }, [loadMoreMonths]);


  // Handle cell click
  const handleDayClick = (date: Date, dayStories: Story[]) => {
    if (dayStories.length === 0) return;
    if (dayStories.length === 1) {
      router.push(`/collection/${dayStories[0].id}`);
    } else {
      setSelectedDate(date);
    }
  };

  const selectedStories = selectedDate
    ? storiesByDate[format(selectedDate, 'yyyy-MM-dd')] || []
    : [];

  // Helper to get all stories for a specific month
  const getMonthStories = (month: Date) => {
    return stories.filter(s => isSameMonth(parseISO(s.created_at), month))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  return (
    <div className="w-full relative animate-in fade-in duration-500 pb-20">

      {/* Top Sentinel */}
      <div ref={topSentinelRef} className="h-10 w-full flex items-center justify-center text-text-desc opacity-50 text-xs py-4">
        {t.collection.calendar.loadingPast}
      </div>

      <div className="flex flex-col gap-12">
        {months.map((month) => (
          <MonthGrid
            key={month.toISOString()}
            month={month}
            storiesByDate={storiesByDate}
            onDayClick={handleDayClick}
            onShareClick={(m) => setSharingMonth(m)}
            locale={dateLocale}
          />
        ))}
      </div>

      {/* Bottom Sentinel */}
      <div ref={bottomSentinelRef} className="h-10 w-full" />

      {/* Multi-item Overlay */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setSelectedDate(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-folio-card border border-white/10 rounded-2xl max-w-lg w-full max-h-[70vh] flex flex-col shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-folio-black/50">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-accent-gold">
                    {format(selectedDate, 'MMMM d, yyyy', { locale: dateLocale })}
                  </span>
                  <span className="text-text-desc text-xs font-normal bg-white/5 px-2 py-0.5 rounded-full">
                    {selectedStories.length} {t.collection.calendar.stories}
                  </span>
                </h3>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="p-1 hover:bg-white/10 rounded-full transition-colors text-text-desc hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 overflow-y-auto grid gap-3 custom-scrollbar">
                {selectedStories.map(story => (
                  <div
                    key={story.id}
                    onClick={() => router.push(`/collection/${story.id}`)}
                    className="flex gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5 group"
                  >
                    <div className="relative w-16 h-24 flex-shrink-0 rounded-lg overflow-hidden shadow-lg">
                      <Image
                        src={story.poster_path || '/image/defaultMoviePoster.svg'}
                        alt={story.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="flex flex-col justify-center flex-1 min-w-0">
                      <h4 className="font-bold text-white group-hover:text-accent-gold transition-colors truncate pr-2">{story.title}</h4>
                      <div className="flex items-center gap-2 text-xs text-text-desc mt-1">
                        <span className="capitalize px-1.5 py-0.5 rounded bg-white/5">{story.media_type}</span>
                        {/* Updated Rating Display */}
                        {story.rating > 0 ? (
                          <div className="flex items-center gap-1 text-accent-gold bg-accent-gold/10 px-1.5 py-0.5 rounded border border-accent-gold/20">
                            <Stamp size={10} className="text-accent-gold" />
                            <span className="font-bold">{story.rating}</span>
                          </div>
                        ) : (
                          <div className="flex items-center bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-accent-gold border border-accent-gold/40 shadow-sm animate-pulse">
                            <span className="font-black text-[8px] tracking-widest uppercase">SCORE</span>
                          </div>
                        )}
                      </div>
                      {story.notes && (
                        <p className="text-xs text-text-desc mt-2 line-clamp-2 italic opacity-70">&quot;{story.notes}&quot;</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Month Recap Share Modal */}
      {sharingMonth && (
        <MonthlyRecapModal
          isOpen={!!sharingMonth}
          onClose={() => setSharingMonth(null)}
          monthValue={format(sharingMonth, 'yyyy-MM')}
          monthName={format(sharingMonth, 'MMMM yyyy', { locale: dateLocale })}
        />
      )}
    </div>
  );
}

// Sub-component for individual month grid
function MonthGrid({ month, storiesByDate, onDayClick, onShareClick, locale }: { month: Date, storiesByDate: Record<string, Story[]>, onDayClick: (d: Date, s: Story[]) => void, onShareClick: (m: Date) => void, locale: any }) {
  const isFuture = month > new Date() && !isSameMonth(month, new Date());

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month));
    const end = endOfWeek(endOfMonth(month));
    return eachDayOfInterval({ start, end });
  }, [month]);

  const weekDays = locale.code === 'zh-TW'
    ? ['日', '一', '二', '三', '四', '五', '六']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (isFuture) {
    return <div id={`month-${format(month, 'yyyy-MM')}`} className="h-[60vh] w-full" />;
  }

  return (
    <div id={`month-${format(month, 'yyyy-MM')}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-2 sticky top-16 z-20 bg-folio-black/95 backdrop-blur py-2 border-b border-white/5">
        <h2 className="text-xl font-serif font-bold text-accent-gold capitalize">
          {format(month, 'MMMM yyyy', { locale })}
        </h2>

        {/* Share Button for the Month */}
        <button
          onClick={() => onShareClick(month)}
          className="p-2 rounded-full bg-white/5 text-accent-gold hover:bg-accent-gold hover:text-folio-black transition-all"
        >
          <Share2 size={16} />
        </button>
      </div>

      {/* Week Days Header - Only show if it's the first month? No, show for each to be clear */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 px-1">
        {weekDays.map(day => (
          <div key={day} className="text-center text-[10px] sm:text-xs text-text-desc py-1 uppercase tracking-wider font-bold opacity-30">
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 auto-rows-fr px-1">
        {days.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayStories = storiesByDate[dateKey] || [];
          const isCurrentMonth = isSameMonth(day, month);
          const hasStories = dayStories.length > 0;

          // Sort descending by created_at
          const sortedStories = [...dayStories].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          const latestStory = sortedStories[0];

          return (
            <div
              key={day.toISOString()}
              onClick={() => onDayClick(day, dayStories)}
              className={`
                            aspect-[3/4] sm:aspect-square relative rounded-lg border transition-all duration-300
                            ${isCurrentMonth ? 'bg-folio-card border-white/5' : 'bg-transparent border-transparent opacity-10 pointer-events-none'}
                            ${hasStories ? 'cursor-pointer hover:border-accent-gold/50 hover:shadow-[0_0_15px_rgba(233,108,38,0.2)] hover:-translate-y-1' : ''}
                        `}
            >
              {/* Date Number */}
              <span className={`absolute top-1.5 left-2 text-[10px] sm:text-xs z-20 font-bold ${hasStories ? 'text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]' : 'text-text-desc'}`}>
                {format(day, 'd')}
              </span>

              {/* Story Content */}
              {hasStories && (
                <div className="absolute inset-0 p-0.5 z-10">
                  {dayStories.length === 1 ? (
                    // Single Item - Full Cover
                    <div className="relative w-full h-full rounded overflow-hidden bg-folio-black shadow-lg ring-1 ring-white/10 hover:scale-105 transition-transform">
                      <Image
                        src={dayStories[0].poster_path || '/image/defaultMoviePoster.svg'}
                        alt={dayStories[0].title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 14vw, 10vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                    </div>
                  ) : dayStories.length === 2 ? (
                    // Two Items - 1x2 Grid
                    <div className="w-full h-full grid grid-cols-2 grid-rows-1 gap-0.5 rounded overflow-hidden ring-1 ring-white/10 bg-folio-black">
                      {sortedStories.map((story) => (
                        <div key={story.id} className="relative w-full h-full bg-folio-card">
                          <Image
                            src={story.poster_path || '/image/defaultMoviePoster.svg'}
                            alt={story.title}
                            fill
                            className="object-cover"
                            sizes="5vw"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Multiple Items - 2x2 Grid Collage
                    <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5 rounded overflow-hidden ring-1 ring-white/10 bg-folio-black">
                      {sortedStories.slice(0, 4).map((story, idx) => {
                        // Determine if this is the last cell (index 3) AND we have more than 4 items
                        const isOverflowCell = idx === 3 && dayStories.length > 4;
                        const remainingCount = dayStories.length - 3;

                        return (
                          <div key={story.id} className="relative w-full h-full bg-folio-card">
                            <Image
                              src={story.poster_path || '/image/defaultMoviePoster.svg'}
                              alt={story.title}
                              fill
                              className={`object-cover ${isOverflowCell ? 'opacity-40 blur-[1px]' : ''}`}
                              sizes="5vw"
                            />
                            {isOverflowCell && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[1px]">
                                <span className="text-xs font-bold text-white">+{remainingCount}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
