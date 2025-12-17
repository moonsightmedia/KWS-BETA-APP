import { VideoQualities } from '@/types/boulder';

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
  preferredQuality: 'hd' | 'sd' | 'low' = 'hd'
): string | undefined {
  // Use new structure if available
  if (betaVideoUrls) {
    // Try preferred quality first
    if (betaVideoUrls[preferredQuality]) {
      return betaVideoUrls[preferredQuality];
    }
    
    // Fallback to best available quality (hd > sd > low)
    if (betaVideoUrls.hd) {
      return betaVideoUrls.hd;
    }
    if (betaVideoUrls.sd) {
      return betaVideoUrls.sd;
    }
    if (betaVideoUrls.low) {
      return betaVideoUrls.low;
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
  
  // Legacy: map single URL to hd
  if (betaVideoUrl) {
    return { hd: betaVideoUrl };
  }
  
  return {};
}

