import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Boulder } from '@/types/boulder';
import { formatDate } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, MapPin, Palette, FileText, ExternalLink, Video, Maximize2, Minimize2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useColors } from '@/hooks/useColors';
import { getColorBackgroundStyle } from '@/utils/colorUtils';
import { cn } from '@/lib/utils';

interface BoulderDetailDialogProps {
  boulder: Boulder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TEXT_ON_COLOR: Record<string, string> = {
  'Grün': 'text-white',
  'Gelb': 'text-black',
  'Blau': 'text-white',
  'Orange': 'text-black',
  'Rot': 'text-white',
  'Schwarz': 'text-white',
  'Weiß': 'text-black',
  'Lila': 'text-white',
};

// Helper function um zu erkennen, ob es eine YouTube/Vimeo URL ist
const isYouTubeUrl = (url: string): boolean => {
  return /youtube\.com|youtu\.be/.test(url);
};

const isVimeoUrl = (url: string): boolean => {
  return /vimeo\.com/.test(url);
};

const getYouTubeEmbedUrl = (url: string): string => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  const videoId = (match && match[2].length === 11) ? match[2] : null;
  return videoId ? `https://www.youtube.com/embed/${videoId}?mute=1` : url;
};

/**
 * Video Player Component with improved buffering and preloading
 */
