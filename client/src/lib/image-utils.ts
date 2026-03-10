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

    // 1. Process specific CDNs for Resizing
    let processedUrl = url;

    // --- TMDB (The Movie Database) ---
    // Example: https://image.tmdb.org/t/p/w600_and_h900_bestv2/xyz.jpg -> /w342/xyz.jpg
    if (processedUrl.includes('image.tmdb.org/t/p/')) {
        const targetSize = isMonthly ? 'w185' : 'w342';

        // Regex to match any TMDB size path like /w500/, /original/, /w600_and_h900_bestv2/
        processedUrl = processedUrl.replace(/\/t\/p\/[^\/]+\//, `/t/p/${targetSize}/`);
    }

    // --- Google Books ---
    // Ensure we are using https for secure context canvas rendering
    if (processedUrl.includes('books.google.com/books/content')) {
        processedUrl = processedUrl.replace(/^http:/, 'https:');

        // If it doesn't have a zoom parameter, add zoom=1
        if (!processedUrl.includes('zoom=')) {
            processedUrl += (processedUrl.includes('?') ? '&' : '?') + 'zoom=1';
        }
    }

    // 2. Cache Busting (Opaque Cache Defense)
    // CRITICAL: We strictly add random cache-busters to ALL external URLs.
    // This prevents Safari from serving a previously cached Opaque response
    // when html-to-image makes a crossOrigin="anonymous" request.
    const isLocal = processedUrl.startsWith('/') || processedUrl.startsWith('data:') || processedUrl.startsWith('blob:');

    if (!isLocal) {
        // Append cache-buster timestamp and salt
        const salt = Math.random().toString(36).substring(2, 7);
        const timestamp = new Date().getTime();
        const sep = processedUrl.includes('?') ? '&' : '?';

        processedUrl = `${processedUrl}${sep}_t=${timestamp}&salt=${salt}`;
    }

    return processedUrl;
}
