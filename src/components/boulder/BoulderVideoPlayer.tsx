import { useCallback, useEffect, useRef, useState } from 'react';
import { BadgeCheck, Check, ChevronDown, ExternalLink, Loader2, Maximize2, Minimize2, Settings, Video } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  getNextLowerVideoQuality,
  HAVE_CURRENT_DATA,
  HAVE_FUTURE_DATA,
  isNearVideoEnd,
  shouldFallbackAfterStall,
  VIDEO_STALL_FALLBACK_MS,
  type VideoQualityLevel,
} from '@/lib/videoPlayback';
import { VideoQualities } from '@/types/boulder';
import { detectNetworkSpeed, getOptimalVideoQualityWithDataSaver } from '@/utils/networkUtils';
import {
  getAvailableVideoQualities,
  getPreferredVideoQuality,
  getVideoUrl,
  hasMultipleVideoQualities,
} from '@/utils/videoUtils';

export const isYouTubeUrl = (url: string): boolean => /youtube\.com|youtu\.be/.test(url);
export const isVimeoUrl = (url: string): boolean => /vimeo\.com/.test(url);

const videoQualityLabels = {
  hd: { short: 'HD', detail: '1920p' },
  sd: { short: 'SD', detail: '1280p' },
  low: { short: 'Low', detail: '640p' },
} as const;

export const getYouTubeEmbedUrl = (url: string): string => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  const videoId = match && match[2].length === 11 ? match[2] : null;
  return videoId ? `https://www.youtube.com/embed/${videoId}?mute=1&autoplay=1` : url;
};

export const getVimeoEmbedUrl = (url: string): string => {
  const regExp = /vimeo\.com\/(\d+)/;
  const match = url.match(regExp);
  const videoId = match ? match[1] : null;
  return videoId ? `https://player.vimeo.com/video/${videoId}?muted=1&autoplay=1` : url;
};

type BoulderVideoPlayerProps = {
  betaVideoUrls?: VideoQualities;
  betaVideoUrl?: string;
  poster?: string;
  isVisible?: boolean;
  showOfficialBadge?: boolean;
  className?: string;
};

type FullscreenVideoElement = HTMLDivElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  mozRequestFullScreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
};

type FullscreenVideoDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void;
  mozCancelFullScreen?: () => Promise<void> | void;
  msExitFullscreen?: () => Promise<void> | void;
};

