export type VideoQualityLevel = 'hd' | 'sd' | 'low';

export type VideoQualitySources = Partial<Record<VideoQualityLevel, string>>;

export const VIDEO_STALL_FALLBACK_MS = 5000;
export const HAVE_CURRENT_DATA = 2;
export const HAVE_FUTURE_DATA = 3;

const LOWER_QUALITY: Record<VideoQualityLevel, VideoQualityLevel[]> = {
  hd: ['sd', 'low'],
  sd: ['low'],
  low: [],
};

export const getNextLowerVideoQuality = (
  currentQuality: VideoQualityLevel,
  sources?: VideoQualitySources | null,
): VideoQualityLevel | null => {
  if (!sources) return null;

  return LOWER_QUALITY[currentQuality].find((quality) => Boolean(sources[quality])) ?? null;
};

export const isNearVideoEnd = (duration: number, currentTime: number): boolean => {
  if (!Number.isFinite(duration) || duration <= 0) return false;

  const timeRemaining = Math.max(0, duration - currentTime);
  const percentRemaining = (timeRemaining / duration) * 100;
  return timeRemaining <= 5 || percentRemaining <= 10;
};

interface StallState {
  hasStartedPlaying: boolean;
  ended: boolean;
  paused: boolean;
  readyState: number;
  duration: number;
  currentTime: number;
}

export const shouldFallbackAfterStall = ({
  hasStartedPlaying,
  ended,
  paused,
  readyState,
  duration,
  currentTime,
}: StallState): boolean => (
  hasStartedPlaying
  && !ended
  && !paused
  && readyState < HAVE_FUTURE_DATA
  && !isNearVideoEnd(duration, currentTime)
);
