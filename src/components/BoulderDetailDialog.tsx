import { useEffect, useRef, useState } from 'react';
import { formatDate } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  BarChart3,
  Calendar,
  ExternalLink,
  MapPin,
  Maximize2,
  Minimize2,
  Settings,
  Target,
  Video,
} from 'lucide-react';

import { BoulderBetaPreview, BoulderStatsPanel, BoulderTrackingPanel } from '@/components/BoulderCommunityPanel';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';
import { cn } from '@/lib/utils';
import { getOptimalVideoQualityWithDataSaver, detectNetworkSpeed } from '@/utils/networkUtils';
import { getColorBackgroundStyle } from '@/utils/colorUtils';
import { getVideoUrl } from '@/utils/videoUtils';
import { Boulder, VideoQualities } from '@/types/boulder';

interface BoulderDetailDialogProps {
  boulder: Boulder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TEXT_ON_COLOR: Record<string, string> = {
  'Gruen': 'text-white',
  'Gelb': 'text-black',
  'Blau': 'text-white',
  'Orange': 'text-black',
  'Rot': 'text-white',
  'Schwarz': 'text-white',
  'Weiss': 'text-black',
  'Lila': 'text-white',
  'Grün': 'text-white',
  'Weiß': 'text-black',
};

const isYouTubeUrl = (url: string): boolean => /youtube\.com|youtu\.be/.test(url);
const isVimeoUrl = (url: string): boolean => /vimeo\.com/.test(url);

const getYouTubeEmbedUrl = (url: string): string => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  const videoId = match && match[2].length === 11 ? match[2] : null;
  return videoId ? `https://www.youtube.com/embed/${videoId}?mute=1` : url;
};

const getVimeoEmbedUrl = (url: string): string => {
  const regExp = /vimeo\.com\/(\d+)/;
  const match = url.match(regExp);
  const videoId = match ? match[1] : null;
  return videoId ? `https://player.vimeo.com/video/${videoId}?muted=1` : url;
};

