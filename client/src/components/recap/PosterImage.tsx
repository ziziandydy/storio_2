'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_POSTER, DEFAULT_POSTER_SIZE, isRemotePoster, type PosterSize } from './posterSrc';
import { loadPoster } from './posterLoader';

interface PosterLoadState {
  /** 可以開始載入（目前頁與鄰近幾頁才載，遠的頁先不動） */
  start: boolean;
  /** 目前顯示的這一頁：海報插隊優先載 */
  active: boolean;
}

/** 沒有 Provider（分享圖渲染頁、測試）時一律立刻載入 */
const PosterLoadContext = createContext<PosterLoadState | null>(null);

/**
 * 控制一頁裡所有 PosterImage 何時開始載入：near 為 true 時開始，之後就算離開鄰近範圍也不收回
 * （已載入的海報留著，翻回去不閃）。
 */
export function PosterLoadGate({ near, active, children }: { near: boolean; active: boolean; children: React.ReactNode }) {
  const [opened, setOpened] = useState(near);
  useEffect(() => {
    if (near) setOpened(true);
  }, [near]);
  const value = useMemo<PosterLoadState>(() => ({ start: opened || near, active }), [opened, near, active]);
  return <PosterLoadContext.Provider value={value}>{children}</PosterLoadContext.Provider>;
}

interface PosterImageProps {
  path: string | null | undefined;
  size?: PosterSize;
  alt?: string;
  testId?: string;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * 海報 <img>：遠端海報先經 posterLoader 驗證載入成功（直連 CDN → 後端代理 → 預設海報）才把 src 交給 <img>，
 * 所以畫面上永遠不會出現破圖；載入前 <img> 沒有 src（透明，露出純黑底）。不設 crossOrigin：
 * 純顯示不需要 CORS，也就不會踩到 WebKit 用缺 CORS 標頭的快取回應去做 CORS 檢查的問題。
 */
export default function PosterImage({ path, size = DEFAULT_POSTER_SIZE, alt = '', testId, style, className }: PosterImageProps) {
  const gate = useContext(PosterLoadContext);
  const start = gate ? gate.start : true;
  const priority = gate?.active ? 'high' : 'low';
  const remote = isRemotePoster(path);
  const [loaded, setLoaded] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    if (!remote || !start || loaded) return;
    let alive = true;
    loadPoster(path, { size, priority }).then((src) => {
      if (alive) setLoaded(src);
    });
    return () => {
      alive = false;
    };
  }, [remote, start, path, size, priority, loaded]);

  const src = broken ? DEFAULT_POSTER : remote ? loaded ?? undefined : path || DEFAULT_POSTER;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      data-testid={testId}
      data-poster={path ?? ''}
      alt={alt}
      src={src}
      decoding="async"
      onError={() => {
        if (src && src !== DEFAULT_POSTER) setBroken(true);
      }}
      style={style}
      className={className}
    />
  );
}
