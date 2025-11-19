import { useEffect, useRef } from 'react';
import { useBouldersWithSectors } from './useBoulders';

/**
 * Hook to preload all boulder thumbnails in the background
 * Optimized with batch loading and priority queue
 * This should be called when the user logs in to ensure thumbnails are ready
 * when navigating to boulder pages
 */
export const usePreloadBoulderThumbnails = (enabled: boolean = true) => {
  const { data: boulders } = useBouldersWithSectors();
  const preloadedRef = useRef<Set<string>>(new Set());
  const loadingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || !boulders || boulders.length === 0) return;

    // Extract thumbnail URLs from boulders
    const thumbnailUrls = boulders
      .map(b => {
        if (!b.thumbnailUrl) return null;
        // Fix old URLs that incorrectly include /videos/ in the path
        let url = b.thumbnailUrl;
        if (url.includes('cdn.kletterwelt-sauerland.de/uploads/videos/')) {
          url = url.replace('/uploads/videos/', '/uploads/');
        }
        return url;
      })
      .filter((url): url is string => !!url);
    
    if (thumbnailUrls.length === 0) return;

    // Filter out already preloaded or currently loading thumbnails
    const thumbnailsToLoad = thumbnailUrls.filter(
      url => !preloadedRef.current.has(url) && !loadingRef.current.has(url)
    );
    
    if (thumbnailsToLoad.length === 0) {
      return; // All thumbnails already preloaded or loading
    }

    // Batch load thumbnails with concurrency limit for better performance
    const CONCURRENT_LIMIT = 5; // Load max 5 thumbnails at once
    let currentIndex = 0;

    const loadNextBatch = () => {
      const batch = thumbnailsToLoad.slice(currentIndex, currentIndex + CONCURRENT_LIMIT);
      currentIndex += CONCURRENT_LIMIT;

      batch.forEach((thumbnailUrl) => {
        loadingRef.current.add(thumbnailUrl);
        const img = new Image();
        
        // Use decode() for better performance if supported
        img.onload = () => {
          preloadedRef.current.add(thumbnailUrl);
          loadingRef.current.delete(thumbnailUrl);
        };
        
        img.onerror = () => {
          console.warn(`[PreloadBoulderThumbnails] Failed to preload thumbnail: ${thumbnailUrl}`);
          loadingRef.current.delete(thumbnailUrl);
          // Don't add to preloadedRef on error, so it can be retried
        };
        
        // Set src to start loading immediately
        img.src = thumbnailUrl;
        
        // Use decode() API if available for better performance
        if (img.decode) {
          img.decode().catch(() => {
            // decode() failed, but onload/onerror will still fire
          });
        }
      });

      // Load next batch after a short delay to avoid blocking
      if (currentIndex < thumbnailsToLoad.length) {
        setTimeout(loadNextBatch, 100);
      }
    };

    // Start loading first batch
    loadNextBatch();
  }, [boulders, enabled]);
};

