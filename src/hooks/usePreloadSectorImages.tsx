import { useEffect, useRef } from 'react';
import { useSectorsTransformed } from './useSectors';

/**
 * Hook to preload all sector images in the background
 * This should be called when the user logs in to ensure images are ready
 * when navigating to the sectors page
 */
export const usePreloadSectorImages = (enabled: boolean = true) => {
  const { data: sectors } = useSectorsTransformed();
  const preloadedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || !sectors || sectors.length === 0) return;

    // Extract image URLs
    const imageUrls = sectors
      .map(s => s.imageUrl)
      .filter((url): url is string => !!url);
    
    if (imageUrls.length === 0) return;

    // Filter out already preloaded images
    const imagesToLoad = imageUrls.filter(url => !preloadedRef.current.has(url));
    
    if (imagesToLoad.length === 0) {
      console.log('[PreloadSectorImages] All images already preloaded');
      return;
    }

    console.log(`[PreloadSectorImages] Preloading ${imagesToLoad.length} sector images...`);

    // Preload all images in the background with high priority
    // Use Promise.all to ensure all images start loading immediately
    imagesToLoad.forEach((imageUrl) => {
      preloadedRef.current.add(imageUrl);
      const img = new Image();
      
      // Set up handlers before setting src
      img.onload = () => {
        console.log(`[PreloadSectorImages] Image preloaded: ${imageUrl.split('/').pop()}`);
      };
      img.onerror = () => {
        console.warn(`[PreloadSectorImages] Failed to preload image: ${imageUrl}`);
        preloadedRef.current.delete(imageUrl); // Remove from set on error so it can be retried
      };
      
      // Set src to start loading immediately
      // If image is already cached, onload fires synchronously
      img.src = imageUrl;
      
      // Force browser to load image with high priority
      if (img.decode) {
        img.decode().catch(() => {
          // Ignore decode errors
        });
      }
    });
  }, [sectors, enabled]);
};

