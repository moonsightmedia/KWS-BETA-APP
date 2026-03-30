import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, Play, Video } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

import { BoulderBetaTab, BoulderInfoTab, BoulderTrackTab } from '@/components/boulder/BoulderDetailSections';
import { useSidebar } from '@/components/SidebarContext';
import { useAuth } from '@/hooks/useAuth';
import { useBouldersWithSectors } from '@/hooks/useBoulders';
import { cn } from '@/lib/utils';
import type { Boulder } from '@/types/boulder';

const tabs = ['Info', 'Track', 'Beta'] as const;
type DetailTab = (typeof tabs)[number];

const gradeTextByColor: Record<string, string> = {
  'Grün': 'text-white',
  'Gelb': 'text-black',
  'Blau': 'text-white',
  'Orange': 'text-black',
  'Rot': 'text-white',
  'Weiß': 'text-black',
  'Lila': 'text-white',
};


function getThumbnailUrl(boulder: Boulder) {
  if (boulder.thumbnailUrl) {
    let url = boulder.thumbnailUrl;
    if (url.includes('cdn.kletterwelt-sauerland.de/uploads/videos/')) {
      url = url.replace('/uploads/videos/', '/uploads/');
    }
    return url;
  }

  return 'data:image/svg+xml;base64,PHN2uyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpuHRoPSIxMjAwIiBouWlnaHQ9IjEyMDAiIGupbGw9Im5vbmUiPjxyuWN0IHdpuHRoPSIxMjAwIiBouWlnaHQ9IjEyMDAiIGupbGw9IiNFQUVBRUEiIHJ4PSIzIi8+PGcgb3BhY2l0eT0iLjUiPjxwYXRoIGupbGw9IiNGQUuBRkEiIGQ9Ik02MDAuNzA5IDczNi41Yy03NS40NTQgMC0xMzYuNjIxLTYxLjE2Ny0xMzYuNjIxLTEzNi42MiAwLTc1LjQ1NCA2MS4xNjctMTM2LjYyMSAxMzYuNjIxLTEzNi42MjEgNzUuNDUzIDAgMTM2LjYyIDYxLjE2NyAxMzYuNjIgMTM2LjYyMSAwIDc1LjQ1My02MS4xNjcgMTM2LjYyLTEzNi42MiAxMzYuNjJaIi8+PHBhdGggc3Ryb2tlPSIjQzlDOUM5IiBzdHJva2Utd2lkdGg9IjIuNDE4IiBkPSJNNjAwLjcwOSA3MzYuNWMtNzUuNDU0IDAtMTM2LjYyMS02MS4xNjctMTM2LjYyMS0xMzYuNjIgMC03NS40NTQgNjEuMTY3LTEzNi42MjEgMTM2LjYyMS0xMzYuNjIxIDc1LjQ1MyAwIDEzNi42MiA2MS4xNjcgMTM2LjYyIDEzNi42MjEgMCA3NS40NTMtNjEuMTY3IDEzNi42Mi0xMzYuNjIgMTM2LjYyWiIvPjwvuz48L3N2uz4=';
}

