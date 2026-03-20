'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { User, Menu, Search, Layers, Plus, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import HomeStats from '@/components/HomeStats';
import AddToFolioModal from '@/components/AddToFolioModal';
import { useTranslation } from '@/hooks/useTranslation';
import SectionSlider from '@/components/SectionSlider';
import NavigationFAB from '@/components/NavigationFAB';
import SplashScreen from '@/components/SplashScreen';
import OnboardingModal from '@/components/OnboardingModal';
import OnboardingGuideModal, { hasSeenOnboarding, markOnboardingSeen } from '@/components/OnboardingGuideModal';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { supabase, getURL } from '@/lib/supabase';
import { SplashScreen as NativeSplash } from '@capacitor/splash-screen';

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const [scrollY, setScrollY] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<'social' | 'email' | 'otp' | 'profile'>('social');
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    // Determine splash state on mount
    const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');
    if (!hasSeenSplash) {
      setShowSplash(true);
    } else {
      // If skipping splash, hide native one immediately
      NativeSplash.hide().catch(() => {});
    }
    
    setIsInitialized(true);

    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isInitialized && !authLoading) {
      // Case 1: Logged in user missing profile info
      const isRegistered = user && user.is_anonymous === false;
      const hasSkippedProfile = sessionStorage.getItem('storio_skipped_profile');

      // Check if profile is explicitly marked as completed
      const isProfileIncomplete = isRegistered && !user.user_metadata?.profile_completed;

      if (isProfileIncomplete && !hasSkippedProfile) {
        setOnboardingStep('profile');
        setShowOnboarding(true);
        return;
      }

      // Case 2: Guest user seeing onboarding for the first time
      if (user?.is_anonymous !== false) {
        const hasSeenOnboardingModal = sessionStorage.getItem('hasSeenOnboarding');
        if (!hasSeenOnboardingModal && !showSplash) {
          setOnboardingStep('social');
          setShowOnboarding(true);
          return;
        }
      }

      // Case 3: 功能引導學習卡（首次使用，登入流程結束後）
      if (!showSplash && !hasSeenOnboarding()) {
        const timer = setTimeout(() => setShowGuide(true), 400);
        return () => clearTimeout(timer);
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

  const handleLogin = async (provider: 'google' | 'apple' | 'email') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider as any,
        options: {
          redirectTo: getURL('/auth/callback')
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  if (!isInitialized) {
    return <div className="fixed inset-0 bg-folio-black z-[200]" />;
  }

  return (
    <div className="bg-folio-black min-h-screen text-white font-sans relative overflow-x-hidden selection:bg-accent-gold/30">
      {/* Intro Animation */}
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}

      {/* Onboarding Modal（登入） */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={handleOnboardingClose}
        onLogin={handleLogin}
        onContinueAsGuest={handleOnboardingClose}
        initialStep={onboardingStep}
      />

      {/* Feature Guide（學習卡） */}
      <OnboardingGuideModal
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
      />

      {/* Background Layer */}
      <div className="fixed inset-0 z-0 bg-folio-black pointer-events-none">
        <Image
          src="/image/heroBackground_v2.jpg"
          alt="Hero Background"
          fill
          className="object-cover opacity-20"
          priority
          unoptimized
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-folio-black via-folio-black/90 to-folio-black"></div>
      </div>

      {/* Header - Minimalist */}
      <header className={`fixed top-[var(--sa-top)] left-0 right-0 z-50 transition-all duration-500 px-6 py-4 flex items-center justify-between ${scrollY > 20 ? 'bg-folio-black/80 backdrop-blur-xl border-b border-white/5' : 'bg-transparent'}`}>
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

        <Link href="/profile" className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur border border-white/10 flex items-center justify-center transition-all hover:scale-105 active:scale-95 group overflow-hidden">
          {user?.user_metadata?.avatar_url ? (
            <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <User size={16} className="text-white/70 group-hover:text-white transition-colors" />
          )}
        </Link>
      </header>

      {/* Main Content */}
      <main className="relative z-10 pt-28 pb-40 space-y-16">

        {/* Hero Section */}
        <div className="flex flex-col items-center justify-center text-center px-4 mb-8">
          <h1 className="text-5xl md:text-8xl font-black font-serif text-white tracking-tighter mb-6 drop-shadow-2xl">
            Storio
          </h1>
          <p className="text-xl md:text-2xl text-text-desc font-light tracking-wide max-w-2xl mb-10 drop-shadow-lg">
            {t.home.heroSubtitle}
          </p>
        </div>

        {/* Stats Section */}
        <div className="flex flex-col items-center gap-12">
          <HomeStats />

          <div className="flex gap-4">
            <Link href="/collection" className="group px-8 py-4 bg-accent-gold text-folio-black rounded-full font-black uppercase tracking-widest text-xs hover:bg-white transition-all shadow-[0_0_30px_rgba(233,108,38,0.4)] flex items-center gap-2">
              {t.home.viewStorio} <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Trending Sections */}
        <div className="space-y-16">
          <SectionSlider
            title={t.home.trendingMovies}
            endpoint="/api/v1/search/trending/movies"
            viewAllLink="/search?filter=movie"
          />

          <SectionSlider
            title={t.home.trendingSeries}
            endpoint="/api/v1/search/trending/series"
            viewAllLink="/search?filter=tv"
          />

          <SectionSlider
            title={t.home.trendingReads}
            endpoint="/api/v1/search/trending/books"
            viewAllLink="/search?filter=book"
          />
        </div>
      </main>

      <NavigationFAB />
    </div>
  );
}