export function BoulderVideoPlayer({
  betaVideoUrls,
  betaVideoUrl,
  poster,
  isVisible = true,
  showOfficialBadge = false,
  className,
}: BoulderVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentQuality, setCurrentQuality] = useState<VideoQualityLevel>('sd');
  const [hasError, setHasError] = useState(false);
  const [sourceRevision, setSourceRevision] = useState(0);
  const showQualitySelector = hasMultipleVideoQualities(betaVideoUrls, betaVideoUrl);
  const bufferingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasStartedPlayingRef = useRef(false);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playbackStateRef = useRef<{ time: number; wasPlaying: boolean } | null>(null);

  const clearBufferingTimeout = useCallback(() => {
    if (!bufferingTimeoutRef.current) return;
    clearTimeout(bufferingTimeoutRef.current);
    bufferingTimeoutRef.current = null;
  }, []);

  const clearLoadTimeout = useCallback(() => {
    if (!loadTimeoutRef.current) return;
    clearTimeout(loadTimeoutRef.current);
    loadTimeoutRef.current = null;
  }, []);

  const rememberPlaybackState = useCallback(() => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.currentTime)) return;

    playbackStateRef.current = {
      time: video.currentTime,
      wasPlaying: !video.paused && !video.ended,
    };
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const availableQualities = getAvailableVideoQualities(betaVideoUrls, betaVideoUrl);
    if (availableQualities.length <= 1) {
      setCurrentQuality(availableQualities[0] ?? 'sd');
      return;
    }

    const networkSpeed = detectNetworkSpeed();
    const optimalQuality = getOptimalVideoQualityWithDataSaver(networkSpeed);
    setCurrentQuality(getPreferredVideoQuality(betaVideoUrls, betaVideoUrl, optimalQuality));
    console.log('[VideoPlayer] Network speed:', networkSpeed, 'Selected quality:', optimalQuality);
  }, [isVisible, betaVideoUrls, betaVideoUrl]);

  const currentVideoUrl = getVideoUrl(betaVideoUrls, betaVideoUrl, currentQuality);

  const handleQualityFallback = useCallback((reason: 'initial-load' | 'stall' | 'error') => {
    const nextQuality = getNextLowerVideoQuality(currentQuality, betaVideoUrls);
    if (!nextQuality) return false;

    rememberPlaybackState();
    if (!hasStartedPlayingRef.current && playbackStateRef.current) {
      playbackStateRef.current.wasPlaying = true;
    }
    clearBufferingTimeout();
    clearLoadTimeout();
    console.warn(`[VideoPlayer] ${reason}: switching from ${currentQuality} to ${nextQuality}`);
    setHasError(false);
    setIsBuffering(true);
    setCurrentQuality(nextQuality);
    return true;
  }, [betaVideoUrls, clearBufferingTimeout, clearLoadTimeout, currentQuality, rememberPlaybackState]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const enforceMuted = () => {
      if (!video.muted || video.volume > 0) {
        video.muted = true;
        video.volume = 0;
      }
    };

    enforceMuted();
    video.addEventListener('volumechange', enforceMuted);
    return () => video.removeEventListener('volumechange', enforceMuted);
  }, [currentVideoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVisible) return;

    const videoUrl = getVideoUrl(betaVideoUrls, betaVideoUrl, currentQuality);
    if (!videoUrl) {
      console.error('[VideoPlayer] No video URL available');
      setHasError(true);
      return;
    }

    const savedPlaybackState = playbackStateRef.current;
    video.src = videoUrl;
    video.preload = 'auto';
    clearLoadTimeout();

    loadTimeoutRef.current = setTimeout(() => {
      loadTimeoutRef.current = null;
      if (video.readyState < HAVE_CURRENT_DATA) {
        const didFallback = handleQualityFallback('initial-load');
        if (!didFallback && video.readyState === 0) {
          setIsBuffering(false);
          setHasError(true);
        }
      }
    }, 10000);

    video.load();

    const handleLoadedMetadata = () => {
      if (savedPlaybackState) {
        const latestPossibleTime = Number.isFinite(video.duration)
          ? Math.max(0, video.duration - 0.1)
          : savedPlaybackState.time;
        video.currentTime = Math.min(savedPlaybackState.time, latestPossibleTime);
        playbackStateRef.current = null;
      }
      setHasError(false);
    };

    const handleCanPlay = () => {
      clearLoadTimeout();
      setIsBuffering(false);

      const shouldPlay = savedPlaybackState?.wasPlaying ?? !hasStartedPlayingRef.current;
      if (shouldPlay) {
        video.play().catch((error) => {
          console.log('[VideoPlayer] Auto-play blocked or failed:', error);
        });
      }
    };

    video.addEventListener('canplay', handleCanPlay, { once: true });
    video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });

    if (video.readyState >= HAVE_FUTURE_DATA) {
      handleCanPlay();
    }

    if (video.readyState >= 1) {
      handleLoadedMetadata();
    }

    return () => {
      if (!playbackStateRef.current && Number.isFinite(video.currentTime) && video.currentTime > 0) {
        playbackStateRef.current = {
          time: video.currentTime,
          wasPlaying: !video.paused && !video.ended,
        };
      }
      clearBufferingTimeout();
      clearLoadTimeout();
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.pause();
    };
  }, [
    betaVideoUrl,
    betaVideoUrls,
    clearBufferingTimeout,
    clearLoadTimeout,
    currentQuality,
    handleQualityFallback,
    isVisible,
    sourceRevision,
  ]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const clearBufferingState = () => {
      clearBufferingTimeout();
      setIsBuffering(false);
    };

    const scheduleQualityFallback = () => {
      if (bufferingTimeoutRef.current) return;

      bufferingTimeoutRef.current = setTimeout(() => {
        bufferingTimeoutRef.current = null;
        if (shouldFallbackAfterStall({
          hasStartedPlaying: hasStartedPlayingRef.current,
          ended: video.ended,
          paused: video.paused,
          readyState: video.readyState,
          duration: video.duration,
          currentTime: video.currentTime,
        })) {
          handleQualityFallback('stall');
        }
      }, VIDEO_STALL_FALLBACK_MS);
    };

    const handleWaiting = () => {
      if (video.ended || isNearVideoEnd(video.duration, video.currentTime)) {
        clearBufferingState();
        return;
      }

      setIsBuffering(true);
      scheduleQualityFallback();
    };

    const handlePlay = () => {
      hasStartedPlayingRef.current = true;
      if (video.readyState < HAVE_FUTURE_DATA && !isNearVideoEnd(video.duration, video.currentTime)) {
        setIsBuffering(true);
        scheduleQualityFallback();
      }
    };

    const handlePause = () => {
      if (!video.ended) clearBufferingState();
    };

    const handleCanPlay = () => {
      if (video.readyState >= HAVE_FUTURE_DATA) clearBufferingState();
    };

    const handleEnded = () => {
      clearBufferingState();
      hasStartedPlayingRef.current = false;
    };

    const handleError = () => {
      const error = video.error;
      if (!error) return;

      console.error('[VideoPlayer] Video error:', {
        code: error.code,
        message: error.message,
        quality: currentQuality,
      });

      clearBufferingState();
      if (
        (error.code === MediaError.MEDIA_ERR_NETWORK || error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED)
        && handleQualityFallback('error')
      ) {
        return;
      }

      setHasError(true);
    };

    const handleLoadedMetadata = () => {
      setHasError(false);
    };

    const handleStalled = () => {
      if (shouldFallbackAfterStall({
        hasStartedPlaying: hasStartedPlayingRef.current,
        ended: video.ended,
        paused: video.paused,
        readyState: video.readyState,
        duration: video.duration,
        currentTime: video.currentTime,
      })) {
        setIsBuffering(true);
        scheduleQualityFallback();
      }
    };

    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('play', handlePlay);
    video.addEventListener('playing', handleCanPlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('canplaythrough', handleCanPlay);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('stalled', handleStalled);

    return () => {
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('playing', handleCanPlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('canplaythrough', handleCanPlay);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('stalled', handleStalled);
      clearBufferingTimeout();
    };
  }, [clearBufferingTimeout, currentQuality, handleQualityFallback]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    const container = containerRef.current as FullscreenVideoElement | null;
    if (!container) return;
    const fullscreenDocument = document as FullscreenVideoDocument;

    try {
      if (!fullscreenDocument.fullscreenElement) {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
          await container.webkitRequestFullscreen();
        } else if (container.mozRequestFullScreen) {
          await container.mozRequestFullScreen();
        } else if (container.msRequestFullscreen) {
          await container.msRequestFullscreen();
        }
      } else if (fullscreenDocument.exitFullscreen) {
        await fullscreenDocument.exitFullscreen();
      } else if (fullscreenDocument.webkitExitFullscreen) {
        await fullscreenDocument.webkitExitFullscreen();
      } else if (fullscreenDocument.mozCancelFullScreen) {
        await fullscreenDocument.mozCancelFullScreen();
      } else if (fullscreenDocument.msExitFullscreen) {
        await fullscreenDocument.msExitFullscreen();
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  };

  if (hasError || !currentVideoUrl) {
    const fallbackUrl = getVideoUrl(betaVideoUrls, betaVideoUrl, 'low') || betaVideoUrl;
    return (
      <div className={cn('relative flex h-full w-full items-center justify-center rounded-kws-card bg-[#192436]', className)}>
        <div className="space-y-4 p-4 text-center">
          <Video className="mx-auto h-12 w-12 text-white/60" />
          <div>
            <p className="mb-2 text-sm text-white">Video konnte nicht geladen werden</p>
            {fallbackUrl && (
              <Button
                onClick={() => {
                  const retryQuality = getPreferredVideoQuality(betaVideoUrls, betaVideoUrl, 'low');
                  playbackStateRef.current = null;
                  hasStartedPlayingRef.current = false;
                  setHasError(false);
                  setIsBuffering(true);
                  setCurrentQuality(retryQuality);
                  setSourceRevision((revision) => revision + 1);
                }}
                variant="outline"
                size="sm"
                className="border-white/20 bg-white/10 text-white hover:bg-white/20"
              >
                Erneut versuchen
              </Button>
            )}
            {fallbackUrl && (
              <Button
                onClick={() => window.open(fallbackUrl, '_blank')}
                variant="outline"
                size="sm"
                className="ml-2 border-white/20 bg-white/10 text-white hover:bg-white/20"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Direkt öffnen
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn('relative h-full w-full bg-[#192436]', className)}>
      <style>{`
        video::-webkit-media-controls-start-playback-button {
          display: none !important;
          opacity: 0 !important;
        }
        video::-webkit-media-controls-volume-slider { display: none !important; }
        video::-webkit-media-controls-mute-button { display: none !important; }
      `}</style>

      <video
        ref={videoRef}
        autoPlay
        controls
        muted
        playsInline
        controlsList="nodownload"
        className={cn('h-full w-full object-center', isFullscreen ? 'object-contain' : 'object-cover')}
        poster={poster || undefined}
        preload="auto"
      >
        {currentVideoUrl.toLowerCase().endsWith('.mp4') ? (
          <>
            <source src={currentVideoUrl} type="video/mp4" />
            <source src={currentVideoUrl} type="video/webm" />
          </>
        ) : (
          <>
            <source src={currentVideoUrl} type="video/webm" />
            <source src={currentVideoUrl} type="video/mp4" />
          </>
        )}
        Dein Browser unterstuetzt keine Videos.
      </video>

      {showOfficialBadge ? (
        <div className="absolute left-2.5 top-2.5 z-30 flex h-8 items-center gap-1.5 rounded-kws-badge border border-white/70 bg-white/[0.94] px-2.5 text-[#192436] shadow-[0_3px_12px_rgba(19,17,43,0.16)] backdrop-blur-sm">
          <BadgeCheck className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] font-semibold">Offizielle Beta</span>
        </div>
      ) : null}

      <div className="absolute right-2.5 top-2.5 z-30 flex items-center gap-1.5">
        {showQualitySelector && betaVideoUrls ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-9 cursor-pointer items-center gap-1.5 rounded-kws-control border border-white/70 bg-white/[0.94] px-2.5 text-xs font-semibold text-[#192436] shadow-[0_3px_12px_rgba(19,17,43,0.16)] backdrop-blur-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent"
                aria-label={`Videoqualität: ${videoQualityLabels[currentQuality].short}`}
                onClick={(event) => {
                  event.stopPropagation();
                }}
                onMouseDown={(event) => {
                  event.stopPropagation();
                }}
              >
                <Settings className="h-3.5 w-3.5 text-primary" />
                <span>{videoQualityLabels[currentQuality].short}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={6}
              className="z-[120] w-48 rounded-kws-control border border-border/80 bg-white p-1.5 text-[#192436] shadow-[0_5px_18px_rgba(19,17,43,0.12)]"
              onPointerDownOutside={(event) => {
                const target = event.target as HTMLElement;
                if (target.closest('[role="dialog"]')) {
                  event.preventDefault();
                }
              }}
            >
              <DropdownMenuLabel className="px-2.5 pb-2 pt-1.5">
                <span className="block text-xs font-semibold text-[#192436]">Videoqualität</span>
                <span className="mt-0.5 block text-[10px] font-medium text-muted-foreground">Auflösung auswählen</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/80" />
              <DropdownMenuRadioGroup
                value={currentQuality}
                onValueChange={(value) => {
                  const newQuality = value as VideoQualityLevel;
                  if (newQuality === currentQuality) return;

                  rememberPlaybackState();
                  clearBufferingTimeout();
                  clearLoadTimeout();
                  setIsBuffering(true);
                  setCurrentQuality(newQuality);
                }}
              >
                {(['hd', 'sd', 'low'] as const).map((quality) => (
                  betaVideoUrls[quality] ? (
                    <DropdownMenuRadioItem
                      key={quality}
                      value={quality}
                      className="group min-h-10 gap-2 rounded-kws-badge py-2 pl-2.5 pr-2.5 text-xs font-semibold text-[#192436] focus:bg-secondary focus:text-[#192436] data-[state=checked]:bg-primary data-[state=checked]:text-white data-[state=checked]:focus:bg-primary data-[state=checked]:focus:text-white [&>span:first-child]:hidden"
                    >
                      <span aria-hidden="true" className="grid h-4 w-4 shrink-0 place-items-center text-white opacity-0 group-data-[state=checked]:opacity-100">
                        <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                      </span>
                      <span className="text-[#192436] group-data-[state=checked]:text-white">{videoQualityLabels[quality].short}</span>
                      <span className="ml-auto text-[10px] font-medium text-muted-foreground group-data-[state=checked]:text-white/85">{videoQualityLabels[quality].detail}</span>
                    </DropdownMenuRadioItem>
                  ) : null
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        <button
          type="button"
          onClick={toggleFullscreen}
          className="grid h-9 w-9 place-items-center rounded-kws-control border border-white/70 bg-white/[0.94] text-[#192436] shadow-[0_3px_12px_rgba(19,17,43,0.16)] backdrop-blur-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent"
          aria-label={isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
          title={isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>

      {isBuffering && (
        <div
          className="pointer-events-none absolute bottom-4 left-1/2 flex min-h-9 -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-kws-control bg-[#192436]/88 px-3 py-2 text-xs font-medium text-white shadow-[0_3px_12px_rgba(19,17,43,0.18)] backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#8BDC82] motion-reduce:animate-none" aria-hidden="true" />
          Video wird geladen …
        </div>
      )}
    </div>
  );
}
