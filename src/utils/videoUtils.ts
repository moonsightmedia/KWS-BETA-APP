import { VideoQualities } from '@/types/boulder';

export type VideoQualityLevel = 'hd' | 'sd' | 'low';

const QUALITY_ORDER: VideoQualityLevel[] = ['hd', 'sd', 'low'];

/**
 * Get the best available video URL based on quality preferences
 * @param betaVideoUrls - Object containing video URLs for different quality levels
 * @param betaVideoUrl - Legacy single video URL (fallback)
 * @param preferredQuality - Preferred quality level ('hd', 'sd', 'low')
 * @returns The best available video URL, or undefined if none available
 */
export function getVideoUrl(
  betaVideoUrls?: VideoQualities | null,
  betaVideoUrl?: string | null,
  preferredQuality: VideoQualityLevel = 'sd',
): string | undefined {
  // Use new structure if available
  if (betaVideoUrls) {
    // Try preferred quality first
    if (betaVideoUrls[preferredQuality]) {
      return betaVideoUrls[preferredQuality];
    }
    
    // Fallback to best available quality (hd > sd > low)
    for (const quality of QUALITY_ORDER) {
      if (betaVideoUrls[quality]) {
        return betaVideoUrls[quality];
      }
    }
  }
  
  // Legacy fallback: use single beta_video_url
  return betaVideoUrl || undefined;
}

/**
 * Get all available video quality URLs
 * @param betaVideoUrls - Object containing video URLs for different quality levels
 * @param betaVideoUrl - Legacy single video URL (fallback)
 * @returns Object with all available quality URLs
 */
export function getAllVideoUrls(
  betaVideoUrls?: VideoQualities | null,
  betaVideoUrl?: string | null
): VideoQualities {
  if (betaVideoUrls) {
    return betaVideoUrls;
  }
  
  // Legacy: map single URL to sd (typical phone upload quality)
  if (betaVideoUrl) {
    return { sd: betaVideoUrl };
  }
  
  return {};
}

export function getAvailableVideoQualities(
  betaVideoUrls?: VideoQualities | null,
  betaVideoUrl?: string | null,
): VideoQualityLevel[] {
  const urls = getAllVideoUrls(betaVideoUrls, betaVideoUrl);
  return QUALITY_ORDER.filter((quality) => Boolean(urls[quality]));
}

export function hasMultipleVideoQualities(
  betaVideoUrls?: VideoQualities | null,
  betaVideoUrl?: string | null,
): boolean {
  return getAvailableVideoQualities(betaVideoUrls, betaVideoUrl).length > 1;
}

export function getPreferredVideoQuality(
  betaVideoUrls?: VideoQualities | null,
  betaVideoUrl?: string | null,
  preferredQuality: VideoQualityLevel = 'sd',
): VideoQualityLevel {
  const available = getAvailableVideoQualities(betaVideoUrls, betaVideoUrl);
  if (available.length === 0) {
    return preferredQuality;
  }

  if (available.includes(preferredQuality)) {
    return preferredQuality;
  }

  for (const quality of ['sd', 'hd', 'low'] as const) {
    if (available.includes(quality)) {
      return quality;
    }
  }

  return available[0];
}

