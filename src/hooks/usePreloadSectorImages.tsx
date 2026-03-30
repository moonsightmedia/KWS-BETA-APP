import { useEffect, useRef } from 'react';
import { useSectorsTransformed } from './useSectors';

const globalPreloadedImages = new Set<string>();
const globalLoadingImages = new Set<string>();
const globalFailedImages = new Set<string>();

export const usePreloadSectorImages = (enabled: boolean = true) => {
  const { data: sectors } = useSectorsTransformed();
  const retryCountRef = useRef<Map<string, number>>(new Map());
  const maxRetries = 2;
  const retryDelayMs = 2000;

  const loadImage = (imageUrl: string): void => {
    if (globalPreloadedImages.has(imageUrl) || globalLoadingImages.has(imageUrl) || globalFailedImages.has(imageUrl)) {
      return;
    }

    const currentRetryCount = retryCountRef.current.get(imageUrl) ?? 0;
    if (currentRetryCount >= maxRetries) {
      globalFailedImages.add(imageUrl);
      return;
    }

    globalLoadingImages.add(imageUrl);

    const img = new Image();
    img.onload = () => {
      globalPreloadedImages.add(imageUrl);
      globalLoadingImages.delete(imageUrl);
      retryCountRef.current.delete(imageUrl);
    };

    img.onerror = () => {
      globalLoadingImages.delete(imageUrl);
      retryCountRef.current.set(imageUrl, currentRetryCount + 1);

      if (currentRetryCount < maxRetries - 1) {
        const delay = retryDelayMs * Math.pow(2, currentRetryCount);
        window.setTimeout(() => loadImage(imageUrl), delay);
        return;
      }

      globalFailedImages.add(imageUrl);
    };

    img.src = imageUrl;

    if (img.decode) {
      img.decode().catch(() => {
        // Ignore decode errors; the load/error handlers already handle state.
      });
    }
  };

  useEffect(() => {
    if (!enabled || !sectors?.length) {
      return;
    }

    const imageUrls = sectors
      .map((sector) => sector.imageUrl)
      .filter((url): url is string => Boolean(url));

    if (!imageUrls.length) {
      return;
    }

    const imagesToLoad = imageUrls.filter(
      (url) =>
        !globalPreloadedImages.has(url) &&
        !globalLoadingImages.has(url) &&
        !globalFailedImages.has(url)
    );

    if (!imagesToLoad.length) {
      return;
    }

    imagesToLoad.forEach((imageUrl, index) => {
      const delay = index < 5 ? 0 : (index - 5) * 100;
      window.setTimeout(() => loadImage(imageUrl), delay);
    });
  }, [enabled, sectors]);
};
