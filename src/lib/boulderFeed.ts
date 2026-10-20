import type { Boulder } from '@/types/boulder';
import { getVideoUrl } from '@/utils/videoUtils';

export const feedResultNames = { attempted: 'Versucht', top: 'Top', flash: 'Flash' };
export const hasBoulderVideo = (boulder: Boulder) => Boolean(getVideoUrl(boulder.betaVideoUrls, boulder.betaVideoUrl));
export const isExternalBoulderVideo = (boulder: Boulder) => {
  try {
    const host = new URL(getVideoUrl(boulder.betaVideoUrls, boulder.betaVideoUrl) ?? '', 'https://local.invalid').hostname.toLowerCase();
    return host === 'youtu.be' || ['youtube.com', 'vimeo.com'].some(provider => host === provider || host.endsWith(`.${provider}`));
  } catch { return false; }
};
