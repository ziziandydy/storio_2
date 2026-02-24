'use client';

import React, { useState, useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Story } from '@/types';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Stamp, Calendar, Feather } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface GalleryViewProps {
  stories: Story[];
}

export default function GalleryView({ stories }: GalleryViewProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: 'center',
    skipSnaps: false,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const activeStory = stories[selectedIndex] || stories[0];

  if (!stories.length) return null;

  // Calculate height to fill screen minus header (approx 80px) and padding
  return (
    <div className="relative w-full h-[calc(100vh-140px)] flex flex-col items-center justify-center overflow-hidden rounded-2xl animate-in fade-in duration-500">

      {/* Dynamic Blurred Background - Fills the entire container */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-folio-black/30 z-10" />

        {activeStory?.poster_path && (
          <Image
            src={activeStory.poster_path}
            alt="Background"
            fill
            className="object-cover blur-md opacity-40 scale-110 transition-all duration-700 ease-in-out"
            unoptimized
          />
        )}

        {/* Gradient only at the very bottom to blend with navigation */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-folio-black via-folio-black/50 to-transparent z-20" />
      </div>

      {/* Carousel - Centered with comfortable spacing */}
      <div className="relative z-30 w-full max-w-5xl px-4" ref={emblaRef}>
        <div className="flex touch-pan-y gap-8 py-8 items-center">
          {stories.map((story, index) => (
            <div
              key={story.id}
              className={`
                relative flex-[0_0_70%] sm:flex-[0_0_45%] lg:flex-[0_0_30%] min-w-0 
                transition-all duration-500 ease-out
                ${index === selectedIndex ? 'scale-110 opacity-100 z-20 shadow-2xl' : 'scale-90 opacity-40 z-10 blur-[2px] grayscale-[50%]'}
              `}
              onClick={() => {
                if (index === selectedIndex) {
                  router.push(`/collection/${story.id}`);
                } else {
                  emblaApi?.scrollTo(index);
                }
              }}
            >
              <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border border-white/10 group cursor-pointer bg-folio-black">
                <Image
                  src={story.poster_path || '/image/defaultMoviePoster.svg'}
                  alt={story.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  priority={index === selectedIndex}
                  sizes="(max-width: 768px) 70vw, 30vw"
                />

                {/* Date Badge (Top-Left) */}
                <div className={`absolute top-3 left-3 z-20 transition-opacity duration-300 ${index === selectedIndex ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="bg-black/60 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-lg uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={12} className="text-accent-gold" />
                    {new Date(story.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>

                {/* Missing Metadata Hints (Top-Right) */}
                <div className={`absolute top-3 right-3 z-20 flex items-center gap-1.5 transition-opacity duration-300 ${index === selectedIndex ? 'opacity-100' : 'opacity-0'}`}>
                  {(!story.notes || story.notes.trim() === '') && (
                    <div className="p-2 bg-black/60 backdrop-blur-md rounded-full border border-accent-gold/40 text-accent-gold animate-pulse shadow-lg">
                      <Feather size={16} strokeWidth={2.5} />
                    </div>
                  )}
                </div>

                {/* Overlay Info (Only for active) */}
                <div className={`
                  absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6
                  ${index === selectedIndex ? 'opacity-100' : ''}
                `}>
                  <h3 className="text-2xl font-bold text-white font-serif leading-tight drop-shadow-md">{story.title}</h3>
                  <div className="flex items-center gap-3 mt-2">
                    {story.rating > 0 ? (
                      <div className="flex items-center gap-1.5 bg-accent-gold/20 backdrop-blur-md border border-accent-gold/40 px-2 py-1 rounded text-accent-gold">
                        <Stamp size={14} strokeWidth={2.5} />
                        <span className="font-black text-xs tracking-wide">{story.rating}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-accent-gold/20 backdrop-blur-md border border-accent-gold/40 px-3 py-1.5 rounded-full text-accent-gold animate-pulse shadow-[0_0_15px_rgba(233,108,38,0.4)]">
                        <span className="font-black text-[10px] tracking-widest uppercase">SCORE</span>
                      </div>
                    )}
                    <span className="text-white/60 text-sm capitalize border border-white/20 px-2 py-0.5 rounded-full">{story.media_type}</span>
                    <span className="text-white/40 text-sm ml-auto">{story.year}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Dots - Comfortable spacing below poster */}
      <div className="relative z-40 mt-6 flex items-center justify-center gap-3 pb-8">
        {stories.map((_, index) => (
          <button
            key={index}
            onClick={() => emblaApi?.scrollTo(index)}
            className={`h-1.5 rounded-full transition-all duration-500 ${index === selectedIndex
              ? 'w-10 bg-accent-gold shadow-[0_0_15px_rgba(233,108,38,0.6)]'
              : 'w-1.5 bg-white/20 hover:bg-white/40'
              }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

    </div>
  );
}