const VideoPlayerWithBuffer = ({ videoUrl, poster, isVisible }: { videoUrl: string; poster?: string; isVisible?: boolean }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferProgress, setBufferProgress] = useState(0);
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Load video only when visible
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVisible) return;

    // Set preload to metadata when visible
    video.preload = 'metadata';
    
    return () => {
      // Pause and reset when not visible
      if (video) {
        video.pause();
        video.currentTime = 0;
      }
    };
  }, [isVisible]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateBufferProgress = () => {
      if (video.buffered.length > 0 && video.duration > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const progress = (bufferedEnd / video.duration) * 100;
        setBufferProgress(progress);
        
        // Don't show loading indicator if video has ended
        if (video.ended) {
          setShowLoadingIndicator(false);
          setIsBuffering(false);
          return;
        }
        
        // Show loading indicator if buffer is low (but not at the end)
        const currentTime = video.currentTime;
        const bufferAhead = bufferedEnd - currentTime;
        
        // Check if we're near the end - use both time-based and percentage-based checks
        const timeFromEnd = video.duration - currentTime;
        const percentRemaining = (timeFromEnd / video.duration) * 100;
        // Hide loading indicator if within 5 seconds OR in last 10% of video
        const isNearEnd = video.duration > 0 && (timeFromEnd <= 5 || percentRemaining <= 10);
        
        // Only show loading indicator if buffer is low AND not near the end
        if (isNearEnd) {
          // Near the end - hide loading indicator completely
          setShowLoadingIndicator(false);
          setIsBuffering(false);
        } else {
          // Not near the end - show loading indicator if buffer is low
          setShowLoadingIndicator(bufferAhead < 2);
        }
        
        // Auto-pause if buffer is too low (but not if near end)
        if (bufferAhead < 1 && !video.paused && !isNearEnd) {
          video.pause();
          setIsBuffering(true);
        }
        
        // Resume if buffer is sufficient
        if (bufferAhead > 3 && video.paused && isBuffering && !isNearEnd) {
          video.play().catch(() => {
            // Ignore play errors
          });
          setIsBuffering(false);
        }
      }
    };

    const handleProgress = () => {
      updateBufferProgress();
    };

    const handleTimeUpdate = () => {
      updateBufferProgress();
    };

    const handleWaiting = () => {
      const video = videoRef.current;
      if (!video) return;
      
      // Don't show loading indicator if video has ended or is near the end
      if (video.ended) {
        setIsBuffering(false);
        setShowLoadingIndicator(false);
        return;
      }
      
      // Check if we're near the end - use both time-based and percentage-based checks
      const timeFromEnd = video.duration - video.currentTime;
      const percentRemaining = (timeFromEnd / video.duration) * 100;
      const isNearEnd = video.duration > 0 && (timeFromEnd <= 5 || percentRemaining <= 10);
      if (isNearEnd) {
        setIsBuffering(false);
        setShowLoadingIndicator(false);
        return;
      }
      
      setIsBuffering(true);
      setShowLoadingIndicator(true);
    };

    const handleCanPlay = () => {
      setIsBuffering(false);
      setShowLoadingIndicator(false);
    };

    const handleCanPlayThrough = () => {
      setIsBuffering(false);
      setShowLoadingIndicator(false);
    };

    const handleEnded = () => {
      setIsBuffering(false);
      setShowLoadingIndicator(false);
    };

    video.addEventListener('progress', handleProgress);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('canplaythrough', handleCanPlayThrough);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('canplaythrough', handleCanPlayThrough);
      video.removeEventListener('ended', handleEnded);
    };
  }, [isBuffering]);

  // Fullscreen handling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

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
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <video 
        ref={videoRef}
        controls 
        muted
        className="w-full h-full object-cover object-center"
        poster={poster || undefined}
        preload="none"
        style={{ objectFit: 'cover', objectPosition: 'center' }}
      >
        {/* Dynamically determine video type based on URL extension */}
        {videoUrl.toLowerCase().endsWith('.mp4') ? (
          <>
            <source src={videoUrl} type="video/mp4" />
            <source src={videoUrl} type="video/webm" />
          </>
        ) : (
          <>
            <source src={videoUrl} type="video/webm" />
            <source src={videoUrl} type="video/mp4" />
          </>
        )}
        Dein Browser unterstützt keine Videos.
        <p className="p-4">
          Dein Browser unterstützt dieses Video-Format nicht.{' '}
          <a 
            href={videoUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Video direkt öffnen
          </a>
        </p>
      </video>
      <button
        onClick={toggleFullscreen}
        className="absolute top-2 right-2 z-20 bg-black/60 hover:bg-black/80 text-white p-2 rounded-lg transition-all backdrop-blur-sm"
        aria-label={isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
        title={isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
      >
        {isFullscreen ? (
          <Minimize2 className="w-4 h-4" />
        ) : (
          <Maximize2 className="w-4 h-4" />
        )}
      </button>
      {showLoadingIndicator && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center flex-col gap-2 z-10">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-white text-sm">Video wird geladen...</p>
          {bufferProgress > 0 && (
            <div className="w-48">
              <Progress value={bufferProgress} className="h-1" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const getVimeoEmbedUrl = (url: string): string => {
  const regExp = /vimeo\.com\/(\d+)/;
  const match = url.match(regExp);
  const videoId = match ? match[1] : null;
  return videoId ? `https://player.vimeo.com/video/${videoId}?muted=1` : url;
};

export const BoulderDetailDialog = ({ boulder, open, onOpenChange }: BoulderDetailDialogProps) => {
  console.log('[BoulderDetailDialog] Render:', { boulder: boulder?.name, open });
  
  const { data: colors } = useColors();
  const videoUrl = boulder?.betaVideoUrl;
  const isYouTube = videoUrl ? isYouTubeUrl(videoUrl) : false;
  const isVimeo = videoUrl ? isVimeoUrl(videoUrl) : false;
  const isDirectVideo = videoUrl && !isYouTube && !isVimeo;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fullscreen handling for iframes
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
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  };

  // Get thumbnail URL for video poster
  const getThumbnailUrl = (boulder: Boulder): string | undefined => {
    if (boulder.thumbnailUrl) {
      // Fix old URLs that incorrectly include /videos/ in the path
      let url = boulder.thumbnailUrl;
      if (url.includes('cdn.kletterwelt-sauerland.de/uploads/videos/')) {
        url = url.replace('/uploads/videos/', '/uploads/');
      }
      return url;
    }
    return undefined;
  };

  if (!boulder) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[700px] p-0 gap-0 max-h-[90vh] sm:max-h-[85vh] overflow-y-auto !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 !bottom-auto !right-auto !rounded-2xl !border !border-[#E7F7E9]">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogDescription className="sr-only">
            Details für Boulder {boulder.name} - {boulder.color} · Grad {boulder.difficulty === null ? '?' : boulder.difficulty} · {boulder.sector}
          </DialogDescription>
          <DialogTitle className="text-xl sm:text-2xl font-heading font-bold text-[#13112B] text-center">
            {boulder.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="px-6 pb-6">

          {/* Compact meta chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#E7F7E9] bg-[#F9FAF9] px-2.5 py-1 text-xs text-[#13112B]">
              <MapPin className="w-3.5 h-3.5 text-[#36B531] flex-shrink-0" />
              <span className="truncate max-w-[10rem]">{boulder.sector}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#E7F7E9] bg-[#F9FAF9] px-2.5 py-1 text-xs text-[#13112B]">
              <Calendar className="w-3.5 h-3.5 text-[#36B531] flex-shrink-0" />
              <span>{formatDate(boulder.createdAt, 'dd. MMM yyyy', { locale: de })}</span>
            </span>
            <span
              className={cn(
                "inline-flex items-center justify-center gap-2 h-8 px-3 rounded-xl border-2 text-xs font-semibold",
                TEXT_ON_COLOR[boulder.color] || 'text-white'
              )}
              style={{
                ...getColorBackgroundStyle(boulder.color, colors || []),
                borderColor: 'rgba(0, 0, 0, 0.1)'
              }}
              title={`${boulder.color} · Grad ${boulder.difficulty === null ? '?' : boulder.difficulty}`}
            >
              <span>{boulder.difficulty === null ? '?' : boulder.difficulty}</span>
            </span>
          </div>

          <div className="space-y-4">
            {/* Video Section */}
            {videoUrl && (
              <div className="relative aspect-[9/16] w-full max-w-[200px] sm:max-w-[280px] mx-auto overflow-hidden rounded-xl border-2 border-[#E7F7E9] bg-white shadow-sm">
                {isYouTube && (
                  <>
                    <iframe
                      ref={iframeRef}
                      src={open ? getYouTubeEmbedUrl(videoUrl) : undefined}
                      className="w-full h-full"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                      allowFullScreen
                      loading="lazy"
                      title="YouTube video player"
                    />
                    <button
                      onClick={toggleFullscreen}
                      className="absolute top-2 right-2 z-20 bg-black/60 hover:bg-black/80 text-white p-2 rounded-lg transition-all backdrop-blur-sm"
                      aria-label={isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
                      title={isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
                    >
                      {isFullscreen ? (
                        <Minimize2 className="w-4 h-4" />
                      ) : (
                        <Maximize2 className="w-4 h-4" />
                      )}
                    </button>
                  </>
                )}
                {isVimeo && (
                  <>
                    <iframe
                      ref={iframeRef}
                      src={open ? getVimeoEmbedUrl(videoUrl) : undefined}
                      className="w-full h-full"
                      frameBorder="0"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                      loading="lazy"
                      title="Vimeo video player"
                    />
                    <button
                      onClick={toggleFullscreen}
                      className="absolute top-2 right-2 z-20 bg-black/60 hover:bg-black/80 text-white p-2 rounded-lg transition-all backdrop-blur-sm"
                      aria-label={isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
                      title={isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
                    >
                      {isFullscreen ? (
                        <Minimize2 className="w-4 h-4" />
                      ) : (
                        <Maximize2 className="w-4 h-4" />
                      )}
                    </button>
                  </>
                )}
                {isDirectVideo && (
                  <VideoPlayerWithBuffer videoUrl={videoUrl} poster={getThumbnailUrl(boulder)} isVisible={open} />
                )}
                {!isYouTube && !isVimeo && !isDirectVideo && (
                  <div className="w-full h-full flex items-center justify-center flex-col gap-4 p-4">
                    <Video className="w-12 h-12 text-[#13112B]/40" />
                    <div className="text-center">
                      <p className="text-sm text-[#13112B]/60 mb-2">
                        Video kann nicht direkt angezeigt werden
                      </p>
                      <Button 
                        variant="outline" 
                        className="h-9 rounded-xl border-[#E7F7E9] text-[#13112B] hover:bg-[#E7F7E9]"
                        onClick={() => window.open(videoUrl, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Video öffnen
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Notes Section */}
            {boulder.note && (
              <div className="rounded-xl border border-[#E7F7E9] bg-[#F9FAF9] p-3 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-lg grid place-items-center bg-[#E7F7E9] text-[#36B531] flex-shrink-0">
                    <FileText className="w-3.5 h-3.5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#13112B] mb-1">Notizen</p>
                    <p className="text-sm text-[#13112B]/60 break-words">{boulder.note}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
