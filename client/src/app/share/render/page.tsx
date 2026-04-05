'use client';

import { useEffect, useState } from 'react';
import MemoryCardTemplate from '@/components/share/MemoryCardTemplate';
import MonthlyRecapTemplate from '@/components/share/MonthlyRecapTemplate';

// TypeScript 型別宣告
declare global {
  interface Window {
    __RENDER_DATA__: RenderPayload;
    __RENDER_READY__: boolean;
  }
}

export interface RenderSettings {
  selectedTemplate?: string;
  aspectRatio?: '9:16' | '4:5' | '1:1';
  showTitle?: boolean;
  showRating?: boolean;
  showReflection?: boolean;
  customLogoPath?: string | null;
  customDeskBg?: string | null;
}

export interface RenderPayload {
  template: 'memory-card' | 'monthly-recap';
  item: {
    // MemoryCard 欄位
    title?: string;
    year?: string | number;
    posterPath?: string;
    rating?: number;
    reflection?: string;
    type?: string;
    page_count?: number;
    // MonthlyRecap 欄位
    monthName?: string;
    monthValue?: string;
    statsData?: {
      summary: { movie: number; book: number; tv: number };
      items: unknown[];
    };
  };
  settings: RenderSettings;
}

export default function ShareRenderPage() {
  const [renderData, setRenderData] = useState<RenderPayload | null>(null);

  useEffect(() => {
    // Poll window.__RENDER_DATA__ 每 100ms，最多等 10s
    let attempts = 0;
    const maxAttempts = 100; // 10s

    const poll = setInterval(() => {
      attempts++;
      const data = (window as Window).__RENDER_DATA__;

      if (data) {
        clearInterval(poll);
        setRenderData(data);

        // 等字型載入完成後設置 ready signal（含 CJK 子集）
        document.fonts.ready.then(async () => {
          // 取出 CSS 變數中的實際字型名稱（例如 "__Noto_Sans_TC_4cf4f1"）
          const notoFamily = getComputedStyle(document.body)
            .getPropertyValue('--font-noto-tc')
            .split(',')[0]
            .trim();
          if (notoFamily) {
            // 強制載入中文字元對應的 woff2 子集，避免 display:swap 在截圖時仍是 fallback
            await Promise.all([
              document.fonts.load(`400 16px ${notoFamily}`, '中文字型'),
              document.fonts.load(`500 16px ${notoFamily}`, '中文字型'),
              document.fonts.load(`700 16px ${notoFamily}`, '中文字型'),
            ]).catch(() => {});
          }
          (window as Window).__RENDER_READY__ = true;
        });
        return;
      }

      if (attempts >= maxAttempts) {
        clearInterval(poll);
        console.error('[ShareRender] 等待 __RENDER_DATA__ 逾時（10s）');
      }
    }, 100);

    return () => clearInterval(poll);
  }, []);

  if (!renderData) {
    // 等待資料注入，顯示空白（Puppeteer 不需要 loading UI）
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          backgroundColor: '#0d0d0d',
        }}
      />
    );
  }

  const { template, item, settings } = renderData;
  const aspectRatio = settings.aspectRatio ?? '9:16';

  if (template === 'monthly-recap') {
    return (
      <div data-screenshot style={{ display: 'inline-block' }}>
        <MonthlyRecapTemplate
          monthName={item.monthName ?? ''}
          monthValue={item.monthValue ?? ''}
          statsData={item.statsData ?? { summary: { movie: 0, book: 0, tv: 0 }, items: [] }}
          aspectRatio={aspectRatio}
          selectedTemplate={
            (settings.selectedTemplate as 'calendar' | 'collage' | 'waterfall' | 'shelf') ??
            'calendar'
          }
          customLogoPath={settings.customLogoPath}
        />
      </div>
    );
  }

  // 預設：memory-card
  return (
    <div data-screenshot style={{ display: 'inline-block' }}>
      <MemoryCardTemplate
        title={item.title ?? ''}
        year={item.year}
        posterPath={item.posterPath ?? '/image/defaultMoviePoster.svg'}
        rating={item.rating ?? 0}
        reflection={item.reflection}
        type={item.type ?? 'movie'}
        page_count={item.page_count}
        aspectRatio={aspectRatio}
        selectedTemplate={
          (settings.selectedTemplate as 'default' | 'pure' | 'ticket' | '3d' | 'tv' | 'desk') ??
          'default'
        }
        showTitle={settings.showTitle ?? true}
        showRating={settings.showRating ?? true}
        showReflection={settings.showReflection ?? true}
        customLogoPath={settings.customLogoPath}
        customDeskBg={settings.customDeskBg}
      />
    </div>
  );
}
