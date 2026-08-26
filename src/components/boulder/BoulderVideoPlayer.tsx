import { useCallback, useEffect, useRef, useState } from 'react';
import { BadgeCheck, Check, ChevronDown, ExternalLink, Maximize2, Minimize2, Settings, Video } from 'lucide-react';

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
  const [bufferProgress, setBufferProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentQuality, setCurrentQuality] = useState<'hd' | 'sd' | 'low'>('sd');
  const [hasError, setHasError] = useState(false);
  const showQualitySelector = hasMultipleVideoQualities(betaVideoUrls, betaVideoUrl);
  const bufferingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasStartedPlayingRef = useRef(false);
  const playStartTimeRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const bufferingCountRef = useRef(0);
  const lastBufferingTimeRef = useRef<number | null>(null);
  const playbackStateRef = useRef<{ time: number; wasPlaying: boolean } | null>(null);

  useEffect(() => {
    if (!isVisible) return;

    const availableQualities = getAvailableVideoQualities(betaVideoUrls, betaVideoUrl);
    if (availableQualities.length <= 1) {
      setCurrentQuality(availableQualities[0] ?? 'sd');
      retryCountRef.current = 0;
      bufferingCountRef.current = 0;
      lastBufferingTimeRef.current = null;
      return;
    }

    const networkSpeed = detectNetworkSpeed();
    const optimalQuality = getOptimalVideoQualityWithDataSaver(networkSpeed);
    setCurrentQuality(getPreferredVideoQuality(betaVideoUrls, betaVideoUrl, optimalQuality));
    retryCountRef.current = 0;
    bufferingCountRef.current = 0;
    lastBufferingTimeRef.current = null;
    console.log('[VideoPlayer] Network speed:', networkSpeed, 'Selected quality:', optimalQuality);
  }, [isVisible, betaVideoUrls, betaVideoUrl]);

  const currentVideoUrl = getVideoUrl(betaVideoUrls, betaVideoUrl, currentQuality);

  const handleQualityFallback = useCallback(() => {
    if (retryCountRef.current >= 2) {
      setHasError(true);
      return;
    }

    retryCountRef.current++;
    const video = videoRef.current;
    if (!video || !betaVideoUrls) return;

    let nextQuality: 'hd' | 'sd' | 'low' | null = null;
    if (currentQuality === 'hd' && betaVideoUrls.sd) {
      nextQuality = 'sd';
    } else if ((currentQuality === 'hd' || currentQuality === 'sd') && betaVideoUrls.low) {
      nextQuality = 'low';
    }

    if (nextQuality) {
      console.log('[VideoPlayer] Falling back to', nextQuality, 'quality');
      setCurrentQuality(nextQuality);
      setHasError(false);
      video.load();
    } else {
      setHasError(true);
    }
  }, [betaVideoUrls, currentQuality]);

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

    if (video.src && video.duration > 0) {
      playbackStateRef.current = {
        time: video.currentTime,
        wasPlaying: !video.paused,
      };
    }

    video.src = videoUrl;
    video.preload = 'metadata';

    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }

    loadTimeoutRef.current = setTimeout(() => {
      if (video.readyState === 0) {
        console.warn('[VideoPlayer] Video loading timeout (10s), trying lower quality');
        handleQualityFallback();
      }
    }, 10000);

    video.load();

    const handleLoadedMetadata = () => {
      if (playbackStateRef.current) {
        video.currentTime = playbackStateRef.current.time;
        if (playbackStateRef.current.wasPlaying) {
          video.play().catch(() => undefined);
        }
        playbackStateRef.current = null;
      }
    };

    const handleAutoPlay = () => {
      if (!playbackStateRef.current && video.readyState >= 3) {
        video.play().catch((error) => {
          console.log('[VideoPlayer] Auto-play blocked or failed:', error);
        });
      }
    };

    video.addEventListener('canplaythrough', handleAutoPlay, { once: true });
    video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });

    if (video.readyState >= 3) {
      handleAutoPlay();
    }

    if (video.readyState >= 1) {
      handleLoadedMetadata();
    }

    return () => {
      if (bufferingTimeoutRef.current) {
        clearTimeout(bufferingTimeoutRef.current);
        bufferingTimeoutRef.current = null;
      }
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
      video.removeEventListener('canplaythrough', handleAutoPlay);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.pause();
      video.currentTime = 0;
      hasStartedPlayingRef.current = false;
      playStartTimeRef.current = null;
      playbackStateRef.current = null;
    };
  }, [isVisible, currentQuality, betaVideoUrls, betaVideoUrl, handleQualityFallback]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateBufferProgress = () => {
      if (video.buffered.length > 0 && video.duration > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const progress = (bufferedEnd / video.duration) * 100;
        setBufferProgress(progress);

        if (video.ended) {
          setIsBuffering(false);
          return;
        }

        const currentTime = video.currentTime;
        const bufferAhead = bufferedEnd - currentTime;
        const timeFromEnd = video.duration - currentTime;
        const percentRemaining = (timeFromEnd / video.duration) * 100;
        const isNearEnd = video.duration > 0 && (timeFromEnd <= 5 || percentRemaining <= 10);

        if (isNearEnd) {
          if (bufferingTimeoutRef.current) {
            clearTimeout(bufferingTimeoutRef.current);
            bufferingTimeoutRef.current = null;
          }
          setIsBuffering(false);
        } else if (bufferAhead >= 1 || (bufferAhead < 1 && !video.paused && video.readyState >= 3)) {
          if (bufferingTimeoutRef.current) {
            clearTimeout(bufferingTimeoutRef.current);
            bufferingTimeoutRef.current = null;
          }
        }

        const timeSincePlayStart = playStartTimeRef.current ? Date.now() - playStartTimeRef.current : Infinity;
        const gracePeriodMs = 5000;

        if (bufferAhead < 0.5 && !video.paused && !isNearEnd && hasStartedPlayingRef.current && timeSincePlayStart > gracePeriodMs) {
          video.pause();
          setIsBuffering(true);
        }

        if (bufferAhead > 3 && video.paused && isBuffering && !isNearEnd) {
          video.play().catch(() => undefined);
          setIsBuffering(false);
        }
      }
    };

    const handleWaiting = () => {
      if (video.ended) {
        setIsBuffering(false);
        return;
      }

      const timeFromEnd = video.duration - video.currentTime;
      const percentRemaining = (timeFromEnd / video.duration) * 100;
      const isNearEnd = video.duration > 0 && (timeFromEnd <= 5 || percentRemaining <= 10);
      if (isNearEnd) {
        setIsBuffering(false);
        return;
      }

      const now = Date.now();
      const timeSinceLastBuffering = lastBufferingTimeRef.current ? now - lastBufferingTimeRef.current : Infinity;

      bufferingCountRef.current = timeSinceLastBuffering < 10000 ? bufferingCountRef.current + 1 : 1;
      lastBufferingTimeRef.current = now;

      if (bufferingCountRef.current >= 2 && hasStartedPlayingRef.current) {
        console.warn('[VideoPlayer] Video buffering frequently, switching to lower quality');
        handleQualityFallback();
        bufferingCountRef.current = 0;
        return;
      }

      setIsBuffering(true);
    };

    const handlePlay = () => {
      hasStartedPlayingRef.current = true;
      playStartTimeRef.current = Date.now();
    };

    const handlePause = () => {
      playStartTimeRef.current = null;
    };

    const handleCanPlay = () => {
      setIsBuffering(false);
      bufferingCountRef.current = 0;
      if (bufferingTimeoutRef.current) {
        clearTimeout(bufferingTimeoutRef.current);
        bufferingTimeoutRef.current = null;
      }
    };

    const handleEnded = () => {
      setIsBuffering(false);
      hasStartedPlayingRef.current = false;
      playStartTimeRef.current = null;
      if (bufferingTimeoutRef.current) {
        clearTimeout(bufferingTimeoutRef.current);
        bufferingTimeoutRef.current = null;
      }
    };

    const handleError = () => {
      const error = video.error;
      if (!error) return;

      console.error('[VideoPlayer] Video error:', {
        code: error.code,
        message: error.message,
        quality: currentQuality,
      });

      if (error.code === MediaError.MEDIA_ERR_NETWORK || error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
        handleQualityFallback();
      } else {
        setHasError(true);
      }
    };

    const handleLoadedMetadata = () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
      setHasError(false);
    };

    const handleStalled = () => {
      console.warn('[VideoPlayer] Video stalled, checking if fallback needed');
      if (video.readyState < 2) {
        setTimeout(() => {
          if (video.readyState < 2) {
            handleQualityFallback();
          }
        }, 5000);
      }
    };

    video.addEventListener('progress', updateBufferProgress);
    video.addEventListener('timeupdate', updateBufferProgress);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('canplaythrough', handleCanPlay);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('stalled', handleStalled);

    return () => {
      video.removeEventListener('progress', updateBufferProgress);
      video.removeEventListener('timeupdate', updateBufferProgress);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('canplaythrough', handleCanPlay);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('stalled', handleStalled);
      if (bufferingTimeoutRef.current) {
        clearTimeout(bufferingTimeoutRef.current);
        bufferingTimeoutRef.current = null;
      }
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
    };
  }, [betaVideoUrl, betaVideoUrls, currentQuality, handleQualityFallback, isBuffering]);

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
                  setHasError(false);
                  retryCountRef.current = 0;
                  if (videoRef.current) {
                    videoRef.current.src = fallbackUrl;
                    videoRef.current.load();
                  }
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
        controls
        muted
        playsInline
        controlsList="nodownload"
        className={cn('h-full w-full object-center', isFullscreen ? 'object-contain' : 'object-cover')}
        poster={poster || undefined}
        preload="metadata"
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
                  const newQuality = value as 'hd' | 'sd' | 'low';
                  if (newQuality === currentQuality) return;

                  const video = videoRef.current;
                  if (video && video.duration > 0) {
                    playbackStateRef.current = {
                      time: video.currentTime,
                      wasPlaying: !video.paused,
                    };
                  }

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

      {isBuffering && bufferProgress < 100 && (
        <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-kws-control bg-[#192436]/85 px-3 py-2 text-center text-xs font-medium text-white backdrop-blur-sm">
          Buffering {Math.round(bufferProgress)}%
        </div>
      )}
    </div>
  );
}