const VideoPlayerWithBuffer = ({
  betaVideoUrls,
  betaVideoUrl,
  poster,
  isVisible,
}: {
  betaVideoUrls?: VideoQualities;
  betaVideoUrl?: string;
  poster?: string;
  isVisible?: boolean;
}) => {
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
      <div className="relative flex h-full w-full items-center justify-center rounded-xl bg-black/50">
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
    <div ref={containerRef} className="relative h-full w-full">
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

      {betaVideoUrls && (betaVideoUrls.hd || betaVideoUrls.sd || betaVideoUrls.low) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="absolute left-2 top-2 z-30 flex cursor-pointer items-center gap-1 rounded-md border-0 bg-black/70 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm transition-all hover:bg-black/80 sm:text-sm"
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
            align="start"
            className="z-[120] w-32"
            onPointerDownOutside={(event) => {
              const target = event.target as HTMLElement;
              if (target.closest('[role=\"dialog\"]')) {
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
      )}

      <button
        onClick={toggleFullscreen}
        className="absolute right-2 top-2 z-20 rounded-lg bg-black/60 p-2 text-white backdrop-blur-sm transition-all hover:bg-black/80"
        aria-label={isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
        title={isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
      >
        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </button>

      {isBuffering && bufferProgress < 100 && (
        <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-full bg-black/45 px-3 py-2 text-center text-xs font-medium text-white backdrop-blur-sm">
          Buffering {Math.round(bufferProgress)}%
        </div>
      )}
    </div>
  );
};

export const BoulderDetailDialog = ({ boulder, open, onOpenChange }: BoulderDetailDialogProps) => {
  console.log('[BoulderDetailDialog] Render:', { boulder: boulder?.name, open });

  const { user, loading: authLoading } = useAuth();
  const { data: colors } = useColors();
  const videoUrl = boulder?.betaVideoUrl;
  const hasVideo = Boolean(videoUrl);
  const isYouTube = videoUrl ? isYouTubeUrl(videoUrl) : false;
  const isVimeo = videoUrl ? isVimeoUrl(videoUrl) : false;
  const isDirectVideo = videoUrl && !isYouTube && !isVimeo;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'beta' | 'tracking' | 'stats'>('beta');

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

  useEffect(() => {
    if (!open) return;
    setActiveTab('beta');
  }, [boulder?.id, open]);

  const toggleFullscreen = async () => {
    const container = iframeRef.current?.parentElement;
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

  const getThumbnailUrl = (selectedBoulder: Boulder): string | undefined => {
    if (!selectedBoulder.thumbnailUrl) {
      return undefined;
    }

    let url = selectedBoulder.thumbnailUrl;
    if (url.includes('cdn.kletterwelt-sauerland.de/uploads/videos/')) {
      url = url.replace('/uploads/videos/', '/uploads/');
    }
    return url;
  };

  if (!boulder) {
    return null;
  }

  const showCommunityTabs = !!user && !authLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!bottom-auto !left-1/2 !right-auto !top-1/2 !-translate-x-1/2 !-translate-y-1/2 w-[calc(100vw-1.25rem)] max-h-[92vh] gap-0 overflow-y-auto rounded-2xl border border-[#E7F7E9] p-0 sm:max-h-[85vh] sm:max-w-[760px]">
        <DialogHeader className="px-4 pb-3 pt-5 sm:px-6 sm:pb-4 sm:pt-6">
          <DialogDescription className="sr-only">
            Details für Boulder {boulder.name} - {boulder.color} · Grad {boulder.difficulty === null ? '?' : boulder.difficulty} · {boulder.sector}
          </DialogDescription>
          <DialogTitle className="text-center font-heading text-lg font-bold text-[#13112B] sm:text-2xl">
            {boulder.name}
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#E7F7E9] bg-[#F9FAF9] px-2.5 py-1 text-xs text-[#13112B]">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-[#36B531]" />
              <span className="max-w-[10rem] truncate">{boulder.sector}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#E7F7E9] bg-[#F9FAF9] px-2.5 py-1 text-xs text-[#13112B]">
              <Calendar className="h-3.5 w-3.5 flex-shrink-0 text-[#36B531]" />
              <span>{formatDate(boulder.createdAt, 'dd. MMM yyyy', { locale: de })}</span>
            </span>
            <span
              className={cn(
                'inline-flex h-8 min-w-12 items-center justify-center gap-2 rounded-xl border-2 px-3 text-xs font-semibold',
                TEXT_ON_COLOR[boulder.color] || 'text-white',
              )}
              style={{
                ...getColorBackgroundStyle(boulder.color, colors || []),
                borderColor: 'rgba(0, 0, 0, 0.1)',
              }}
              title={`${boulder.color} · Grad ${boulder.difficulty === null ? '?' : boulder.difficulty}`}
            >
              <span>{boulder.difficulty === null ? '?' : boulder.difficulty}</span>
            </span>
          </div>

          <div className="space-y-3">
            {showCommunityTabs ? (
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'beta' | 'tracking' | 'stats')} className="w-full">
                <TabsList className="grid h-auto w-full grid-cols-3 rounded-xl bg-[#F4F8F5] p-1">
                  <TabsTrigger className="h-10 gap-1.5 rounded-xl px-2 text-sm" value="beta">
                    <Video className="h-4 w-4" />
                    Beta
                  </TabsTrigger>
                  <TabsTrigger className="h-10 gap-1.5 rounded-xl px-2 text-sm" value="tracking">
                    <Target className="h-4 w-4" />
                    Tracking
                  </TabsTrigger>
                  <TabsTrigger className="h-10 gap-1.5 rounded-xl px-2 text-sm" value="stats">
                    <BarChart3 className="h-4 w-4" />
                    Stats
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="beta" className="mt-3 space-y-3">
                  <div className="rounded-2xl border border-[#E7F7E9] bg-[linear-gradient(180deg,#FEFFFE_0%,#F6FBF7_100%)] p-3 shadow-[0_14px_32px_rgba(19,17,43,0.05)] sm:p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#17641D]/72">Boulder Video</p>
                        <h3 className="font-heading text-xl leading-none text-[#13112B] sm:text-2xl">Beta ansehen</h3>
                      </div>
                      <div className="rounded-full border border-[#E7F7E9] bg-white px-3 py-1 text-xs font-medium text-[#13112B]/60">
                        {boulder.color} · Grad {boulder.difficulty === null ? '?' : boulder.difficulty}
                      </div>
                    </div>

                    <div className="relative mx-auto aspect-[9/16] w-full max-w-[290px] overflow-hidden rounded-2xl border-2 border-[#E7F7E9] bg-white shadow-[0_14px_30px_rgba(19,17,43,0.08)] sm:max-w-[320px]">
                      {isYouTube && (
                        <>
                          <iframe
                            ref={iframeRef}
                            src={open ? getYouTubeEmbedUrl(videoUrl) : undefined}
                            className="h-full w-full"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                            allowFullScreen
                            loading="lazy"
                            title="YouTube video player"
                          />
                          <button
                            onClick={toggleFullscreen}
                            className="absolute right-2 top-2 z-20 rounded-lg bg-black/60 p-2 text-white backdrop-blur-sm transition-all hover:bg-black/80"
                            aria-label={isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
                            title={isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
                          >
                            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                          </button>
                        </>
                      )}

                      {isVimeo && (
                        <>
                          <iframe
                            ref={iframeRef}
                            src={open ? getVimeoEmbedUrl(videoUrl) : undefined}
                            className="h-full w-full"
                            frameBorder="0"
                            allow="autoplay; fullscreen; picture-in-picture"
                            allowFullScreen
                            loading="lazy"
                            title="Vimeo video player"
                          />
                          <button
                            onClick={toggleFullscreen}
                            className="absolute right-2 top-2 z-20 rounded-lg bg-black/60 p-2 text-white backdrop-blur-sm transition-all hover:bg-black/80"
                            aria-label={isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
                            title={isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
                          >
                            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                          </button>
                        </>
                      )}

                      {isDirectVideo && (
                        <VideoPlayerWithBuffer
                          betaVideoUrls={boulder.betaVideoUrls}
                          betaVideoUrl={boulder.betaVideoUrl}
                          poster={getThumbnailUrl(boulder)}
                          isVisible={open && activeTab === 'beta'}
                        />
                      )}

                      {!hasVideo && (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-4 text-center">
                          <Video className="h-12 w-12 text-[#13112B]/40" />
                          <div>
                            <p className="text-base font-semibold text-[#13112B]">Noch kein Beta-Video</p>
                            <p className="mt-1 text-sm text-[#13112B]/60">Sobald ein Video vorhanden ist, erscheint es hier als Hero-Bereich.</p>
                          </div>
                        </div>
                      )}

                      {hasVideo && !isYouTube && !isVimeo && !isDirectVideo && (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-4">
                          <Video className="h-12 w-12 text-[#13112B]/40" />
                          <div className="text-center">
                            <p className="mb-2 text-sm text-[#13112B]/60">Video kann nicht direkt angezeigt werden</p>
                            <Button
                              variant="outline"
                              className="h-9 rounded-xl border-[#E7F7E9] text-[#13112B] hover:bg-[#E7F7E9]"
                              onClick={() => window.open(videoUrl, '_blank')}
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Video öffnen
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <BoulderBetaPreview boulder={boulder} />
                </TabsContent>

              <TabsContent value="tracking" className="mt-3">
                <BoulderTrackingPanel boulder={boulder} />
              </TabsContent>

              <TabsContent value="stats" className="mt-3">
                <BoulderStatsPanel boulder={boulder} />
              </TabsContent>
            </Tabs>
            ) : (
              <div className="space-y-3">
                <div className="rounded-2xl border border-[#E7F7E9] bg-[linear-gradient(180deg,#FEFFFE_0%,#F6FBF7_100%)] p-3 shadow-[0_14px_32px_rgba(19,17,43,0.05)] sm:p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#17641D]/72">Boulder Video</p>
                      <h3 className="font-heading text-xl leading-none text-[#13112B] sm:text-2xl">Beta ansehen</h3>
                    </div>
                    <div className="rounded-full border border-[#E7F7E9] bg-white px-3 py-1 text-xs font-medium text-[#13112B]/60">
                      {boulder.color} · Grad {boulder.difficulty === null ? '?' : boulder.difficulty}
                    </div>
                  </div>

                  <div className="relative mx-auto aspect-[9/16] w-full max-w-[290px] overflow-hidden rounded-2xl border-2 border-[#E7F7E9] bg-white shadow-[0_14px_30px_rgba(19,17,43,0.08)] sm:max-w-[320px]">
                    {isYouTube && (
                      <>
                        <iframe
                          ref={iframeRef}
                          src={open ? getYouTubeEmbedUrl(videoUrl) : undefined}
                          className="h-full w-full"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                          allowFullScreen
                          loading="lazy"
                          title="YouTube video player"
                        />
                        <button
                          onClick={toggleFullscreen}
                          className="absolute right-2 top-2 z-20 rounded-lg bg-black/60 p-2 text-white backdrop-blur-sm transition-all hover:bg-black/80"
                          aria-label={isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
                          title={isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
                        >
                          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                        </button>
                      </>
                    )}

                    {isVimeo && (
                      <>
                        <iframe
                          ref={iframeRef}
                          src={open ? getVimeoEmbedUrl(videoUrl) : undefined}
                          className="h-full w-full"
                          frameBorder="0"
                          allow="autoplay; fullscreen; picture-in-picture"
                          allowFullScreen
                          loading="lazy"
                          title="Vimeo video player"
                        />
                        <button
                          onClick={toggleFullscreen}
                          className="absolute right-2 top-2 z-20 rounded-lg bg-black/60 p-2 text-white backdrop-blur-sm transition-all hover:bg-black/80"
                          aria-label={isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
                          title={isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
                        >
                          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                        </button>
                      </>
                    )}

                    {isDirectVideo && (
                      <VideoPlayerWithBuffer
                        betaVideoUrls={boulder.betaVideoUrls}
                        betaVideoUrl={boulder.betaVideoUrl}
                        poster={getThumbnailUrl(boulder)}
                        isVisible={open}
                      />
                    )}

                    {!hasVideo && (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-4 text-center">
                        <Video className="h-12 w-12 text-[#13112B]/40" />
                        <div>
                          <p className="text-base font-semibold text-[#13112B]">Noch kein Beta-Video</p>
                          <p className="mt-1 text-sm text-[#13112B]/60">Sobald ein Video vorhanden ist, erscheint es hier als Hero-Bereich.</p>
                        </div>
                      </div>
                    )}

                    {hasVideo && !isYouTube && !isVimeo && !isDirectVideo && (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-4">
                        <Video className="h-12 w-12 text-[#13112B]/40" />
                        <div className="text-center">
                          <p className="mb-2 text-sm text-[#13112B]/60">Video kann nicht direkt angezeigt werden</p>
                          <Button
                            variant="outline"
                            className="h-9 rounded-xl border-[#E7F7E9] text-[#13112B] hover:bg-[#E7F7E9]"
                            onClick={() => window.open(videoUrl, '_blank')}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Video öffnen
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <BoulderBetaPreview boulder={boulder} />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

