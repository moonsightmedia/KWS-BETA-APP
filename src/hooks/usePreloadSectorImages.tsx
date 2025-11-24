import { useEffect, useRef } from 'react';
import { useSectorsTransformed } from './useSectors';

// Global cache to prevent preloading the same image across component instances
const globalPreloadedImages = new Set<string>();
const globalLoadingImages = new Set<string>();
const globalFailedImages = new Set<string>();

/**
 * Hook to preload all sector images in the background
 * This should be called when the user logs in to ensure images are ready
 * when navigating to the sectors page
 */
export const usePreloadSectorImages = (enabled: boolean = true) => {
  const { data: sectors } = useSectorsTransformed();
  const retryCountRef = useRef<Map<string, number>>(new Map());
  const MAX_RETRIES = 2; // Reduced from 3 to avoid excessive retries
  const RETRY_DELAY = 2000; // Increased delay to 2 seconds

  const loadImage = (imageUrl: string): void => {
    const imageName = imageUrl.split('/').pop() || 'unknown';
    
    // Skip if already preloaded globally
    if (globalPreloadedImages.has(imageUrl)) {
      console.log(`[PreloadSectorImages] ⏭️ Skipping ${imageName} - already preloaded`);
      return;
    }

    // Skip if currently loading
    if (globalLoadingImages.has(imageUrl)) {
      console.log(`[PreloadSectorImages] ⏭️ Skipping ${imageName} - currently loading`);
      return;
    }

    // Skip if failed too many times
    if (globalFailedImages.has(imageUrl)) {
      console.log(`[PreloadSectorImages] ⏭️ Skipping ${imageName} - previously failed`);
      return;
    }

    const currentRetryCount = retryCountRef.current.get(imageUrl) || 0;
    
    // Don't retry if we've exceeded max retries
    if (currentRetryCount >= MAX_RETRIES) {
      globalFailedImages.add(imageUrl);
      console.error(`[PreloadSectorImages] ❌ Max retries reached for: ${imageName}`);
      return;
    }

    // Mark as loading
    globalLoadingImages.add(imageUrl);
    console.log(`[PreloadSectorImages] 🖼️ Preloading image: ${imageName} (attempt ${currentRetryCount + 1}/${MAX_RETRIES})`);

    const img = new Image();
    const startTime = performance.now();
    
    // Set up handlers before setting src
    img.onload = () => {
      const loadTime = Math.round(performance.now() - startTime);
      globalPreloadedImages.add(imageUrl);
      globalLoadingImages.delete(imageUrl);
      retryCountRef.current.delete(imageUrl);
      console.log(`[PreloadSectorImages] ✅ Image preloaded: ${imageName} (${loadTime}ms, ${img.naturalWidth}x${img.naturalHeight}px, cached: ${img.complete})`);
    };
    
    img.onerror = () => {
      const loadTime = Math.round(performance.now() - startTime);
      globalLoadingImages.delete(imageUrl);
      retryCountRef.current.set(imageUrl, currentRetryCount + 1);
      
      console.error(`[PreloadSectorImages] ❌ Failed to preload: ${imageName} (after ${loadTime}ms, attempt ${currentRetryCount + 1}/${MAX_RETRIES})`);
      
      // Retry with exponential backoff
      if (currentRetryCount < MAX_RETRIES - 1) {
        const delay = RETRY_DELAY * Math.pow(2, currentRetryCount);
        console.warn(`[PreloadSectorImages] 🔄 Retrying ${imageName} in ${delay}ms (attempt ${currentRetryCount + 2}/${MAX_RETRIES})`);
        setTimeout(() => {
          loadImage(imageUrl);
        }, delay);
      } else {
        // Max retries reached
        globalFailedImages.add(imageUrl);
        console.error(`[PreloadSectorImages] ❌ Max retries reached for: ${imageName}, giving up`);
      }
    };
    
    // Set src to start loading immediately
    img.src = imageUrl;
    console.log(`[PreloadSectorImages] 📥 Image src set: ${imageName}, complete: ${img.complete}, naturalWidth: ${img.naturalWidth}`);
    
    // Force browser to load image with high priority
    if (img.decode) {
      img.decode().catch((error) => {
        console.warn(`[PreloadSectorImages] ⚠️ Decode error for ${imageName}:`, error);
      });
    }
  };

  useEffect(() => {
    if (!enabled || !sectors || sectors.length === 0) {
      console.log('[PreloadSectorImages] ⏸️ Preloading disabled or no sectors');
      return;
    }

    // Extract image URLs
    const imageUrls = sectors
      .map(s => s.imageUrl)
      .filter((url): url is string => !!url);
    
    console.log('[PreloadSectorImages] 📊 Sector image analysis:', {
      totalSectors: sectors.length,
      sectorsWithImages: imageUrls.length,
      imageUrls: imageUrls.map(url => url.split('/').pop()),
      alreadyPreloaded: imageUrls.filter(url => globalPreloadedImages.has(url)).length,
      currentlyLoading: imageUrls.filter(url => globalLoadingImages.has(url)).length,
      previouslyFailed: imageUrls.filter(url => globalFailedImages.has(url)).length
    });
    
    if (imageUrls.length === 0) {
      console.log('[PreloadSectorImages] ⚠️ No image URLs found in sectors');
      return;
    }

    // Filter out already preloaded, loading, or failed images
    const imagesToLoad = imageUrls.filter(url => 
      !globalPreloadedImages.has(url) && 
      !globalLoadingImages.has(url) && 
      !globalFailedImages.has(url)
    );
    
    console.log('[PreloadSectorImages] 📋 Preload status:', {
      totalImages: imageUrls.length,
      alreadyPreloaded: imageUrls.length - imagesToLoad.length,
      needsPreloading: imagesToLoad.length,
      imagesToLoad: imagesToLoad.map(url => url.split('/').pop())
    });
    
    if (imagesToLoad.length === 0) {
      console.log('[PreloadSectorImages] ✅ All images already preloaded or in progress');
      return;
    }

    console.log(`[PreloadSectorImages] 🚀 Starting to preload ${imagesToLoad.length} sector images...`);

    // Preload all images in the background with high priority
    // Use staggered loading to avoid overwhelming the browser
    imagesToLoad.forEach((imageUrl, index) => {
      // Stagger loading slightly to avoid overwhelming the browser
      const delay = index < 5 ? 0 : (index - 5) * 100; // First 5 immediate, rest with 100ms delay
      setTimeout(() => {
        loadImage(imageUrl);
      }, delay);
    });
  }, [sectors, enabled]);
};

