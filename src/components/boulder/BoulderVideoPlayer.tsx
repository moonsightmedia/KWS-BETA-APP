import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Maximize2, Minimize2, Settings, Video } from 'lucide-react';

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
import { getVideoUrl } from '@/utils/videoUtils';

export const isYouTubeUrl = (url: string): boolean => /youtube\.com|youtu\.be/.test(url);
export const isVimeoUrl = (url: string): boolean => /vimeo\.com/.test(url);

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
  className?: string;
};

export function BoulderVideoPlayer({
  betaVideoUrls,
  betaVideoUrl,
  poster,
  isVisible = true,
  className,
}: BoulderVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferProgress, setBufferProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentQuality, setCurrentQuality] = useState<'hd' | 'sd' | 'low'>('hd');
  const [hasError, setHasError] = useState(false);
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

    const networkSpeed = detectNetworkSpeed();
    const optimalQuality = getOptimalVideoQualityWithDataSaver(networkSpeed);
    setCurrentQuality(optimalQuality);
    retryCountRef.current = 0;
    bufferingCountRef.current = 0;
    lastBufferingTimeRef.current = null;
    console.log('[VideoPlayer] Network speed:', networkSpeed, 'Selected quality:', optimalQuality);
  }, [isVisible]);

  const currentVideoUrl = getVideoUrl(betaVideoUrls, betaVideoUrl, currentQuality);

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
  }, [isVisible, currentQuality, betaVideoUrls, betaVideoUrl]);

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
  }, [betaVideoUrl, betaVideoUrls, currentQuality, isBuffering]);

  const handleQualityFallback = () => {
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
  };

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
    const container = containerRef.current;
    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if ((container as any).webkitRequestFullscreen) {
          await (container as any).webkitRequestFullscreen();
        } else if ((container as any).mozRequestFullScreen) {
          await (container as any).mozRequestFullScreen();
        } else if ((container as any).msRequestFullscreen) {
          await (container as any).msRequestFullscreen();
        }
      } else if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  };

  if (hasError || !currentVideoUrl) {
    const fallbackUrl = getVideoUrl(betaVideoUrls, betaVideoUrl, 'low') || betaVideoUrl;
    return (
      <div className={cn('relative flex h-full w-full items-center justify-center rounded-xl bg-black/50', className)}>
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
    <div ref={containerRef} className={cn('relative h-full w-full', className)}>
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
        className="h-full w-full object-cover object-center"
        poster={poster || undefined}
        preload="metadata"
        style={{ objectFit: 'cover', objectPosition: 'center' }}
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

      <div className="absolute right-2 top-2 z-30 flex items-center gap-2">
        {betaVideoUrls && (betaVideoUrls.hd || betaVideoUrls.sd || betaVideoUrls.low) ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex cursor-pointer items-center gap-1 rounded-md border-0 bg-black/70 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm transition-all hover:bg-black/80 sm:text-sm"
                onClick={(event) => {
                  event.stopPropagation();
                  event.preventDefault();
                }}
                onMouseDown={(event) => {
                  event.stopPropagation();
                }}
              >
                <Settings className="h-3 w-3" />
                {currentQuality.toUpperCase()}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="z-[120] w-32"
              onPointerDownOutside={(event) => {
                const target = event.target as HTMLElement;
                if (target.closest('[role="dialog"]')) {
                  event.preventDefault();
                }
              }}
            >
              <DropdownMenuLabel>Qualitaet</DropdownMenuLabel>
              <DropdownMenuSeparator />
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
                {betaVideoUrls.hd && <DropdownMenuRadioItem value="hd">HD (1920p)</DropdownMenuRadioItem>}
                {betaVideoUrls.sd && <DropdownMenuRadioItem value="sd">SD (1280p)</DropdownMenuRadioItem>}
                {betaVideoUrls.low && <DropdownMenuRadioItem value="low">Low (640p)</DropdownMenuRadioItem>}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        <button
          onClick={toggleFullscreen}
          className="rounded-lg bg-black/60 p-2 text-white backdrop-blur-sm transition-all hover:bg-black/80"
          aria-label={isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
          title={isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>

      {isBuffering && bufferProgress < 100 && (
        <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-full bg-black/45 px-3 py-2 text-center text-xs font-medium text-white backdrop-blur-sm">
          Buffering {Math.round(bufferProgress)}%
        </div>
      )}
    </div>
  );
}
