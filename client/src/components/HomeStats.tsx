'use client';

import React, { useEffect, useState, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DailyCount {
  date: string;
  count: number;
}

interface StatsData {
  last_7_days: number;
  last_14_days: number;
  last_30_days: number;
  this_week: number;
  this_month: number;
  this_year: number;
  daily_counts_7d: DailyCount[];
  daily_counts_30d: DailyCount[];
}

export default function HomeStats() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();
  
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const [enabledSlides, setEnabledSlides] = useState<string[]>(['7d', '30d', 'year', 'trend7', 'trend30']);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  // Auto-play logic
  useEffect(() => {
    if (!emblaApi) return;

    const autoplay = setInterval(() => {
      emblaApi.scrollNext();
    }, 6000); // 6 seconds

    return () => clearInterval(autoplay);
  }, [emblaApi]);

  useEffect(() => {
    // Load preferences
    const saved = localStorage.getItem('storio_dashboard_widgets');
    if (saved) {
      try {
        setEnabledSlides(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse dashboard settings");
      }
    }
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect, enabledSlides]); // Re-run when slides change

  useEffect(() => {
    if (!token) return;
    const fetchStats = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8010/api/v1/collection/stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [token]);

  if (loading || !stats) {
    return (
      <div className="w-full max-w-lg mx-auto relative group py-2">
         <div className="flex flex-col items-center justify-center gap-4 animate-pulse w-full">
            <div className="w-32 h-16 bg-white/5 rounded-lg"></div>
            <div className="w-20 h-3 bg-white/5 rounded"></div>
         </div>
         {/* Fake Dots */}
         <div className="flex justify-center gap-2 mt-4">
            <div className="w-1.5 h-1.5 rounded-full bg-white/10"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-white/10"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-white/10"></div>
         </div>
      </div>
    );
  }

  // --- Components ---

  const SingleStatItem = ({ value, label }: { value: number, label: string }) => (
    <div className="flex flex-col items-center justify-center gap-2 w-full select-none">
      <span className="text-6xl md:text-7xl font-serif text-accent-gold leading-none drop-shadow-[0_0_15px_rgba(233,108,38,0.3)]">
        {value.toString().padStart(2, '0')}
      </span>
      <span className="text-[10px] uppercase tracking-[0.3em] text-text-desc font-bold opacity-60">
        {label}
      </span>
    </div>
  );

  const BarChart = ({ data, label }: { data: DailyCount[], label: string }) => {
    const max = Math.max(...data.map(d => d.count), 1);
    return (
        <div className="flex flex-col items-center w-full px-8 select-none">
            <div className="flex items-end justify-between w-full h-20 gap-1 mb-4">
                {data.map((d, i) => (
                    <div key={i} className="flex-1 h-full flex items-end">
                        <div 
                            className="w-full bg-accent-gold/20 rounded-t-[1px] hover:bg-accent-gold transition-all duration-500"
                            style={{ height: `${(d.count / max) * 100}%`, minHeight: '2px' }}
                        />
                    </div>
                ))}
            </div>
            <span className="text-[10px] uppercase tracking-[0.3em] text-text-desc font-bold opacity-60">
                {label}
            </span>
        </div>
    );
  };

  // --- Slides Mapping ---
  
  const allSlides = [
    {
      id: '7d',
      content: <div key="7d" className="w-full flex justify-center py-2"><SingleStatItem value={stats.last_7_days} label="Last 7 Days" /></div>
    },
    {
      id: '30d',
      content: <div key="30d" className="w-full flex justify-center py-2"><SingleStatItem value={stats.last_30_days} label="Last 30 Days" /></div>
    },
    {
      id: 'week',
      content: <div key="week" className="w-full flex justify-center py-2"><SingleStatItem value={stats.this_week} label="This Week" /></div>
    },
    {
      id: 'month',
      content: <div key="month" className="w-full flex justify-center py-2"><SingleStatItem value={stats.this_month} label="This Month" /></div>
    },
    {
      id: 'year',
      content: <div key="year" className="w-full flex justify-center py-2"><SingleStatItem value={stats.this_year} label={`In ${new Date().getFullYear()}`} /></div>
    },
    {
      id: 'trend7',
      content: <div key="trend7" className="w-full flex justify-center py-2"><BarChart data={stats.daily_counts_7d} label="7-Day Trend" /></div>
    },
    {
      id: 'trend30',
      content: <div key="trend30" className="w-full flex justify-center py-2"><BarChart data={stats.daily_counts_30d} label="30-Day Trend" /></div>
    }
  ];

  const slides = allSlides.filter(s => enabledSlides.includes(s.id));

  if (slides.length === 0) return null;

  return (
    <div className="w-full max-w-lg mx-auto relative group">
        {/* Carousel Viewport */}
        <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
                {slides.map((slide, index) => (
                    <div className="flex-[0_0_100%] min-w-0 py-4" key={index}>
                        {slide.content}
                    </div>
                ))}
            </div>
        </div>

        {/* Navigation Arrows (Visible on Hover/Touch) */}
        <button 
            className="absolute left-0 top-1/2 -translate-y-1/2 p-2 text-white/20 hover:text-accent-gold transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-0"
            onClick={() => emblaApi && emblaApi.scrollPrev()}
            disabled={!emblaApi?.canScrollPrev()}
        >
            <ChevronLeft size={24} />
        </button>
        <button 
            className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-white/20 hover:text-accent-gold transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-0"
            onClick={() => emblaApi && emblaApi.scrollNext()}
            disabled={!emblaApi?.canScrollNext()}
        >
            <ChevronRight size={24} />
        </button>

        {/* Dots Indicator */}
        <div className="flex justify-center gap-2 mt-4">
            {scrollSnaps.map((_, index) => (
                <button
                    key={index}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                        index === selectedIndex ? 'bg-accent-gold w-4' : 'bg-white/10 hover:bg-white/30'
                    }`}
                    onClick={() => emblaApi && emblaApi.scrollTo(index)}
                />
            ))}
        </div>
    </div>
  );
}
