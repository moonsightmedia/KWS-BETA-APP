import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { readBoulderOrigin } from '@/lib/boulderNavigation';
import { useRetainedBoulderOrigin } from '@/components/BoulderRouteContinuity';
import { BadgeCheck } from 'lucide-react';
import { BetaPlaceholder } from '@/components/boulder/BetaPlaceholder';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

import { BoulderBetaTab, BoulderInfoTab, BoulderTrackTab } from '@/components/boulder/BoulderDetailSections';
import { DifficultyBadge } from '@/components/boulder/DifficultyBadge';
import {
  BoulderVideoPlayer,
  getVimeoEmbedUrl,
  getYouTubeEmbedUrl,
  isVimeoUrl,
  isYouTubeUrl,
} from '@/components/boulder/BoulderVideoPlayer';
import { DashboardPageLayout } from '@/components/DashboardPageLayout';
import { useAuth } from '@/hooks/useAuth';
import { useBouldersWithSectors } from '@/hooks/useBoulders';
import { useColors } from '@/hooks/useColors';
import type { Boulder } from '@/types/boulder';
import { KwsSegmentedControl } from '@/components/ui/kws-segmented-control';
import { ContentSafetyActions } from '@/components/ContentSafetyActions';
import { ExternalBetaVideo } from '@/components/boulder/ExternalBetaVideo';

