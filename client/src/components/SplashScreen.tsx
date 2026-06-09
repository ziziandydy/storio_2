'use client';
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { SplashScreen as NativeSplash } from '@capacitor/splash-screen';

export default function SplashScreen({ onComplete }: { onComplete?: () => void }) {
  const [isVisible, setIsVisible] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    NativeSplash.hide().catch(console.error);

    // iOS WKWebView: React's muted prop doesn't always set the DOM property,
    // which blocks autoplay. Set muted imperatively and call play() explicitly.
    const video = videoRef.current;
    if (video) {
      video.muted = true;
      video.play().catch(() => {});
    }

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 2000);
    }, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 2.0, ease: "easeInOut" }}
        >
          <video
            ref={videoRef}
            src="/video/splash.mp4"
            autoPlay
            muted
            playsInline
            className="w-full max-w-md object-contain"
            style={{ maxHeight: '80vh' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
