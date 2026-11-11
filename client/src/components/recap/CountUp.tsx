'use client';

import React, { useEffect, useState } from 'react';

function prefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

interface CountUpProps {
  value: number;
  /** false（例如 2B 的渲染服務）或用戶開啟「減少動態效果」時直接顯示終值 */
  animate: boolean;
  duration?: number;
  format?: (n: number) => string;
}

/** 數字 0 → value 的計數動畫（ease-out）。 */
export default function CountUp({ value, animate, duration = 900, format = (n) => String(n) }: CountUpProps) {
  const [display, setDisplay] = useState<number>(animate && !prefersReducedMotion() ? 0 : value);

  useEffect(() => {
    if (!animate || prefersReducedMotion()) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    setDisplay(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, animate, duration]);

  return <span data-testid="count-up">{format(display)}</span>;
}