const tabs = ['Info', 'Track', 'Beta'] as const;
type DetailTab = (typeof tabs)[number];


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
  const location = useLocation();
  const navigate = useNavigate();
  const hasRetainedOrigin = useRetainedBoulderOrigin();
  const { user, loading: authLoading } = useAuth();
  const { data: colors } = useColors();
  const { data: boulders, isLoading } = useBouldersWithSectors(!authLoading);
  const [activeTab, setActiveTab] = useState<DetailTab>('Info');
  const [tabContentMinHeight, setTabContentMinHeight] = useState<number>(0);
  const tabBarRef = useRef<HTMLDivElement>(null);
  const tabContentRef = useRef<HTMLDivElement>(null);

  const boulder = useMemo(() => boulders?.find((entry) => entry.id === id), [boulders, id]);
  const videoUrl = boulder?.betaVideoUrls?.hd || boulder?.betaVideoUrls?.sd || boulder?.betaVideoUrls?.low || boulder?.betaVideoUrl;
  const isYouTube = videoUrl ? isYouTubeUrl(videoUrl) : false;
  const isVimeo = videoUrl ? isVimeoUrl(videoUrl) : false;
  const isDirectVideo = Boolean(videoUrl && !isYouTube && !isVimeo);
  const availableTabs = useMemo(() => (user ? tabs : (['Info', 'Beta'] as const)), [user]);

  const getScrollContainer = useCallback(() => {
    const detailLayer = document.querySelector<HTMLElement>('[data-boulder-detail-scroll]');
    if (detailLayer) return detailLayer;
    const candidates = [
      document.body,
      document.scrollingElement,
      document.documentElement,
    ].filter((element): element is HTMLElement => element instanceof HTMLElement);

    return candidates.reduce((largest, candidate) => {
      const largestScrollableHeight = largest.scrollHeight - largest.clientHeight;
      const candidateScrollableHeight = candidate.scrollHeight - candidate.clientHeight;
      return candidateScrollableHeight > largestScrollableHeight ? candidate : largest;
    }, candidates[0] ?? document.body);
  }, []);

  const scrollPageTo = useCallback((top: number, behavior: ScrollBehavior) => {
    const targetTop = Math.max(top, 0);
    const scrollContainer = getScrollContainer();

    scrollContainer.scrollTo({
      top: targetTop,
      behavior,
    });

    if (scrollContainer.hasAttribute('data-boulder-detail-scroll')) return;

    document.documentElement.scrollTo({
      top: targetTop,
      behavior,
    });

    window.scrollTo({
      top: targetTop,
      behavior,
    });
  }, [getScrollContainer]);

  const scrollTabsIntoView = useCallback(() => {
    const tabBar = tabBarRef.current;
    if (!tabBar) return;
    const scrollContainer = getScrollContainer();
    const stickyTop = Number.parseFloat(window.getComputedStyle(tabBar).top || '0') || 0;
    const currentScrollTop = scrollContainer.scrollTop;
    const naturalTop = currentScrollTop + tabBar.getBoundingClientRect().top;
    const targetTop = naturalTop - stickyTop;

    scrollPageTo(targetTop, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
  }, [getScrollContainer, scrollPageTo]);

  useLayoutEffect(() => {
    const updateTabContentMinHeight = () => {
      const scrollContainer = getScrollContainer();
      const tabBar = tabBarRef.current;
      const tabContent = tabContentRef.current;

      if (!tabBar || !tabContent) return;

      const stickyTop = Number.parseFloat(window.getComputedStyle(tabBar).top || '0') || 0;
      const naturalTop = scrollContainer.scrollTop + tabBar.getBoundingClientRect().top;
      const prefixHeight = scrollContainer.scrollHeight - tabContent.offsetHeight;
      const requiredMinHeight = Math.max(0, Math.ceil(window.innerHeight + (naturalTop - stickyTop) - prefixHeight));

      setTabContentMinHeight((currentMinHeight) =>
        currentMinHeight === requiredMinHeight ? currentMinHeight : requiredMinHeight,
      );
    };

    const resizeObserver = new ResizeObserver(() => {
      updateTabContentMinHeight();
    });

    if (tabBarRef.current) {
      resizeObserver.observe(tabBarRef.current);
    }

    if (tabContentRef.current) {
      resizeObserver.observe(tabContentRef.current);
    }

    updateTabContentMinHeight();
    window.addEventListener('resize', updateTabContentMinHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateTabContentMinHeight);
    };
  }, [activeTab, getScrollContainer, id]);

  useEffect(() => {
    if (!availableTabs.includes(activeTab as (typeof availableTabs)[number])) {
      setActiveTab('Info');
    }
  }, [activeTab, availableTabs]);

  useLayoutEffect(() => {
    scrollPageTo(0, 'auto');
  }, [id, scrollPageTo]);

  const renderTabContent = () => {
    if (!boulder) return null;
    if (activeTab === 'Track') return <BoulderTrackTab boulder={boulder} />;
    if (activeTab === 'Beta') return <BoulderBetaTab boulder={boulder} />;
    return <BoulderInfoTab boulder={boulder} />;
  };

  const origin = readBoulderOrigin(location.state);
  const backDestination = origin ? origin.pathname + origin.search + origin.hash : user ? '/boulders' : '/guest';
  const backLabel = origin?.pathname === '/' || origin?.pathname === '/app' ? 'Zurück zur Startseite' : 'Zurück zur Boulderübersicht';
  const goBack = () => hasRetainedOrigin ? navigate(-1) : navigate(backDestination, { replace: true });

  if (isLoading || authLoading) {
    return (
      <DashboardPageLayout
        headerBackTo={backDestination}
        headerBackLabel={backLabel}
        onHeaderBack={goBack}
        mainClassName="pt-4 md:pt-6"
      >
        <div className="mb-4 space-y-2">
          <div className="h-6 w-52 animate-pulse rounded-kws-badge bg-secondary" />
          <div className="h-4 w-72 max-w-full animate-pulse rounded-kws-badge bg-secondary" />
        </div>
        <div className="lg:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-x-8 xl:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] xl:gap-x-10">
          <div className="aspect-[9/16] max-h-[min(60vh,720px)] animate-pulse rounded-kws-card bg-secondary sm:mx-auto sm:max-w-md lg:mx-0 lg:max-h-[calc(100vh-8rem)] lg:max-w-none" />
          <div className="mt-4 space-y-4 lg:mt-0">
            <div className="h-12 animate-pulse rounded-kws-card bg-secondary" />
            <div className="h-64 animate-pulse rounded-kws-card bg-secondary" />
          </div>
        </div>
      </DashboardPageLayout>
    );
  }

  if (!boulder) {
    return (
      <DashboardPageLayout
        headerBackTo={backDestination}
        headerBackLabel={backLabel}
        onHeaderBack={goBack}
        mainClassName="flex items-center justify-center"
      >
        <div className="w-full max-w-md rounded-kws-card bg-card p-6 text-center text-sm text-muted-foreground shadow-[0_3px_14px_rgba(19,17,43,0.07)]">
          Boulder nicht gefunden.
        </div>
      </DashboardPageLayout>
    );
  }

  return (
    <DashboardPageLayout
      headerBackTo={backDestination}
      headerBackLabel={backLabel}
      onHeaderBack={goBack}
      mainClassName="pt-4 md:pt-6"
    >
      <section className="mb-4 min-w-0" aria-labelledby="boulder-detail-title">
        <h2
          id="boulder-detail-title"
          className="truncate font-sans text-xl font-semibold tracking-[-0.03em] text-[#192436] md:text-2xl"
        >
          {boulder.name}
        </h2>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <DifficultyBadge
            color={boulder.color}
            color2={boulder.color2}
            colorHex={boulder.colorHex}
            difficulty={boulder.difficulty}
            colors={colors}
            variant="detail"
          />
          <span className="text-xs text-muted-foreground" aria-hidden="true">·</span>
          <span className="text-xs font-medium text-muted-foreground">
            {boulder.sector2 ? `${boulder.sector} → ${boulder.sector2}` : boulder.sector}
          </span>
          <span className="text-xs text-muted-foreground" aria-hidden="true">·</span>
          <span className="text-xs text-muted-foreground">{format(boulder.createdAt, 'dd. MMM yyyy', { locale: de })}</span>
        </div>
      </section>

      <div className="lg:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-x-8 xl:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] xl:gap-x-10">
        <section className="lg:sticky lg:top-[calc(5.75rem+var(--app-safe-area-top))] lg:self-start" aria-label="Boulder-Video">
          <div className="relative mx-auto flex aspect-[9/16] max-h-[min(60vh,720px)] w-full max-w-md items-center justify-center overflow-hidden rounded-kws-card bg-secondary shadow-[0_3px_14px_rgba(19,17,43,0.08)] lg:mx-0 lg:max-h-[calc(100vh-8rem)] lg:max-w-none">
            {videoUrl ? (
              isYouTube ? (
                <ExternalBetaVideo key={videoUrl} src={getYouTubeEmbedUrl(videoUrl)} provider="YouTube" />
              ) : isVimeo ? (
                <ExternalBetaVideo key={videoUrl} src={getVimeoEmbedUrl(videoUrl)} provider="Vimeo" />
              ) : (
                <BoulderVideoPlayer
                  key={boulder.id}
                  betaVideoUrls={boulder.betaVideoUrls}
                  betaVideoUrl={boulder.betaVideoUrl}
                  poster={getThumbnailUrl(boulder)}
                  isVisible={isDirectVideo}
                  showOfficialBadge
                  className="h-full w-full"
                />
              )
            ) : (
              <BetaPlaceholder thumbnailUrl={boulder.thumbnailUrl ? getThumbnailUrl(boulder) : undefined} boulderName={boulder.name} />
            )}

            {videoUrl && !isDirectVideo ? (
              <div className="absolute left-2.5 top-2.5 z-20 flex h-8 items-center gap-1.5 rounded-kws-badge border border-white/70 bg-white/[0.94] px-2.5 text-[#192436] shadow-[0_3px_12px_rgba(19,17,43,0.16)] backdrop-blur-sm">
                <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-semibold">Offizielle Beta</span>
              </div>
            ) : null}

          </div>
        </section>

        <section className="mt-4 min-w-0 lg:mt-0">
          <div
            ref={tabBarRef}
            data-detail-tab-bar
            className="sticky top-[calc(4.25rem+var(--app-safe-area-top))] z-20 bg-[#F9FAF9] pb-2 pt-2 md:top-[calc(4.5rem+var(--app-safe-area-top))]"
          >
            <KwsSegmentedControl
              value={activeTab}
              options={availableTabs.map((tab) => ({ value: tab, label: tab }))}
              ariaLabel="Boulder-Inhalt"
              onValueChange={(tab) => {
                setActiveTab(tab);
                window.requestAnimationFrame(() => {
                  window.requestAnimationFrame(() => {
                    scrollTabsIntoView();
                  });
                });
              }}
            />
          </div>

          <div
            ref={tabContentRef}
            className="mt-3 pb-[calc(7rem+env(safe-area-inset-bottom,0px))]"
            style={{ minHeight: `${tabContentMinHeight}px` }}
          >
            {renderTabContent()}
          </div>
        </section>
      </div>
      <ContentSafetyActions kind="boulder" targetId={boulder.id} />
    </DashboardPageLayout>
  );
}

