/**
 * lib/image-utils.ts
 *
 * Client-side utilities for processing image URLs before feeding them into html-to-image.
 * These functions replace the broken /_next/image proxy in the Static Export environment,
 * while preventing OOM (Out-Of-Memory) and Canvas Tainting issues on iOS Safari.
 */

/**
 * Optimizes an image URL for the Share Canvas by applying resizing and cache busting.
 * 
 * @param url The original image URL (e.g., TMDB poster, Google Books cover, or local static)
 * @param isMonthly Set to true if generating a Monthly Recap with many images (forces smaller sizes)
 * @returns The optimized URL with crossOrigin cache-busting logic.
 */
export function getOptimizedShareImageUrl(url: string, isMonthly: boolean = false): string {
    if (!url) return '';

    // 1. Process specific CDNs for Resizing & Proxying
    let processedUrl = url;

    // --- TMDB (The Movie Database) ---
    if (processedUrl.includes('image.tmdb.org/t/p/')) {
        const targetSize = isMonthly ? 'w185' : 'w342';
        processedUrl = processedUrl.replace(/\/t\/p\/[^\/]+\//, `/t/p/${targetSize}/`);
    }

    // --- Google Books ---
    if (processedUrl.includes('books.google.com/books/content')) {
        processedUrl = processedUrl.replace(/^http:/, 'https:');
        if (!processedUrl.includes('zoom=')) {
            processedUrl += (processedUrl.includes('?') ? '&' : '?') + 'zoom=1';
        }
    }

    // 2. Route EVERYTHING external through our Backend Proxy to avoid Canvas Taint
    const isLocal = processedUrl.startsWith('/');
    const isDataUrl = processedUrl.startsWith('data:') || processedUrl.startsWith('blob:');

    if (!isLocal && !isDataUrl) {
        // We use the backend proxy endpoint defined in FastAPI
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8010';
        processedUrl = `${backendUrl}/api/v1/proxy/image?url=${encodeURIComponent(processedUrl)}`;
        
        // （Puppeteer 路徑不需要 cache-busting，已移除 _t timestamp 與 salt）
    }

    return processedUrl;
}
