import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowDown, ArrowUp, ArrowUpDown, Bookmark, ChevronDown, ChevronRight, ChevronsDown, ChevronsUp, Grid3X3, List, Map as MapIcon, Search, SlidersHorizontal, Sparkles, Star, X } from 'lucide-react';
import { BoulderFilterControls, BoulderFilterPanel, BoulderSortPanel, FilterOption } from '@/components/boulder/BoulderFilterControls';
import { DashboardHeader } from '@/components/DashboardHeader';
import { HallMapView } from '@/components/HallMapView';
import { useSidebar } from '@/components/SidebarContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useBoulderRatingSummaries, useMyTrackedBoulders } from '@/hooks/useBoulderCommunity';
import { useBouldersWithSectors } from '@/hooks/useBoulders';
import { useColors } from '@/hooks/useColors';
import { useHorizontalRouteSwipe } from '@/hooks/useHorizontalRouteSwipe';
import { useSectorsTransformed } from '@/hooks/useSectors';
import { cn } from '@/lib/utils';
import { DifficultyBadge } from '@/components/boulder/DifficultyBadge';
import { Boulder } from '@/types/boulder';
import { matchesBoulderColorFilter } from '@/utils/colorUtils';
const STORAGE_KEY_BOULDER_VIEW = 'boulder_view_mode';
const SECTOR_AREA_ORDER = ['Bug', 'Couch-Ecke', 'Top-Out', 'Lange Platte', 'Grotte'];

type BoulderViewMode = 'list' | 'grid';

const getStoredBoulderView = (): BoulderViewMode => {
  try {
    return localStorage.getItem(STORAGE_KEY_BOULDER_VIEW) === 'grid' ? 'grid' : 'list';
  } catch {
    return 'list';
  }
};

const getSectorAreaName = (sectorName: string) => sectorName.replace(/\s+[A-D]$/, '');

const getSectorAreaLabel = (boulder: Boulder) => {
  const primaryArea = getSectorAreaName(boulder.sector);
  if (!boulder.sector2) return primaryArea;

  const secondaryArea = getSectorAreaName(boulder.sector2);
  return primaryArea === secondaryArea ? primaryArea : `${primaryArea} · ${secondaryArea}`;
};

const compareSectorAreaNames = (firstArea: string, secondArea: string) => {
  const firstIndex = SECTOR_AREA_ORDER.indexOf(firstArea);
  const secondIndex = SECTOR_AREA_ORDER.indexOf(secondArea);

  if (firstIndex !== -1 || secondIndex !== -1) {
    if (firstIndex === -1) return 1;
    if (secondIndex === -1) return -1;
    return firstIndex - secondIndex;
  }

  return firstArea.localeCompare(secondArea, 'de');
};

const getGroupDateBoundary = (areaBoulders: Boulder[], order: 'asc' | 'desc') => {
  const timestamps = areaBoulders
    .map((boulder) => boulder.createdAt.getTime())
    .filter(Number.isFinite);

  if (timestamps.length === 0) return 0;
  return order === 'desc' ? Math.max(...timestamps) : Math.min(...timestamps);
};

const sortOptions = [
  { key: 'date-desc', label: 'Neueste zuerst' },
  { key: 'date-asc', label: 'Älteste zuerst' },
  { key: 'difficulty-asc', label: 'Grad aufsteigend' },
  { key: 'difficulty-desc', label: 'Grad absteigend' },
  { key: 'name-asc', label: 'Name A-Z' },
  { key: 'name-desc', label: 'Name Z-A' },
] as const;

