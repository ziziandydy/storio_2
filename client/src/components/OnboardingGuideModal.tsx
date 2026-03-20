'use client';

import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Search, Star, CalendarDays } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import FeatureGuideCard from './FeatureGuideCard';
import { useTranslation } from '@/hooks/useTranslation';

interface OnboardingGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_KEY = 'storio_onboarding_seen';

export function markOnboardingSeen() {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, 'true');
  }
}

export function hasSeenOnboarding(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

export default function OnboardingGuideModal({ isOpen, onClose }: OnboardingGuideModalProps) {
  const { t } = useTranslation();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const cards = [
    {
      icon: Layers,
      title: t.onboardingGuide.card1Title,
      description: t.onboardingGuide.card1Desc,
    },
    {
      icon: Search,
      title: t.onboardingGuide.card2Title,
      description: t.onboardingGuide.card2Desc,
    },
    {
      icon: Star,
      title: t.onboardingGuide.card3Title,
      description: t.onboardingGuide.card3Desc,
    },
    {
      icon: CalendarDays,
      title: t.onboardingGuide.card4Title,
      description: t.onboardingGuide.card4Desc,
    },
  ];

  const isLastCard = selectedIndex === cards.length - 1;

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  React.useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi, onSelect]);

  const handleNext = useCallback(() => {
    if (!emblaApi) return;
    if (isLastCard) {
      handleClose();
    } else {
      emblaApi.scrollNext();
    }
  }, [emblaApi, isLastCard]);

  const handleClose = useCallback(() => {
    markOnboardingSeen();
    onClose();
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex flex-col bg-[#0d0d0d]"
        >
          {/* 略過按鈕 — 使用 safe-area-inset-top 避免被瀏海 / Dynamic Island 遮擋 */}
          <div
            className="flex justify-end px-6 pb-2"
            style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}
          >
            <button
              onClick={handleClose}
              className="text-sm text-white/40 hover:text-white/70 transition-colors px-2 py-1"
            >
              {t.onboardingGuide.skip}
            </button>
          </div>

          {/* Carousel */}
          <div className="flex-1 overflow-hidden" ref={emblaRef}>
            <div className="flex h-full">
              {cards.map((card, index) => (
                <div key={index} className="flex-[0_0_100%] min-w-0 h-full">
                  <FeatureGuideCard
                    icon={card.icon}
                    title={card.title}
                    description={card.description}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 底部：Dot Indicator + 按鈕 — 加 safe-area-inset-bottom 避免 Home Indicator 遮擋 */}
          <div
            className="px-8 pt-4 flex flex-col items-center gap-6"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 32px)' }}
          >
            {/* Dot Indicator — 可點擊跳轉（含回上一步） */}
            <div className="flex gap-3 items-center">
              {cards.map((_, index) => (
                <button
                  key={index}
                  onClick={() => emblaApi?.scrollTo(index)}
                  className="rounded-full transition-all duration-300 focus:outline-none"
                  style={{
                    width: index === selectedIndex ? 20 : 8,
                    height: 8,
                    backgroundColor: index === selectedIndex ? '#c5a059' : 'rgba(255,255,255,0.2)',
                  }}
                />
              ))}
            </div>

            {/* CTA Button */}
            <button
              onClick={handleNext}
              className="w-full max-w-xs py-4 rounded-2xl bg-[#c5a059] text-black font-semibold text-base transition-opacity active:opacity-80"
            >
              {isLastCard ? t.onboardingGuide.getStarted : t.onboardingGuide.next}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
