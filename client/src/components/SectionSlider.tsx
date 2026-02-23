'use client';

import React, { useEffect, useState, useRef } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StoryCard from './StoryCard';
import AddToFolioModal from './AddToFolioModal';
import { useAuth } from '@/hooks/useAuth';
import { useSettingsStore } from '@/store/settingsStore';
import { getApiUrl } from '@/lib/api';
import confetti from 'canvas-confetti';
import { useToast } from '@/components/ToastProvider';

interface StoryData {
  title: string;
  media_type: 'movie' | 'book';
  subtype?: string;
  year?: number;
  external_id: string;
  poster_path?: string;
  source: string;
}

interface SectionSliderProps {
  title: string;
  endpoint: string;
  viewAllLink: string; // Keep prop but use it for the last card
}

export default function SectionSlider({ title, endpoint, viewAllLink }: SectionSliderProps) {
  const [items, setItems] = useState<StoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { token } = useAuth();
  const { showToast } = useToast();
  const { language } = useSettingsStore();
  const router = useRouter();

  // Add To Folio Modal State
  const [selectedStory, setSelectedStory] = useState<StoryData | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const openAddModal = (item: StoryData) => {
    setSelectedStory(item);
    setIsAddModalOpen(true);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(getApiUrl(endpoint), {
          headers: {
            'Accept-Language': language
          }
        });
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        setItems(data);
      } catch (error) {
        console.error(`Failed to fetch ${title}:`, error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [endpoint, title, language]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { current } = scrollRef;
      const scrollAmount = direction === 'left' ? -300 : 300;
      current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleAddToFolio = async (rating: number, notes: string, date?: string) => {
    if (!selectedStory || !token) {
      return { status: 'unauthorized' };
    }

    try {
      const res = await fetch(getApiUrl('/api/v1/collection/'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...selectedStory,
          rating,
          notes,
          created_at: date ? new Date(date).toISOString() : undefined
        })
      });

      if (res.status === 409) {
        return { status: 'duplicate' };
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to add item');
      }
      
      return await res.json();
    } catch (error: any) {
      throw error; // Let modal handle UI
    }
  };

  if (loading) return (
    <div className="py-4 animate-pulse">
      <div className="h-6 w-32 bg-white/5 rounded mb-4 ml-4"></div>
      <div className="flex gap-4 overflow-hidden pl-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="min-w-[200px] md:min-w-[240px] h-[300px] bg-white/5 rounded-lg"></div>
        ))}
      </div>
    </div>
  );

  if (items.length === 0) return null;

  return (
    <section className="py-4 border-b border-white/5">
      <div className="flex items-center justify-between px-6 mb-4">
        <h2 className="text-xl font-bold text-text-primary tracking-wide">{title}</h2>
      </div>

      <div className="relative group">
        {/* Scroll Buttons (Desktop) */}
        <button
          onClick={() => scroll('left')}
          className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-folio-black/80 backdrop-blur border border-white/10 rounded-full items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-accent-gold hover:border-accent-gold"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={() => scroll('right')}
          className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-folio-black/80 backdrop-blur border border-white/10 rounded-full items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-accent-gold hover:border-accent-gold"
        >
          <ChevronRight size={20} />
        </button>

        {/* Scrollable Container */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-6 px-6 scrollbar-hide snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((item) => (
            <div key={item.external_id} className="min-w-[200px] md:min-w-[240px] w-[200px] md:w-[240px] aspect-[2/3] snap-center">
              <StoryCard
                title={item.title}
                type={item.media_type}
                subtype={item.subtype}
                year={item.year}
                source={item.source}
                posterUrl={item.poster_path}
                external_id={item.external_id}
                onAdd={() => openAddModal(item)}
              />
            </div>
          ))}

          {/* "Not what you're looking for?" Card */}
          <div className="min-w-[200px] md:min-w-[240px] w-[200px] md:w-[240px] snap-center flex flex-col items-center justify-center">
            <Link
              href={viewAllLink}
              className="group flex flex-col items-center justify-center w-full h-full aspect-[2/3] bg-folio-card border border-dashed border-white/10 rounded-lg hover:border-accent-gold hover:bg-folio-card-hover transition-all p-4 text-center gap-4"
            >
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform text-text-desc group-hover:text-accent-gold">
                <Search size={24} />
              </div>
              <p className="text-xs text-text-desc font-medium leading-relaxed group-hover:text-text-primary">
Not what you&apos;re looking for?
              </p>
              <span className="text-[10px] uppercase font-bold tracking-widest text-accent-gold border-b border-accent-gold/30 pb-0.5">
                Find Stories
              </span>
            </Link>
          </div>

          {/* Spacer for right padding */}
          <div className="w-2 shrink-0"></div>
        </div>
      </div>

      {/* Add To Folio Modal */}
      {selectedStory && (
        <AddToFolioModal 
          isOpen={isAddModalOpen} 
          onClose={() => setIsAddModalOpen(false)} 
          onSave={handleAddToFolio} 
          onViewDetails={(id) => {
            if (id) {
              router.push(`/collection/${id}`);
            } else {
              router.push(`/details/${selectedStory.media_type}/${selectedStory.external_id}`);
            }
          }}
          title={selectedStory.title} 
          external_id={selectedStory.external_id}
        />
      )}
    </section>
  );
}
