import { useEffect, useRef } from 'react';
import { useBouldersWithSectors } from './useBoulders';

/**
 * Hook to preload all boulder thumbnails in the background
 * This should be called when the user logs in to ensure thumbnails are ready
 * when navigating to boulder pages
 */
export const usePreloadBoulderThumbnails = (enabled: boolean = true) => {
  const { data: boulders } = useBouldersWithSectors();
  const preloadedRef = useRef<Set<string>>(new Set());

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

    // Filter out already preloaded thumbnails
    const thumbnailsToLoad = thumbnailUrls.filter(url => !preloadedRef.current.has(url));
    
    if (thumbnailsToLoad.length === 0) {
      console.log('[PreloadBoulderThumbnails] All thumbnails already preloaded');
      return;
    }

    console.log(`[PreloadBoulderThumbnails] Preloading ${thumbnailsToLoad.length} boulder thumbnails...`);

    // Preload all thumbnails in the background
    thumbnailsToLoad.forEach((thumbnailUrl) => {
      preloadedRef.current.add(thumbnailUrl);
      const img = new Image();
      img.onload = () => {
        console.log(`[PreloadBoulderThumbnails] Thumbnail preloaded: ${thumbnailUrl.split('/').pop()}`);
      };
      img.onerror = () => {
        console.warn(`[PreloadBoulderThumbnails] Failed to preload thumbnail: ${thumbnailUrl}`);
        preloadedRef.current.delete(thumbnailUrl); // Remove from set on error so it can be retried
      };
      // Set src to start loading immediately
      img.src = thumbnailUrl;
    });
  }, [boulders, enabled]);
};