const Boulders = () => {
  const { isExpanded } = useSidebar();
  const navigate = useNavigate();
  const swipeRef = useHorizontalRouteSwipe({ routes: ['/', '/boulders', '/statistics'] });
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilters, setSectorFilters] = useState<string[]>([]);
  const [difficultyFilters, setDifficultyFilters] = useState<string[]>([]);
  const [colorFilters, setColorFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'difficulty' | 'date'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showOnlyHanging, setShowOnlyHanging] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [viewMode, setViewMode] = useState<BoulderViewMode>(getStoredBoulderView);
  const [collapsedAreaNames, setCollapsedAreaNames] = useState<Set<string>>(() => new Set());
  const headerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const openPanelsRef = useRef({ filters: false, map: false, search: false });

  const colorsQuery = useColors();
  const { data: colors } = colorsQuery;
  const { user, loading: authLoading } = useAuth();
  const queriesEnabled = !authLoading;
  const { data: boulders, isLoading: isLoadingBoulders, error: bouldersError } = useBouldersWithSectors(queriesEnabled);
  const { data: sectors, isLoading: isLoadingSectors } = useSectorsTransformed(queriesEnabled);
  const { data: myTrackedBoulders } = useMyTrackedBoulders();
  const boulderIds = useMemo(() => (boulders ?? []).map((boulder) => boulder.id), [boulders]);
  const { data: boulderRatingSummaries } = useBoulderRatingSummaries(boulderIds);
  const isLoading = isLoadingBoulders || isLoadingSectors;
  const shouldShowPageSkeleton = authLoading && !user;

  useEffect(() => {
    const sectorParam = searchParams.get('sector');
    const showParam = searchParams.get('show');
    const statusParam = searchParams.get('status');
    const publicSectorName = sectors?.find((sector) => sector.legacyName === sectorParam)?.name;
    const resolvedSectorName = publicSectorName || sectorParam;

    setSectorFilters(resolvedSectorName ? [resolvedSectorName] : []);
    setShowNew(showParam === 'new');
    setShowSaved(showParam === 'saved');
    setShowOnlyHanging(statusParam !== 'all');
  }, [searchParams, sectors]);

  useEffect(() => {
    if (searchParams.has('view')) {
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.delete('view');
      setSearchParams(nextSearchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_BOULDER_VIEW, viewMode);
    } catch {
      // The selected view still works for the current session if storage is unavailable.
    }
  }, [viewMode]);

  useEffect(() => {
    if (!authLoading && user) {
      const timeoutId = setTimeout(() => {
        const bouldersQuery = queryClient.getQueryState(['boulders']);
        const sectorsQuery = queryClient.getQueryState(['sectors']);

        if (bouldersQuery?.status === 'pending') {
          queryClient.cancelQueries({ queryKey: ['boulders'] });
          queryClient.refetchQueries({ queryKey: ['boulders'] });
        }

        if (sectorsQuery?.status === 'pending') {
          queryClient.cancelQueries({ queryKey: ['sectors'] });
          queryClient.refetchQueries({ queryKey: ['sectors'] });
        }
      }, 15000);

      return () => clearTimeout(timeoutId);
    }
  }, [authLoading, user, queryClient]);

  const scrollPageToTop = () => {
    const scrollTargets = [
      document.scrollingElement,
      document.documentElement,
      document.body,
    ].filter((element): element is Element => element instanceof Element);

    scrollTargets.forEach((element) => {
      element.scrollTo({ top: 0, behavior: 'smooth' });
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
    headerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useLayoutEffect(() => {
    const justOpened =
      (showFilters && !openPanelsRef.current.filters) ||
      (showMap && !openPanelsRef.current.map) ||
      (showSearch && !openPanelsRef.current.search);

    openPanelsRef.current = { filters: showFilters, map: showMap, search: showSearch };

    if (!justOpened) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollPageToTop();
      });
    });
  }, [showFilters, showMap, showSearch]);

  useEffect(() => {
    if (!showSearch) return;

    const animationFrame = requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [showSearch]);

  const filteredAndSortedBoulders = useMemo(() => {
    if (!boulders) return [];
    const favoriteBoulderIds = new Set(
      (myTrackedBoulders ?? [])
        .filter((item) => item.tick.is_favorite)
        .map((item) => item.tick.boulder_id)
    );
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const filtered = boulders.filter((boulder) => {
      const searchableSector = boulder.sector2 ? `${boulder.sector} · ${boulder.sector2}` : boulder.sector;
      const matchesSearch =
        boulder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        searchableSector.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSector = sectorFilters.length === 0
        || sectorFilters.includes(boulder.sector)
        || Boolean(boulder.sector2 && sectorFilters.includes(boulder.sector2));
      const boulderDifficulty = boulder.difficulty === null ? '?' : String(boulder.difficulty);
      const matchesDifficulty = difficultyFilters.length === 0 || difficultyFilters.includes(boulderDifficulty);
      const matchesColor = colorFilters.length === 0
        || colorFilters.some((colorName) => matchesBoulderColorFilter(boulder.color, boulder.color2, colorName));
      const matchesStatus = showOnlyHanging ? boulder.status === 'haengt' : true;
      const matchesNew = !showNew || boulder.createdAt >= sevenDaysAgo;
      const matchesSaved = !showSaved || favoriteBoulderIds.has(boulder.id);
      return matchesSearch && matchesSector && matchesDifficulty && matchesColor && matchesStatus && matchesNew && matchesSaved;
    });

    filtered.sort((a, b) => {
      let result = 0;
      switch (sortBy) {
        case 'name':
          result = a.name.localeCompare(b.name);
          break;
        case 'difficulty': {
          const aDiff = a.difficulty === null ? 999 : a.difficulty;
          const bDiff = b.difficulty === null ? 999 : b.difficulty;
          result = aDiff - bDiff;
          break;
        }
        case 'date':
          result = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        default:
          result = 0;
      }
      return sortOrder === 'asc' ? result : -result;
    });

    return filtered;
  }, [boulders, colorFilters, difficultyFilters, myTrackedBoulders, searchQuery, sectorFilters, showNew, showOnlyHanging, showSaved, sortBy, sortOrder]);

  const groupedBoulders = useMemo(() => {
    const groups = new Map<string, Boulder[]>();

    filteredAndSortedBoulders.forEach((boulder) => {
      const areaName = getSectorAreaName(boulder.sector) || 'Ohne Bereich';
      const group = groups.get(areaName) ?? [];
      group.push(boulder);
      groups.set(areaName, group);
    });

    return [...groups.entries()]
      .sort(([firstArea, firstBoulders], [secondArea, secondBoulders]) => {
        if (sortBy === 'date') {
          const firstBoundary = getGroupDateBoundary(firstBoulders, sortOrder);
          const secondBoundary = getGroupDateBoundary(secondBoulders, sortOrder);
          const dateComparison = sortOrder === 'desc'
            ? secondBoundary - firstBoundary
            : firstBoundary - secondBoundary;

          if (dateComparison !== 0) return dateComparison;
        }

        return compareSectorAreaNames(firstArea, secondArea);
      })
      .map(([areaName, areaBoulders]) => ({
        areaName,
        boulders: areaBoulders,
        headingId: `boulder-area-${areaName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      }));
  }, [filteredAndSortedBoulders, sortBy, sortOrder]);

  const allGroupsExpanded = groupedBoulders.length > 0
    && groupedBoulders.every((group) => !collapsedAreaNames.has(group.areaName));

  const toggleAreaGroup = (areaName: string) => {
    setCollapsedAreaNames((current) => {
      const next = new Set(current);
      if (next.has(areaName)) next.delete(areaName);
      else next.add(areaName);
      return next;
    });
  };

  const toggleAllAreaGroups = () => {
    setCollapsedAreaNames((current) => {
      const next = new Set(current);
      if (groupedBoulders.every((group) => !next.has(group.areaName))) {
        groupedBoulders.forEach((group) => next.add(group.areaName));
      } else {
        groupedBoulders.forEach((group) => next.delete(group.areaName));
      }
      return next;
    });
  };

  const hallMapBoulders = useMemo(() => {
    if (!boulders) return [];

    return boulders
      .filter((boulder) => {
      const searchableSector = boulder.sector2 ? `${boulder.sector} · ${boulder.sector2}` : boulder.sector;
        const matchesSearch =
          boulder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          searchableSector.toLowerCase().includes(searchQuery.toLowerCase());
        const boulderDifficulty = boulder.difficulty === null ? '?' : String(boulder.difficulty);
        const matchesDifficulty = difficultyFilters.length === 0 || difficultyFilters.includes(boulderDifficulty);
        const matchesColor = colorFilters.length === 0
          || colorFilters.some((colorName) => matchesBoulderColorFilter(boulder.color, boulder.color2, colorName));
        const matchesStatus = showOnlyHanging ? boulder.status === 'haengt' : true;
        return matchesSearch && matchesDifficulty && matchesColor && matchesStatus;
      });
  }, [boulders, colorFilters, difficultyFilters, searchQuery, showOnlyHanging]);

  const hallMapCounts = useMemo(() => {
    return hallMapBoulders.reduce<Record<string, number>>((accumulator, boulder) => {
        const primarySector = boulder.sectorId;
        const secondarySector = boulder.sector2Id;

        if (primarySector) accumulator[primarySector] = (accumulator[primarySector] ?? 0) + 1;
        if (secondarySector) accumulator[secondarySector] = (accumulator[secondarySector] ?? 0) + 1;
        return accumulator;
      }, {});
  }, [hallMapBoulders]);

  const activeSectorLabel = sectorFilters.length === 0
    ? 'Alle Sektoren'
    : sectorFilters.length === 1
      ? sectorFilters[0]
      : `${sectorFilters.length} Sektoren`;
  const activeFilterCount = sectorFilters.length + difficultyFilters.length + colorFilters.length
    + [showNew, showSaved, !showOnlyHanging].filter(Boolean).length;
  const hasCustomSorting = sortBy !== 'date' || sortOrder !== 'desc';

  const clearFilters = () => {
    setSectorFilters([]);
    setDifficultyFilters([]);
    setColorFilters([]);
    setShowNew(false);
    setShowSaved(false);
    setShowOnlyHanging(true);
  };

  const toggleToolbarPanel = (panel: 'filters' | 'sort' | 'map' | 'search') => {
    if (panel === 'search') {
      setShowSearch((prev) => !prev);
      setShowFilters(false);
      setShowSort(false);
      setShowMap(false);
      return;
    }

    if (panel === 'filters') {
      setShowFilters((prev) => !prev);
      setShowSort(false);
      setShowMap(false);
      setShowSearch(false);
      return;
    }

    if (panel === 'sort') {
      setShowSort((prev) => !prev);
      setShowFilters(false);
      setShowMap(false);
      setShowSearch(false);
      return;
    }

    setShowMap((prev) => !prev);
    setShowFilters(false);
    setShowSort(false);
    setShowSearch(false);
  };

  const handleBoulderClick = (boulderId: string) => {
    navigate(`/boulders/${boulderId}`);
  };

  const handleMapSectorSelect = (sectorName: string) => {
    setSectorFilters((current) => current.includes(sectorName)
      ? current.filter((value) => value !== sectorName)
      : [...current, sectorName]);
  };

  const toggleDifficultyFilter = (difficulty: string) => {
    setDifficultyFilters((current) => current.includes(difficulty)
      ? current.filter((value) => value !== difficulty)
      : [...current, difficulty]);
  };

  const toggleColorFilter = (colorName: string) => {
    setColorFilters((current) => current.includes(colorName)
      ? current.filter((value) => value !== colorName)
      : [...current, colorName]);
  };

  const applySortOption = (value: (typeof sortOptions)[number]['key']) => {
    const [nextSortBy, nextSortOrder] = value.split('-') as ['date' | 'name' | 'difficulty', 'asc' | 'desc'];
    setSortBy(nextSortBy);
    setSortOrder(nextSortOrder);
    setShowSort(false);
  };

  const selectedSortOption = `${sortBy}-${sortOrder}` as (typeof sortOptions)[number]['key'];
  const getThumbnailUrl = (boulder: Boulder) => {
    if (boulder.thumbnailUrl) {
      let url = boulder.thumbnailUrl;
      if (url.includes('cdn.kletterwelt-sauerland.de/uploads/videos/')) {
        url = url.replace('/uploads/videos/', '/uploads/');
      }
      return url;
    }

    return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAwIiBoZWlnaHQ9IjEyMDAiIGZpbGw9Im5vbmUiPjxyZWN0IHdpZHRoPSIxMjAwIiBoZWlnaHQ9IjEyMDAiIGZpbGw9IiNFQUVBRUEiIHJ4PSIzIi8+PGcgb3BhY2l0eT0iLjUiPjxwYXRoIGZpbGw9IiNGQUZBRkEiIGQ9Ik02MDAuNzA5IDczNi41Yy03NS40NTQgMC0xMzYuNjIxLTYxLjE2Ny0xMzYuNjIxLTEzNi42MiAwLTc1LjQ1NCA2MS4xNjctMTM2LjYyMSAxMzYuNjIxLTEzNi42MjEgNzUuNDUzIDAgMTM2LjYyIDYxLjE2NyAxMzYuNjIgMTM2LjYyMSAwIDc1LjQ1My02MS4xNjcgMTM2LjYyLTEzNi42MiAxMzYuNjJaIi8+PHBhdGggc3Ryb2tlPSIjQzlDOUM5IiBzdHJva2Utd2lkdGg9IjIuNDE4IiBkPSJNNjAwLjcwOSA3MzYuNWMtNzUuNDU0IDAtMTM2LjYyMS02MS4xNjctMTM2LjYyMS0xMzYuNjIgMC03NS40NTQgNjEuMTY3LTEzNi42MjEgMTM2LjYyMS0xMzYuNjIxIDc1LjQ1MyAwIDEzNi42MiA2MS4xNjcgMTM2LjYyIDEzNi42MjEgMCA3NS40NTMtNjEuMTY3IDEzNi42Mi0xMzYuNjIgMTM2LjYyWiIvPjwvZz48L3N2Zz4=';
  };

  const isNewBoulder = (boulder: Boulder) => {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - 7);
    return boulder.createdAt >= threshold;
  };

  const pageHeader = (
    <DashboardHeader
      ref={headerRef}
      rightSlot={(
        <div className="flex shrink-0 gap-1.5">
          <button
            type='button'
            onClick={() => toggleToolbarPanel('search')}
            className={cn(
              'relative flex h-10 w-10 items-center justify-center rounded-kws-control transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-[0_0_0_3px_rgba(19,17,43,0.18)]',
              showSearch || searchQuery.trim() ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
            )}
            aria-label='Boulder suchen'
            aria-expanded={showSearch}
          >
            <Search className='h-4 w-4' strokeWidth={1.9} />
            {!showSearch && searchQuery.trim() ? (
              <span className='absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-white' aria-hidden='true' />
            ) : null}
          </button>
          <button
            type='button'
            onClick={() => toggleToolbarPanel('map')}
            className={cn(
              'relative flex h-10 w-10 items-center justify-center rounded-kws-control transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45',
              showMap ? 'bg-primary' : 'bg-secondary'
            )}
            aria-label='Karte'
            aria-expanded={showMap}
          >
            <MapIcon className={cn('h-4 w-4', showMap ? 'text-primary-foreground' : 'text-muted-foreground')} strokeWidth={1.9} />
          </button>
          <button
            type='button'
            onClick={() => toggleToolbarPanel('filters')}
            className={cn(
              'relative flex h-10 w-10 items-center justify-center rounded-kws-control transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45',
              showFilters ? 'bg-primary' : 'bg-secondary'
            )}
            aria-label='Filter'
            aria-expanded={showFilters}
          >
            <SlidersHorizontal className={cn('h-4 w-4', showFilters ? 'text-primary-foreground' : 'text-muted-foreground')} strokeWidth={1.9} />
            {activeFilterCount > 0 ? (
              <span className='absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-kws-badge bg-primary px-0.5 text-[9px] font-bold text-primary-foreground'>
                {activeFilterCount}
              </span>
            ) : null}
          </button>
        </div>
      )}
      belowSlot={(showSearch || Boolean(searchQuery.trim()) || activeFilterCount > 0 || showFilters) ? (
        <>
      {showSearch && (
        <div className='relative animate-in slide-in-from-top-2 duration-200'>
          <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            ref={searchInputRef}
            placeholder='Boulder oder Bereich suchen…'
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className='h-10 !rounded-kws-control border-none bg-secondary pl-10 pr-10 text-sm text-foreground shadow-none placeholder:text-muted-foreground focus-visible:!ring-2 focus-visible:!ring-[#192436]/15 focus-visible:!ring-offset-0'
            disabled={isLoading}
          />
          <button
            type='button'
            onClick={() => {
              setSearchQuery('');
              setShowSearch(false);
            }}
            className='absolute right-0 top-0 flex h-10 w-10 items-center justify-center rounded-kws-control text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-[0_0_0_3px_rgba(19,17,43,0.18)]'
            aria-label='Suche schließen'
          >
            <X className='h-4 w-4' />
          </button>
        </div>
      )}

      {(searchQuery.trim() || activeFilterCount > 0) && (
        <div className='-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 hide-scrollbar'>
        {searchQuery.trim() && (
          <button type='button' onClick={() => setSearchQuery('')} className='flex shrink-0 items-center gap-1.5 rounded-kws-control bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground'>
            Suche: {searchQuery.trim()}
            <X className='h-3 w-3' />
          </button>
        )}
        {showNew && (
          <button type='button' onClick={() => setShowNew(false)} className='flex shrink-0 items-center gap-1.5 rounded-kws-control bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground'>
            Neu
            <X className='h-3 w-3' />
          </button>
        )}
        {showSaved && (
          <button type='button' onClick={() => setShowSaved(false)} className='flex shrink-0 items-center gap-1.5 rounded-kws-control bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground'>
            Gespeichert
            <X className='h-3 w-3' />
          </button>
        )}
        {!showMap && sectorFilters.map((sectorName) => (
          <button key={sectorName} type='button' onClick={() => handleMapSectorSelect(sectorName)} className='flex shrink-0 items-center gap-1.5 rounded-kws-control bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground'>
            {sectorName}
            <X className='h-3 w-3' />
          </button>
        ))}
        {difficultyFilters.map((difficulty) => (
          <button key={difficulty} type='button' onClick={() => toggleDifficultyFilter(difficulty)} className='flex shrink-0 items-center gap-1.5 rounded-kws-control bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground'>
            Grad {difficulty}
            <X className='h-3 w-3' />
          </button>
        ))}
        {colorFilters.map((colorName) => (
          <button key={colorName} type='button' onClick={() => toggleColorFilter(colorName)} className='flex shrink-0 items-center gap-1.5 rounded-kws-control bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground'>
            {colorName}
            <X className='h-3 w-3' />
          </button>
        ))}
        {!showOnlyHanging && (
          <button type='button' onClick={() => setShowOnlyHanging(true)} className='flex shrink-0 items-center gap-1.5 rounded-kws-control bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground'>
            Alle Boulder
            <X className='h-3 w-3' />
          </button>
        )}
        </div>
      )}

        <BoulderFilterPanel open={showFilters} onOpenChange={setShowFilters} resultCount={filteredAndSortedBoulders.length}>
          <BoulderFilterControls
            leadingControls={(
              <section aria-label="Schnellfilter">
                <h3 className="mb-3 font-sans text-xs font-semibold text-foreground">Schnellfilter</h3>
                <div className="flex flex-wrap gap-2">
                  <FilterOption selected={showNew} onClick={() => setShowNew((prev) => !prev)}><Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />Neu</FilterOption>
                  <FilterOption selected={showSaved} onClick={() => setShowSaved((prev) => !prev)}><Bookmark className="h-4 w-4 shrink-0" aria-hidden="true" />Gespeichert</FilterOption>
                  <FilterOption selected={!showOnlyHanging} onClick={() => setShowOnlyHanging((prev) => !prev)}>Auch abgeschraubte</FilterOption>
                </div>
              </section>
            )}
            difficulties={difficultyFilters}
            onDifficultyToggle={toggleDifficultyFilter}
            selectedColors={colorFilters}
            onColorToggle={toggleColorFilter}
            colors={colors}
            colorsLoading={colorsQuery.isPending}
            colorsError={colorsQuery.isError}
            onRetryColors={() => void colorsQuery.refetch()}
            activeCount={activeFilterCount}
            onReset={clearFilters}
          />
        </BoulderFilterPanel>

        </>
      ) : undefined}
    />
  );

  if (shouldShowPageSkeleton) {
    return (
      <div className="flex min-h-screen bg-[#F9FAF9]">
        <div ref={swipeRef} className={cn('kws-sidebar-content flex min-w-0 flex-1 flex-col bg-[#F9FAF9] md:mb-0', isExpanded ? 'md:ml-64' : 'md:ml-20')}>
          {pageHeader}
          <main className="mx-auto w-full max-w-[1180px] flex-1 p-4 md:p-8">
            <div className="mb-6 flex gap-3">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-10" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, index) => (
                <Card key={index}>
                  <CardHeader>
                    <Skeleton className="mb-2 h-6 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="mb-2 h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (bouldersError) {
    return (
      <div className="flex min-h-screen bg-[#F9FAF9]">
        <div ref={swipeRef} className={cn('kws-sidebar-content flex min-w-0 flex-1 flex-col bg-[#F9FAF9] md:mb-0', isExpanded ? 'md:ml-64' : 'md:ml-20')}>
          {pageHeader}
          <main className="mx-auto w-full max-w-[1180px] flex-1 p-4 md:p-8">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Fehler beim Laden der Daten</AlertTitle>
              <AlertDescription>
                {bouldersError instanceof Error ? bouldersError.message : 'Ein unbekannter Fehler ist aufgetreten.'}
              </AlertDescription>
            </Alert>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F9FAF9]">
      <div ref={swipeRef} className={cn('kws-sidebar-content flex min-w-0 flex-1 flex-col bg-[#F9FAF9] md:mb-0', isExpanded ? 'md:ml-64' : 'md:ml-20')}>
        {pageHeader}

        <main
          className="mx-auto w-full max-w-[1180px] flex-1 p-4 md:p-8"
          style={{ paddingTop: showMap ? '0' : '0.75rem' }}
        >
          {showMap && (
            <section data-swipe-ignore className="-mx-4 mb-4 bg-[#FAFCF9] px-3 py-3 animate-in slide-in-from-top-2 duration-200 md:-mx-8 md:px-8 md:py-5">
              <HallMapView
                sectors={sectors ?? []}
                countsBySectorId={hallMapCounts}
                boulderSectorReferences={hallMapBoulders}
                selectedSectorNames={sectorFilters}
                onSelectSector={handleMapSectorSelect}
                onClearSector={() => setSectorFilters([])}
                compact
                frameless
              />
            </section>
          )}

          <div className="mb-2 flex items-center justify-between gap-3 px-1">
            <span className="text-xs font-medium text-muted-foreground">
              {filteredAndSortedBoulders.length} Boulder
              {sectorFilters.length > 0 ? ` in ${activeSectorLabel}` : ''}
            </span>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => toggleToolbarPanel('sort')}
                aria-label="Sortierung"
                aria-expanded={showSort}
                className={cn(
                  'relative flex h-10 w-10 items-center justify-center rounded-kws-control bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45',
                  showSort ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <ArrowUpDown className="h-4 w-4" strokeWidth={1.9} />
                {hasCustomSorting ? (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-kws-badge bg-primary px-0.5 text-[9px] font-bold text-primary-foreground ring-2 ring-[#F9FAF9]">
                    1
                  </span>
                ) : null}
              </button>

              {groupedBoulders.length > 0 ? (
                <button
                  type="button"
                  onClick={toggleAllAreaGroups}
                  aria-label={allGroupsExpanded ? 'Alle Gruppen einklappen' : 'Alle Gruppen ausklappen'}
                  title={allGroupsExpanded ? 'Alle einklappen' : 'Alle ausklappen'}
                  className="flex h-10 items-center justify-center gap-1.5 rounded-kws-control bg-secondary px-2.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 active:scale-[0.97]"
                >
                  {allGroupsExpanded ? (
                    <ChevronsUp className="h-4 w-4 shrink-0" strokeWidth={1.9} />
                  ) : (
                    <ChevronsDown className="h-4 w-4 shrink-0" strokeWidth={1.9} />
                  )}
                  <span className="hidden whitespace-nowrap min-[380px]:inline">
                    {allGroupsExpanded ? 'Alle einklappen' : 'Alle ausklappen'}
                  </span>
                </button>
              ) : null}

              <div
                role="group"
                aria-label="Ansicht wechseln"
                className="flex gap-1 rounded-kws-control bg-secondary p-1"
              >
              <button
                type="button"
                onClick={() => setViewMode('list')}
                aria-label="Listenansicht"
                aria-pressed={viewMode === 'list'}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-kws-control transition-[background-color,color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 active:scale-95',
                  viewMode === 'list'
                    ? 'bg-card text-primary shadow-[0_2px_8px_rgba(19,17,43,0.10)]'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <List className="h-4 w-4" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-label="Gridansicht"
                aria-pressed={viewMode === 'grid'}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-kws-control transition-[background-color,color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 active:scale-95',
                  viewMode === 'grid'
                    ? 'bg-card text-primary shadow-[0_2px_8px_rgba(19,17,43,0.10)]'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Grid3X3 className="h-4 w-4" strokeWidth={2} />
              </button>
              </div>
            </div>
          </div>

          {showSort && (
            <BoulderSortPanel options={sortOptions} selected={selectedSortOption} onSelect={applySortOption} className="mb-4" />
          )}

          <div
            id="boulder-results"
            className="space-y-6 pb-24"
            style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}
          >
            {isLoading && (
              <div className={cn(viewMode === 'grid' ? 'grid grid-cols-3 gap-2.5 md:grid-cols-4 md:gap-4 xl:grid-cols-5' : 'grid gap-2.5 lg:grid-cols-2')}>
                {[...Array(6)].map((_, index) => (
                viewMode === 'grid' ? (
                  <Card
                    key={`boulder-grid-skeleton-${index}`}
                    className="aspect-[4/5] overflow-hidden !rounded-kws-card border-0 bg-card shadow-[0_3px_14px_rgba(19,17,43,0.07)]"
                  >
                    <Skeleton className="h-full w-full rounded-none" />
                  </Card>
                ) : (
                  <Card key={`boulder-list-skeleton-${index}`} className="overflow-hidden !rounded-kws-card border-0 bg-card shadow-[0_3px_14px_rgba(19,17,43,0.07)]">
                    <CardContent className="flex min-h-[94px] items-stretch p-0">
                      <Skeleton className="w-[5.75rem] shrink-0 rounded-none" />
                      <div className="flex flex-1 flex-col justify-center space-y-2 px-4 py-3.5">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                      <Skeleton className="h-4 w-4 rounded" />
                    </CardContent>
                  </Card>
                )
                ))}
              </div>
            )}

            {!isLoading &&
              groupedBoulders.map((group, groupIndex) => {
                const isCollapsed = collapsedAreaNames.has(group.areaName);
                const contentId = `${group.headingId}-content`;

                return (
                <section key={group.areaName} aria-labelledby={group.headingId}>
                  <div className={cn('flex items-center gap-2 px-1', !isCollapsed && 'mb-2.5')}>
                    <h2 id={group.headingId}>
                      <button
                        type="button"
                        onClick={() => toggleAreaGroup(group.areaName)}
                        aria-expanded={!isCollapsed}
                        aria-controls={contentId}
                        className="-ml-2 flex min-h-10 items-center gap-2 rounded-kws-control px-2 font-sans text-sm font-semibold tracking-[-0.01em] text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
                      >
                        <ChevronDown
                          className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200', isCollapsed && '-rotate-90')}
                          strokeWidth={2}
                        />
                        <span>{group.areaName}</span>
                        <span className="text-[10px] font-medium text-muted-foreground">{group.boulders.length}</span>
                      </button>
                    </h2>
                    <span className="h-px flex-1 bg-border/70" aria-hidden="true" />
                  </div>

                  {!isCollapsed ? (
                  <div
                    id={contentId}
                    className={cn(
                      'animate-in fade-in duration-150',
                      viewMode === 'grid'
                        ? 'grid grid-cols-3 gap-2.5 md:grid-cols-4 md:gap-4 xl:grid-cols-5'
                        : 'grid gap-2.5 lg:grid-cols-2',
                    )}
                  >
                    {group.boulders.map((boulder, index) =>
                viewMode === 'grid' ? (
                  <button
                    key={`boulder-grid-${boulder.id}`}
                    type="button"
                    onClick={() => handleBoulderClick(boulder.id)}
                    aria-label={`${boulder.name}, Grad ${boulder.difficulty ?? '?'}, ${getSectorAreaLabel(boulder)}`}
                    className="group relative aspect-[4/5] w-full overflow-hidden rounded-kws-card bg-[#EEF2EE] p-0 text-left shadow-[0_3px_14px_rgba(19,17,43,0.10)] transition-[transform,box-shadow] hover:shadow-[0_7px_22px_rgba(19,17,43,0.16)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55 focus-visible:ring-offset-2"
                  >
                    <img
                      className="absolute inset-0 h-full w-full bg-[#EEF2EE] object-cover object-center transition-opacity duration-300"
                      src={getThumbnailUrl(boulder)}
                      alt={boulder.name}
                      loading={groupIndex === 0 && index < 12 ? 'eager' : 'lazy'}
                      decoding="async"
                      style={{ opacity: 0 }}
                      onLoad={(event) => {
                        const image = event.currentTarget;
                        if (image.naturalWidth > image.naturalHeight) {
                          image.style.transform = 'rotate(90deg)';
                        }
                        image.style.opacity = '1';
                      }}
                      onError={(event) => {
                        const placeholder = getThumbnailUrl({ ...boulder, thumbnailUrl: null } as Boulder);
                        if (event.currentTarget.src !== placeholder) {
                          event.currentTarget.src = placeholder;
                          event.currentTarget.style.opacity = '1';
                        }
                      }}
                    />

                    <DifficultyBadge
                      color={boulder.color}
                      color2={boulder.color2}
                      colorHex={boulder.colorHex}
                      difficulty={boulder.difficulty}
                      colors={colors}
                      className="!bottom-auto !left-1.5 !right-auto !top-1.5 !h-6 !min-w-6 !px-1 !text-[10px] sm:!left-2 sm:!top-2"
                    />

                    {isNewBoulder(boulder) && (
                      <span className="absolute right-1.5 top-1.5 rounded-kws-badge bg-white/95 px-1.5 py-0.5 text-[7px] font-extrabold leading-none text-primary shadow-[0_2px_8px_rgba(19,17,43,0.16)] sm:right-2 sm:top-2 sm:text-[8px]">
                        NEU
                      </span>
                    )}

                    <div className="absolute inset-x-0 bottom-0 flex h-[46%] flex-col justify-end bg-gradient-to-t from-white via-white/90 to-transparent px-1.5 pb-1.5 pt-7 text-[#192436] sm:h-[48%] sm:px-2 sm:pb-2 md:h-[40%] md:px-4 md:pb-4">
                      <span className="block truncate text-[9px] font-bold leading-tight tracking-[-0.02em] sm:text-[10px] md:text-sm">
                        {boulder.name}
                      </span>
                      <span className="mt-0.5 truncate text-[8px] font-semibold leading-tight text-[#192436]/70 sm:text-[9px] md:mt-1 md:text-xs">
                        {getSectorAreaLabel(boulder)}
                      </span>
                    </div>
                  </button>
                ) : (
                  <button
                    key={`boulder-list-${boulder.id}`}
                    type="button"
                    onClick={() => handleBoulderClick(boulder.id)}
                    className="w-full overflow-hidden rounded-kws-card bg-card p-0 text-left shadow-[0_3px_14px_rgba(19,17,43,0.07)] transition-[transform,box-shadow] hover:shadow-[0_6px_20px_rgba(19,17,43,0.11)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2"
                  >
                    <div className="flex min-h-[94px] items-stretch">
                      <div className="relative w-[5.75rem] shrink-0 overflow-hidden bg-muted">
                      <img
                        className="absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-300"
                        src={getThumbnailUrl(boulder)}
                        alt={boulder.name}
                        loading="lazy"
                        decoding="async"
                        style={{ opacity: 0 }}
                        onLoad={(event) => {
                          const image = event.currentTarget;
                          if (image.naturalWidth > image.naturalHeight) {
                            image.style.transform = 'rotate(90deg)';
                          }
                          image.style.opacity = '1';
                        }}
                        onError={(event) => {
                          const placeholder = getThumbnailUrl({ ...boulder, thumbnailUrl: null } as Boulder);
                          if (event.currentTarget.src !== placeholder) {
                            event.currentTarget.src = placeholder;
                            event.currentTarget.style.opacity = '1';
                          }
                        }}
                      />
                      <DifficultyBadge
                        color={boulder.color}
                        color2={boulder.color2}
                        colorHex={boulder.colorHex}
                        difficulty={boulder.difficulty}
                        colors={colors}
                      />
                      </div>

                      <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5">
                        <div className="min-w-0 flex-1">
                          <div className="mb-0.5 flex items-center gap-2">
                            <span className="truncate text-sm font-semibold text-foreground">{boulder.name}</span>
                            {isNewBoulder(boulder) && (
                              <span className="shrink-0 rounded-kws-badge bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">NEU</span>
                            )}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {boulder.sector2 ? `${boulder.sector} → ${boulder.sector2}` : boulder.sector}
                          </div>
                          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <Star className="h-3 w-3 fill-primary text-primary" />
                            <span className="font-medium text-foreground">{boulderRatingSummaries?.[boulder.id]?.averageRating?.toFixed(1) ?? '–'}</span>
                            <span>({boulderRatingSummaries?.[boulder.id]?.ratingCount ?? 0})</span>
                          </div>
                        </div>

                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </div>
                    </div>
                  </button>
                  )
                )}
                  </div>
                  ) : null}
            </section>
                );
          })}

          </div>

          {!isLoading && filteredAndSortedBoulders.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">Keine Boulder gefunden.</div>
          )}
        </main>


      </div>
    </div>
  );
};

export default Boulders;
