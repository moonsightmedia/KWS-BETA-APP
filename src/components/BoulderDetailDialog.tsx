import { useEffect, useRef, useState } from 'react';
import { formatDate } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  BarChart3,
  Calendar,
  MapPin,
  Maximize2,
  Minimize2,
  Target,
  Video,
} from 'lucide-react';

import { BoulderBetaPreview, BoulderStatsPanel, BoulderTrackingPanel } from '@/components/BoulderCommunityPanel';
import {
  BoulderVideoPlayer,
  getVimeoEmbedUrl,
  getYouTubeEmbedUrl,
  isVimeoUrl,
  isYouTubeUrl,
} from '@/components/boulder/BoulderVideoPlayer';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';
import { cn } from '@/lib/utils';
import { getColorBackgroundStyle } from '@/utils/colorUtils';
import { Boulder } from '@/types/boulder';

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
            Details fÃ¼r Boulder {boulder.name} - {boulder.color} Â· Grad {boulder.difficulty === null ? '?' : boulder.difficulty} Â· {boulder.sector}
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
              title={`${boulder.color} Â· Grad ${boulder.difficulty === null ? '?' : boulder.difficulty}`}
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
                        {boulder.color} Â· Grad {boulder.difficulty === null ? '?' : boulder.difficulty}
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
                        <BoulderVideoPlayer
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
                              Video Ã¶ffnen
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
                      {boulder.color} Â· Grad {boulder.difficulty === null ? '?' : boulder.difficulty}
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
                      <BoulderVideoPlayer
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
                            Video Ã¶ffnen
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

