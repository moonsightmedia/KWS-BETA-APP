import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  BarChart3,
  BadgeCheck,
  CalendarDays,
  Image as ImageIcon,
  MapPin,
  Maximize2,
  Minimize2,
  Target,
  Video,
  X,
} from 'lucide-react';

import { BoulderBetaPreview, BoulderStatsPanel, BoulderTrackingPanel } from '@/components/BoulderCommunityPanel';
import { DifficultyBadge } from '@/components/boulder/DifficultyBadge';
import {
  BoulderVideoPlayer,
  getVimeoEmbedUrl,
  getYouTubeEmbedUrl,
  isVimeoUrl,
  isYouTubeUrl,
} from '@/components/boulder/BoulderVideoPlayer';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';
import type { Boulder } from '@/types/boulder';
import { getBoulderColorBackgroundStyle, getBoulderColorLabel } from '@/utils/colorUtils';

interface BoulderDetailDialogProps {
  boulder: Boulder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DetailTab = 'beta' | 'tracking' | 'stats';

const tabItems = [
  { value: 'beta' as const, label: 'Beta', icon: Video },
  { value: 'tracking' as const, label: 'Tracking', icon: Target },
  { value: 'stats' as const, label: 'Stats', icon: BarChart3 },
];

function getThumbnailUrl(boulder: Boulder): string | undefined {
  if (!boulder.thumbnailUrl) return undefined;

  return boulder.thumbnailUrl.includes('cdn.kletterwelt-sauerland.de/uploads/videos/')
    ? boulder.thumbnailUrl.replace('/uploads/videos/', '/uploads/')
    : boulder.thumbnailUrl;
}

export const BoulderDetailDialog = ({ boulder, open, onOpenChange }: BoulderDetailDialogProps) => {
  const { user, loading: authLoading } = useAuth();
  const { data: colors } = useColors();
  const mediaFrameRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>('beta');

  const videoUrl = boulder?.betaVideoUrls?.hd
    || boulder?.betaVideoUrls?.sd
    || boulder?.betaVideoUrls?.low
    || boulder?.betaVideoUrl;
  const hasVideo = Boolean(videoUrl);
  const isYouTube = videoUrl ? isYouTubeUrl(videoUrl) : false;
  const isVimeo = videoUrl ? isVimeoUrl(videoUrl) : false;
  const isDirectVideo = Boolean(videoUrl && !isYouTube && !isVimeo);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (open) setActiveTab('beta');
  }, [boulder?.id, open]);

  const toggleFullscreen = async () => {
    const mediaFrame = mediaFrameRef.current;
    if (!mediaFrame) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await mediaFrame.requestFullscreen();
      }
    } catch (error) {
      console.error('Vollbild konnte nicht umgeschaltet werden:', error);
    }
  };

  if (!boulder) return null;

  const thumbnailUrl = getThumbnailUrl(boulder);
  const showCommunityTabs = Boolean(user) && !authLoading;
  const sectorLabel = boulder.sector2 ? `${boulder.sector} → ${boulder.sector2}` : boulder.sector;
  const colorLabel = getBoulderColorLabel(boulder.color, boulder.color2);

  const betaContent = (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(17rem,21rem)_minmax(0,1fr)] lg:gap-5">
      <section className="lg:sticky lg:top-3">
        <div
          ref={mediaFrameRef}
          className="relative mx-auto aspect-[4/5] w-full max-w-[22rem] overflow-hidden rounded-kws-card bg-[#EAF1EB] shadow-[0_10px_28px_rgba(19,17,43,0.11)] lg:max-w-none"
        >
          {videoUrl && isYouTube && (
            <iframe
              src={open && activeTab === 'beta' ? getYouTubeEmbedUrl(videoUrl) : undefined}
              className="h-full w-full"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              loading="lazy"
              title={`Beta-Video für ${boulder.name}`}
            />
          )}

          {videoUrl && isVimeo && (
            <iframe
              src={open && activeTab === 'beta' ? getVimeoEmbedUrl(videoUrl) : undefined}
              className="h-full w-full"
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              loading="lazy"
              title={`Beta-Video für ${boulder.name}`}
            />
          )}

          {isDirectVideo && (
            <BoulderVideoPlayer
              betaVideoUrls={boulder.betaVideoUrls}
              betaVideoUrl={boulder.betaVideoUrl}
              poster={thumbnailUrl}
              isVisible={open && activeTab === 'beta'}
              showOfficialBadge
              className="h-full w-full"
            />
          )}

          {!hasVideo && thumbnailUrl && (
            <img
              src={thumbnailUrl}
              alt={`Startgriffe von ${boulder.name}`}
              className="h-full w-full object-cover"
            />
          )}

          {!hasVideo && !thumbnailUrl && (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-kws-control bg-white text-primary shadow-[0_4px_16px_rgba(19,17,43,0.08)]">
                <ImageIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Noch kein Bild vorhanden</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Foto und Beta werden ergänzt, sobald sie verfügbar sind.</p>
              </div>
            </div>
          )}

          {!hasVideo && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white via-white/[0.92] to-transparent px-3 pb-3 pt-14">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-kws-badge bg-primary text-white">
                  <Video className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="text-xs font-bold text-foreground">Noch kein Beta-Video</p>
                  <p className="text-[10px] text-muted-foreground">Das Boulderfoto bleibt trotzdem sichtbar.</p>
                </div>
              </div>
            </div>
          )}

          {!isDirectVideo ? (
            <div className="absolute left-2.5 top-2.5 flex h-8 items-center gap-1.5 rounded-kws-badge border border-white/70 bg-white/[0.94] px-2.5 text-[10px] font-semibold text-[#192436] shadow-[0_3px_12px_rgba(19,17,43,0.16)] backdrop-blur-sm">
              <BadgeCheck className="h-3.5 w-3.5 text-primary" />
              Offizielle Beta
            </div>
          ) : null}

          {hasVideo && !isDirectVideo && (
            <button
              type="button"
              onClick={toggleFullscreen}
              className="absolute right-2.5 top-2.5 grid h-9 w-9 place-items-center rounded-kws-control border border-white/70 bg-white/[0.94] text-[#192436] shadow-[0_3px_12px_rgba(19,17,43,0.16)] backdrop-blur-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              aria-label={isFullscreen ? 'Vollbild beenden' : 'Video im Vollbild anzeigen'}
              title={isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          )}
        </div>
      </section>

      <div className="min-w-0 [&_.rounded-2xl]:!rounded-kws-card [&_.rounded-xl]:!rounded-kws-control">
        <BoulderBetaPreview boulder={boulder} />
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!bottom-auto !left-1/2 !right-auto !top-1/2 !flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] !-translate-x-1/2 !-translate-y-1/2 flex-col gap-0 overflow-hidden rounded-kws-card border border-border/75 bg-background p-0 shadow-[0_24px_70px_rgba(19,17,43,0.23)] sm:max-h-[min(90dvh,860px)] sm:max-w-[68rem] [&>button]:hidden">
        <DialogHeader className="relative shrink-0 border-b border-border/70 bg-background px-4 py-3 pr-14 text-left sm:px-5 sm:py-4 sm:pr-16">
          <DialogDescription className="sr-only">
            Details für Boulder {boulder.name}, Grad {boulder.difficulty ?? '?'}, {sectorLabel}
          </DialogDescription>

          <div className="flex min-w-0 items-center gap-3">
            <DifficultyBadge
              color={boulder.color}
              color2={boulder.color2}
              difficulty={boulder.difficulty}
              colors={colors}
              className="!static h-11 min-w-11 shrink-0 border border-border/70 shadow-[0_3px_12px_rgba(19,17,43,0.10)]"
            />

            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-[2px] border border-black/10"
                  style={getBoulderColorBackgroundStyle(boulder.color, boulder.color2, colors || [])}
                  aria-hidden="true"
                />
                <span className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                  {colorLabel}
                </span>
              </div>
              <DialogTitle className="mt-0.5 truncate font-heading text-lg font-bold leading-tight text-foreground sm:text-xl">
                {boulder.name}
              </DialogTitle>
              <div className="mt-1 flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground sm:text-xs">
                <span className="flex min-w-0 items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0 text-primary" />
                  <span className="truncate">{sectorLabel}</span>
                </span>
                <span aria-hidden="true">·</span>
                <span className="flex shrink-0 items-center gap-1">
                  <CalendarDays className="h-3 w-3 text-primary" />
                  {format(boulder.createdAt, 'dd. MMM yyyy', { locale: de })}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-kws-control bg-secondary text-foreground transition-colors hover:bg-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:right-4"
            aria-label="Boulder-Details schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        {showCommunityTabs ? (
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as DetailTab)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="shrink-0 border-b border-border/55 bg-background px-3 py-2.5 sm:px-5">
              <TabsList className="grid h-11 w-full grid-cols-3 rounded-kws-control bg-secondary p-1">
                {tabItems.map(({ value, label, icon: Icon }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="h-9 gap-1.5 rounded-kws-badge text-xs font-semibold text-muted-foreground shadow-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none sm:text-sm"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:px-5 sm:py-4">
              <TabsContent value="beta" className="m-0 focus-visible:outline-none">
                {betaContent}
              </TabsContent>
              <TabsContent value="tracking" className="m-0 focus-visible:outline-none [&_.rounded-2xl]:!rounded-kws-card [&_.rounded-xl]:!rounded-kws-control">
                <BoulderTrackingPanel boulder={boulder} />
              </TabsContent>
              <TabsContent value="stats" className="m-0 focus-visible:outline-none [&_.rounded-2xl]:!rounded-kws-card [&_.rounded-xl]:!rounded-kws-control">
                <BoulderStatsPanel boulder={boulder} />
              </TabsContent>
            </div>
          </Tabs>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:px-5 sm:py-4">
            {betaContent}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