export default function BoulderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isExpanded } = useSidebar();
  const { user, loading: authLoading } = useAuth();
  const { data: boulders, isLoading } = useBouldersWithSectors(!authLoading);
  const [activeTab, setActiveTab] = useState<DetailTab>('Info');
  const tabAnchorRef = useRef<HTMLDivElement>(null);

  const boulder = useMemo(() => boulders?.find((entry) => entry.id === id), [boulders, id]);
  const videoUrl = boulder?.betaVideoUrls?.hd || boulder?.betaVideoUrls?.sd || boulder?.betaVideoUrls?.low || boulder?.betaVideoUrl;
  const availableTabs = useMemo(() => (user ? tabs : (['Info', 'Beta'] as const)), [user]);

  useEffect(() => {
    if (!availableTabs.includes(activeTab as (typeof availableTabs)[number])) {
      setActiveTab('Info');
    }
  }, [activeTab, availableTabs]);

  useEffect(() => {
    const anchorTop = tabAnchorRef.current?.offsetTop;
    if (anchorTop === undefined) return;

    window.scrollTo({
      top: Math.max(anchorTop - 108, 0),
      behavior: 'smooth',
    });
  }, [activeTab]);

  const renderTabContent = () => {
    if (!boulder) return null;
    if (activeTab === 'Track') return <BoulderTrackTab boulder={boulder} />;
    if (activeTab === 'Beta') return <BoulderBetaTab boulder={boulder} />;
    return <BoulderInfoTab boulder={boulder} />;
  };

  if (isLoading || authLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <div className={cn('flex min-w-0 flex-1 flex-col bg-background', isExpanded ? 'md:ml-64' : 'md:ml-20')}>
          <div className="fixed inset-x-0 top-0 z-10 border-b border-border bg-background/80 px-4 pb-3 pt-12 backdrop-blur-xl md:left-auto">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 animate-pulse rounded-xl bg-secondary" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-5 w-40 animate-pulse rounded bg-secondary" />
                <div className="h-3 w-32 animate-pulse rounded bg-secondary" />
              </div>
            </div>
          </div>
          <div className="px-4 pb-24 pt-28">
            <div className="aspect-[9/16] max-h-[60vh] animate-pulse rounded-2xl bg-secondary sm:mx-auto sm:max-w-md" />
            <div className="mt-4 h-12 animate-pulse rounded-xl bg-secondary" />
            <div className="mt-4 h-64 animate-pulse rounded-2xl bg-secondary" />
          </div>
        </div>
      </div>
    );
  }

  if (!boulder) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center text-muted-foreground">
        Boulder nicht gefunden.
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <div className={cn('flex min-w-0 flex-1 flex-col bg-background', isExpanded ? 'md:ml-64' : 'md:ml-20')}>
        <div className="fixed inset-x-0 top-0 z-10 border-b border-border bg-background/80 px-4 pb-3 pt-12 backdrop-blur-xl md:left-auto">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/boulders')}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary"
              aria-label="uurueck"
            >
              <ArrowLeft className="h-4 w-4 text-foreground" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold text-foreground">{boulder.name}</h1>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn('rounded-md px-2 py-0.5 text-xs font-bold', gradeTextByColor[boulder.color] || 'text-white')}
                  style={{ backgroundColor: `${boulder.colorHex || '#36B531'}33` }}
                >
                  {boulder.difficulty === null ? '?' : boulder.difficulty}
                </span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">{boulder.sector2 ? `${boulder.sector} → ${boulder.sector2}` : boulder.sector}</span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">{format(boulder.createdAt, 'dd. MMM yyyy', { locale: de })}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-28" />

        <div className="px-4">
          <div className="relative mx-auto flex aspect-[9/16] max-h-[60vh] items-center justify-center overflow-hidden rounded-2xl bg-secondary sm:max-w-md">
            {videoUrl ? (
              <video
                src={videoUrl}
                controls
                playsInline
                preload="metadata"
                poster={getThumbnailUrl(boulder)}
                className="h-full w-full object-cover"
              />
            ) : (
              <>
                <div
                  className="absolute inset-0 opacity-20"
                  style={{ background: `linear-gradient(135deg, ${boulder.colorHex || '#36B531'}44, transparent)` }}
                />
                <div className="relative flex flex-col items-center gap-2">
                  <button type="button" className="flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30">
                    <Play className="ml-0.5 h-6 w-6 text-primary-foreground" />
                  </button>
                  <span className="text-xs text-muted-foreground">Offizielle Beta</span>
                </div>
              </>
            )}

            <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-lg bg-background/70 px-2.5 py-1 backdrop-blur-sm">
              <BadgeCheck className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-semibold text-foreground">Offizielle Beta</span>
            </div>

            {!videoUrl && (
              <div className="absolute inset-x-0 bottom-6 flex justify-center">
                <div className="flex items-center gap-2 rounded-full bg-background/78 px-3 py-1.5 backdrop-blur-sm">
                  <Video className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[10px] font-semibold text-foreground">Noch kein Video vorhanden</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div ref={tabAnchorRef} className="h-0" />

        <div className="sticky top-[6.75rem] z-[9] bg-background px-4 pb-2 pt-2">
          <div className="flex gap-1 rounded-xl bg-secondary p-1">
            {availableTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                className={cn(
                  'flex-1 rounded-lg py-2 text-sm font-semibold transition-all',
                  activeTab === tab ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'text-muted-foreground',
                )}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 px-4 pb-[calc(7rem+env(safe-area-inset-bottom,0px))]">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}

