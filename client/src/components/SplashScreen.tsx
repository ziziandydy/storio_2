'use client';
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { SplashScreen as NativeSplash } from '@capacitor/splash-screen';

export default function SplashScreen({ onComplete }: { onComplete?: () => void }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Hide native splash screen as soon as our web splash is ready
    NativeSplash.hide().catch(console.error);

    // Video length seems to be around 3-4 seconds based on typical splashes.
    // We set a timeout to fade it out. 
    // Ideally we listen to 'onended' event of video, but timeout is smoother for UI transitions.
    // Video is approx 4s. We want fade out to start at 2.5s and last 2s.
    // Total time until unmount = 4.5s
    const timer = setTimeout(() => {
      setIsVisible(false);
      // Wait for exit animation (2.0s) to finish before unmounting from parent
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
            src="/video/splash.mp4"
            autoPlay
            muted
            playsInline
            className="w-full max-w-md object-contain"
            // Ensure it covers screen on mobile but contains on desktop
            style={{ maxHeight: '80vh' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
