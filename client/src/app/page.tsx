'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { User, Menu, Search, Layers, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import HomeStats from '@/components/HomeStats';
import SectionSlider from '@/components/SectionSlider';
import NavigationFAB from '@/components/NavigationFAB';
import SplashScreen from '@/components/SplashScreen';
import OnboardingModal from '@/components/OnboardingModal';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';

export default function Home() {
  const [scrollY, setScrollY] = useState(0);
  const [showSplash, setShowSplash] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    // Check if splash has been shown in this session
    const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');
    if (!hasSeenSplash) {
      setShowSplash(true);
    }

    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!authLoading && user?.is_anonymous !== false) {
      const hasSeenOnboarding = sessionStorage.getItem('hasSeenOnboarding');
      if (!hasSeenOnboarding && !showSplash) {
        setShowOnboarding(true);
      }
    }
  }, [authLoading, user, showSplash]);

  const handleSplashComplete = () => {
    setShowSplash(false);
    sessionStorage.setItem('hasSeenSplash', 'true');
  };

  const handleOnboardingClose = () => {
    setShowOnboarding(false);
    sessionStorage.setItem('hasSeenOnboarding', 'true');
  };

  return (
    <div className="bg-folio-black min-h-screen text-white font-sans relative overflow-x-hidden selection:bg-accent-gold/30">
      {/* Intro Animation */}
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}

      {/* Onboarding Modal */}
      <OnboardingModal 
        isOpen={showOnboarding} 
        onClose={handleOnboardingClose}
        onLogin={(provider) => {
            console.log("Login with", provider);
            // Implement social login logic here
            handleOnboardingClose();
        }}
        onContinueAsGuest={handleOnboardingClose}
      />

      {/* Background Layer */}
      <div className="fixed inset-0 z-0 bg-folio-black pointer-events-none">
        <Image 
          src="/image/heroBackground.webp" 
          alt="Hero Background" 
          fill
          className="object-cover opacity-30 mix-blend-screen"
          priority
          unoptimized
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-folio-black via-folio-black/90 to-folio-black"></div>
      </div>

      {/* Header - Minimalist */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 px-6 py-4 flex items-center justify-between ${scrollY > 20 ? 'bg-folio-black/80 backdrop-blur-xl border-b border-white/5' : 'bg-transparent'}`}>
        <div className="flex items-center gap-3">
           <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-white/10 shadow-[0_0_15px_rgba(233,108,38,0.2)]">
             <Image 
               src="/image/logo/logo.png" 
               fill 
               alt="Storio" 
               className="object-cover" 
               priority
               sizes="32px"
             />
           </div>
           <span className={`text-sm font-bold tracking-widest uppercase text-white/90 ${scrollY > 20 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'} transition-all duration-500`}>Storio</span>
        </div>
        
        <Link href="/profile" className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur border border-white/10 flex items-center justify-center transition-all hover:scale-105 active:scale-95 group">
          <User size={16} className="text-white/70 group-hover:text-white transition-colors" />
        </Link>
      </header>

      {/* Main Content */}
      <main className="relative z-10 pt-28 pb-40 space-y-12">
        
        {/* Curated Stats (Immersive Hero) */}
        <section className="flex flex-col items-center gap-4 mb-10 px-6 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="space-y-3"
            >
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-white tracking-tight drop-shadow-2xl">
                Storio
              </h1>
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-px bg-accent-gold/30" />
                <p className="text-[10px] uppercase tracking-[0.4em] text-accent-gold font-bold opacity-80">
                  Collect stories in your folio
                </p>
                <div className="w-8 h-px bg-accent-gold/30" />
              </div>
            </motion.div>
            
            <HomeStats />

            <Link 
              href="/collection"
              className="mt-6 flex items-center gap-2 px-8 py-3 bg-accent-gold text-folio-black rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(233,108,38,0.3)] hover:shadow-[0_0_30px_rgba(233,108,38,0.5)] hover:scale-105 active:scale-95 transition-all"
            >
              View My Storio
            </Link>
        </section>
        
        {/* Trending Sections */}
        <div className="space-y-16">
          <SectionSlider 
            title="Trending Movies" 
            endpoint="/api/v1/search/trending/movies" 
            viewAllLink="/search?filter=movie"
          />

          <SectionSlider 
            title="Trending Series" 
            endpoint="/api/v1/search/trending/series" 
            viewAllLink="/search?filter=movie"
          />
          
          <SectionSlider 
            title="Trending Reads" 
            endpoint="/api/v1/search/trending/books" 
            viewAllLink="/search?filter=book"
          />
        </div>
      </main>

      {/* Floating Action Button (Search) */}
      <div className="fixed bottom-8 right-6 z-50">
        <Link 
          href="/search"
          className="group flex items-center justify-center w-14 h-14 bg-accent-gold rounded-full text-folio-black shadow-[0_0_20px_rgba(233,108,38,0.4)] hover:shadow-[0_0_35px_rgba(233,108,38,0.6)] hover:scale-110 active:scale-95 transition-all duration-300 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-full" />
          <Plus size={28} strokeWidth={2.5} className="relative z-10" />
        </Link>
      </div>

    </div>
  );
}
