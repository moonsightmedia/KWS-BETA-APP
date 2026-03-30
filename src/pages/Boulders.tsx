import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowDown, ArrowUp, ArrowUpDown, Bookmark, Check, ChevronRight, LayoutDashboard, Map, Search, Settings, Shield, SlidersHorizontal, Sparkles, Star, User, Wrench, X } from 'lucide-react';
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
import { useHasRole } from '@/hooks/useHasRole';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useSectorsTransformed } from '@/hooks/useSectors';
import { cn } from '@/lib/utils';
import { Boulder } from '@/types/boulder';
import { getColorBackgroundStyle } from '@/utils/colorUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const LIGHT_TEXT_COLORS = new Set(['Grün', 'Blau', 'Rot', 'Schwarz', 'Lila']);

const getDifficultyTextColor = (colorName: string, colorHex?: string) => {
  if (colorHex) {
    const hex = colorHex.replace('#', '');
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.72 ? 'text-black' : 'text-white';
    }
  }

  return LIGHT_TEXT_COLORS.has(colorName) ? 'text-white' : 'text-black';
};


const STORAGE_KEY_ADMIN = 'nav_isAdmin';
const STORAGE_KEY_SETTER = 'nav_isSetter';
const STORAGE_KEY_USER_ID = 'nav_userId';

const sortOptions = [
  { key: 'date-desc', label: 'Neueste zuerst' },
  { key: 'date-asc', label: 'Älteste zuerst' },
  { key: 'difficulty-asc', label: 'Grad aufsteigend' },
  { key: 'difficulty-desc', label: 'Grad absteigend' },
  { key: 'name-asc', label: 'Name A-Z' },
  { key: 'name-desc', label: 'Name Z-A' },
] as const;

const getStoredRole = (key: string, userId?: string): boolean => {
  if (!userId) return false;

  try {
    const storedUserId = localStorage.getItem(STORAGE_KEY_USER_ID) ?? sessionStorage.getItem(STORAGE_KEY_USER_ID);
    if (storedUserId !== userId) return false;

    const storedValue = localStorage.getItem(key) ?? sessionStorage.getItem(key);
    return storedValue === 'true';
  } catch {
    return false;
  }
};

const Boulders = () => {
  const { isExpanded } = useSidebar();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [colorFilter, setColorFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'difficulty' | 'date'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showOnlyHanging, setShowOnlyHanging] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [showBetaOnly, setShowBetaOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const { data: colors } = useColors();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { hasRole: isSetter } = useHasRole('setter');
  const queriesEnabled = !authLoading && !!user;
  const { data: boulders, isLoading: isLoadingBoulders, error: bouldersError } = useBouldersWithSectors(queriesEnabled);
  const { data: sectors, isLoading: isLoadingSectors } = useSectorsTransformed(queriesEnabled);
  const { data: myTrackedBoulders } = useMyTrackedBoulders();
  const boulderIds = useMemo(() => (boulders ?? []).map((boulder) => boulder.id), [boulders]);
  const { data: boulderRatingSummaries } = useBoulderRatingSummaries(boulderIds);
  const isLoading = isLoadingBoulders || isLoadingSectors;
  const shouldShowPageSkeleton = authLoading && !user;
  const storedIsAdmin = getStoredRole(STORAGE_KEY_ADMIN, user?.id);
  const storedIsSetter = getStoredRole(STORAGE_KEY_SETTER, user?.id);
  const effectiveIsAdmin = isAdmin || storedIsAdmin;
  const effectiveIsSetter = effectiveIsAdmin || isSetter || storedIsSetter;

  useEffect(() => {
    const sectorParam = searchParams.get('sector');
    const showParam = searchParams.get('show');
    const statusParam = searchParams.get('status');

    setSectorFilter(sectorParam || 'all');
    setShowNew(showParam === 'new');
    setShowSaved(showParam === 'saved');
    setShowBetaOnly(showParam === 'beta');
    setShowOnlyHanging(statusParam !== 'all');
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.has('view')) {
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.delete('view');
      setSearchParams(nextSearchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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
      const matchesSector = sectorFilter === 'all' || boulder.sector === sectorFilter || boulder.sector2 === sectorFilter;
      const matchesDifficulty = difficultyFilter === 'all' || (boulder.difficulty === null ? '?' : String(boulder.difficulty)) === difficultyFilter;
      const matchesColor = colorFilter === 'all' || boulder.color === colorFilter;
      const matchesStatus = showOnlyHanging ? boulder.status === 'haengt' : true;
      const matchesNew = !showNew || boulder.createdAt >= sevenDaysAgo;
      const matchesSaved = !showSaved || favoriteBoulderIds.has(boulder.id);
      const matchesBeta = !showBetaOnly || !!boulder.betaVideoUrl;
      return matchesSearch && matchesSector && matchesDifficulty && matchesColor && matchesStatus && matchesNew && matchesSaved && matchesBeta;
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
          result = b.createdAt.getTime() - a.createdAt.getTime();
          break;
        default:
          result = 0;
      }
      return sortOrder === 'asc' ? -result : result;
    });

    return filtered;
  }, [boulders, colorFilter, difficultyFilter, myTrackedBoulders, searchQuery, sectorFilter, showBetaOnly, showNew, showOnlyHanging, showSaved, sortBy, sortOrder]);

  const hallMapCounts = useMemo(() => {
    if (!boulders) return {};

    return boulders
      .filter((boulder) => {
      const searchableSector = boulder.sector2 ? `${boulder.sector} · ${boulder.sector2}` : boulder.sector;
        const matchesSearch =
          boulder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          searchableSector.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDifficulty = difficultyFilter === 'all' || (boulder.difficulty === null ? '?' : String(boulder.difficulty)) === difficultyFilter;
        const matchesColor = colorFilter === 'all' || boulder.color === colorFilter;
        const matchesStatus = showOnlyHanging ? boulder.status === 'haengt' : true;
        const matchesBeta = !showBetaOnly || !!boulder.betaVideoUrl;
        return matchesSearch && matchesDifficulty && matchesColor && matchesStatus && matchesBeta;
      })
      .reduce<Record<string, number>>((accumulator, boulder) => {
        const primarySector = sectors?.find((sector) => sector.name === boulder.sector)?.id;
        const secondarySector = boulder.sector2 ? sectors?.find((sector) => sector.name === boulder.sector2)?.id : null;

        if (primarySector) accumulator[primarySector] = (accumulator[primarySector] ?? 0) + 1;
        if (secondarySector) accumulator[secondarySector] = (accumulator[secondarySector] ?? 0) + 1;
        return accumulator;
      }, {});
  }, [boulders, colorFilter, difficultyFilter, searchQuery, sectors, showBetaOnly, showOnlyHanging]);

  const activeSectorLabel = sectorFilter === 'all' ? 'Alle Sektoren' : sectorFilter;
  const activeFilterCount = [sectorFilter !== 'all', difficultyFilter !== 'all', colorFilter !== 'all', showNew, showSaved, showBetaOnly, !showOnlyHanging].filter(Boolean).length;
  const hasCustomSorting = sortBy !== 'date' || sortOrder !== 'desc';

  const clearFilters = () => {
    setSectorFilter('all');
    setDifficultyFilter('all');
    setColorFilter('all');
    setShowNew(false);
    setShowSaved(false);
    setShowBetaOnly(false);
    setShowOnlyHanging(true);
  };

  const handleBoulderClick = (boulderId: string) => {
    navigate(`/boulders/${boulderId}`);
  };

  const handleMapSectorSelect = (sectorName: string) => {
    setSectorFilter(sectorName);
    setShowMap(false);
    requestAnimationFrame(() => {
      document.getElementById('boulder-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const navigateToArea = (path: string) => {
    if (window.location.pathname + window.location.search === path) {
      return;
    }
    navigate(path);
  };

  const applySortOption = (value: (typeof sortOptions)[number]['key']) => {
    const [nextSortBy, nextSortOrder] = value.split('-') as ['date' | 'name' | 'difficulty', 'asc' | 'desc'];
    setSortBy(nextSortBy);
    setSortOrder(nextSortOrder);
    setShowSort(false);
  };

  const selectedSortOption = `${sortBy}-${sortOrder}` as (typeof sortOptions)[number]['key'];
  const profileMenuContentClassName =
    'z-50 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-[#DDE7DF] bg-white p-0 shadow-[0_18px_45px_rgba(19,17,43,0.12)] overflow-hidden';
  const profileMenuItemClassName =
    'mx-3 my-1 flex min-h-14 items-center gap-3 rounded-2xl px-4 py-3 text-[1.05rem] font-medium text-[#13112B] outline-none transition-colors data-[highlighted]:bg-[#F4F7F4] data-[highlighted]:text-[#13112B]';
  const profileMenuSeparatorClassName = 'my-0 h-px bg-[#E7F0E8]';


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
    <div className="sticky top-0 z-10 border-b border-border bg-background/80 px-4 pt-12 pb-3 backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary transition-colors active:scale-95 focus:outline-none"
                aria-label="Profil"
              >
                <User className="h-4 w-4 text-muted-foreground" strokeWidth={1.9} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={12} className={profileMenuContentClassName}>
              {user ? (
                <>
                  <div className="px-5 py-5">
                    <p className="truncate text-[1.05rem] font-semibold tracking-[-0.02em] text-[#13112B]">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator className={profileMenuSeparatorClassName} />
                  <DropdownMenuItem className={profileMenuItemClassName} onSelect={() => navigate('/profile')}>
                    <Settings className="mr-2 h-4 w-4 text-[#13112B]/70" />
                    Profil Einstellungen
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className={profileMenuSeparatorClassName} />
                  <DropdownMenuItem className={profileMenuItemClassName} onSelect={() => navigateToArea('/')}>
                    <LayoutDashboard className="mr-2 h-4 w-4 text-[#13112B]/70" />
                    User Bereich
                  </DropdownMenuItem>
                  {effectiveIsSetter && (
                    <DropdownMenuItem className={profileMenuItemClassName} onSelect={() => navigateToArea('/setter/create')}>
                      <Wrench className="mr-2 h-4 w-4 text-[#13112B]/70" />
                      Setter Bereich
                    </DropdownMenuItem>
                  )}
                  {effectiveIsAdmin && (
                    <DropdownMenuItem className={profileMenuItemClassName} onSelect={() => navigateToArea('/admin?tab=users')}>
                      <Shield className="mr-2 h-4 w-4 text-[#13112B]/70" />
                      Admin Bereich
                    </DropdownMenuItem>
                  )}
                </>
              ) : (
                <DropdownMenuItem className={profileMenuItemClassName} onSelect={() => navigate('/auth')}>
                  <User className="mr-2 h-4 w-4" />
                  Anmelden
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="min-w-0">
            <h1 className="truncate text-[2.15rem] font-semibold leading-none tracking-[-0.03em] text-foreground">
              Boulder
            </h1>
          </div>
        </div>

        <div className='flex shrink-0 gap-2'>
          <button
            type='button'
            onClick={() => {
              setShowMap((prev) => !prev);
              setShowFilters(false);
              setShowSort(false);
            }}
            className={cn(
              'relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
              showMap ? 'bg-primary' : 'bg-secondary'
            )}
            aria-label='Karte'
          >
            <Map className={cn('h-4 w-4', showMap ? 'text-primary-foreground' : 'text-muted-foreground')} strokeWidth={1.9} />
          </button>
          <button
            type='button'
            onClick={() => {
              setShowSort((prev) => !prev);
              setShowFilters(false);
              setShowMap(false);
            }}
            className={cn(
              'relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
              showSort ? 'bg-primary' : 'bg-secondary'
            )}
            aria-label='Sortierung'
          >
            <ArrowUpDown className={cn('h-4 w-4', showSort ? 'text-primary-foreground' : 'text-muted-foreground')} strokeWidth={1.9} />
            {hasCustomSorting ? (
              <span className='absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground'>
                1
              </span>
            ) : null}
          </button>
          <button
            type='button'
            onClick={() => {
              setShowFilters((prev) => !prev);
              setShowSort(false);
              setShowMap(false);
            }}
            className={cn(
              'relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
              showFilters ? 'bg-primary' : 'bg-secondary'
            )}
            aria-label='Filter'
          >
            <SlidersHorizontal className={cn('h-4 w-4', showFilters ? 'text-primary-foreground' : 'text-muted-foreground')} strokeWidth={1.9} />
            {activeFilterCount > 0 ? (
              <span className='absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground'>
                {activeFilterCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      <div className='relative mb-3'>
        <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
        <Input
          placeholder='Boulder suchen...'
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className='h-10 rounded-xl border-none bg-secondary pl-10 pr-4 text-sm text-foreground shadow-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/50'
          disabled={isLoading}
        />
      </div>

      <div className='-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 hide-scrollbar'>
        <button
          type='button'
          onClick={() => setShowNew((prev) => !prev)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all',
              showNew ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
            )}
        >
          <Sparkles className='h-3 w-3' />
          Neu
        </button>
        <button
          type='button'
          onClick={() => setShowSaved((prev) => !prev)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all',
              showSaved ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
            )}
        >
          <Bookmark className='h-3 w-3' />
          Gespeichert
        </button>
        <button
          type='button'
          onClick={() => setShowBetaOnly((prev) => !prev)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all',
              showBetaOnly ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
            )}
        >
          <Sparkles className='h-3 w-3' />
          Mit Beta
        </button>
        {sectorFilter !== 'all' && (
          <button type='button' onClick={() => setSectorFilter('all')} className='flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground'>
            {activeSectorLabel}
            <X className='h-3 w-3' />
          </button>
        )}
        {difficultyFilter !== 'all' && (
          <button type='button' onClick={() => setDifficultyFilter('all')} className='flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground'>
            {difficultyFilter}
            <X className='h-3 w-3' />
          </button>
        )}
        {colorFilter !== 'all' && (
          <button type='button' onClick={() => setColorFilter('all')} className='flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground'>
            {colorFilter}
            <X className='h-3 w-3' />
          </button>
        )}
        {!showOnlyHanging && (
          <button type='button' onClick={() => setShowOnlyHanging(true)} className='flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground'>
            Alle Boulder
            <X className='h-3 w-3' />
          </button>
        )}
      </div>

      {showFilters && (
        <div className='mt-3 space-y-3 border-t border-border pt-3 animate-in slide-in-from-top-2 duration-200'>
          <div>
            <span className='mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>Schwierigkeit</span>
            <div className='-mx-4 flex gap-1.5 overflow-x-auto px-4 hide-scrollbar'>
              <button
                type='button'
                onClick={() => setDifficultyFilter('all')}
                className={cn('shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all', difficultyFilter === 'all' ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-foreground')}
              >
                Alle Grade
              </button>
              {[null, 1, 2, 3, 4, 5, 6, 7, 8].map((difficulty) => {
                const difficultyLabel = difficulty === null ? '?' : String(difficulty);
                return (
                  <button
                    key={difficultyLabel}
                    type='button'
                    onClick={() => setDifficultyFilter(difficultyLabel)}
                    className={cn('shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all', difficultyFilter === difficultyLabel ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-foreground')}
                  >
                    {difficultyLabel}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className='mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>Farbe</span>
            <div className='-mx-4 flex gap-1.5 overflow-x-auto px-4 hide-scrollbar'>
              <button
                type='button'
                onClick={() => setColorFilter('all')}
                className={cn('shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all', colorFilter === 'all' ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-foreground')}
              >
                Alle Farben
              </button>
              {colors?.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map((color) => {
                const colorStyle = getColorBackgroundStyle(color.name, colors);
                const colorHex = colorStyle.backgroundColor || '#000';
                const isWhite = colorHex === '#ffffff' || colorHex === 'white' || color.name.toLowerCase() === 'weiß';
                return (
                  <button
                    key={color.name}
                    type='button'
                    onClick={() => setColorFilter(color.name)}
                    className={cn(
                        'flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
                      colorFilter === color.name ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-foreground'
                    )}
                  >
                    <span className={cn('h-2.5 w-2.5 rounded-full border border-border/50', isWhite ? 'bg-white' : '')} style={!isWhite ? colorStyle : undefined} />
                    {color.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className='-mx-4 flex gap-1.5 overflow-x-auto px-4 hide-scrollbar'>
            <button
              type='button'
              onClick={() => setShowOnlyHanging((prev) => !prev)}
              className={cn('shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all', !showOnlyHanging ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-foreground')}>
              Alle Boulder anzeigen
            </button>
            <button
              type='button'
              onClick={clearFilters}
              className='flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground'
            >
              <X className='h-3 w-3' />
              Filter zurücksetzen
            </button>
          </div>
        </div>
      )}

      {showSort && (
        <div className='mt-3 border-t border-border pt-3 animate-in slide-in-from-top-2 duration-200'>
          <span className='mb-2 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>Sortierung</span>
          <div className='-mx-1 flex flex-col gap-0.5'>
            {sortOptions.map((option) => (
              <button
                key={option.key}
                type='button'
                onClick={() => applySortOption(option.key)}
                className={cn(
                  'flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-all',
                  selectedSortOption === option.key ? 'bg-primary/10 font-semibold text-primary' : 'text-foreground hover:bg-secondary'
                )}
              >
                {option.label}
                {selectedSortOption === option.key ? <Check className='h-4 w-4 text-primary' /> : null}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (shouldShowPageSkeleton) {
    return (
      <div className="flex min-h-screen bg-[#F9FAF9]">
        <div className={cn('flex min-w-0 flex-1 flex-col bg-[#F9FAF9] md:mb-0', isExpanded ? 'md:ml-64' : 'md:ml-20')}>
          {pageHeader}
          <main className="flex-1 p-4 md:p-8">
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
        <div className={cn('flex min-w-0 flex-1 flex-col bg-[#F9FAF9] md:mb-0', isExpanded ? 'md:ml-64' : 'md:ml-20')}>
          {pageHeader}
          <main className="flex-1 p-4 md:p-8">
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
      <div className={cn('flex min-w-0 flex-1 flex-col bg-[#F9FAF9] md:mb-0', isExpanded ? 'md:ml-64' : 'md:ml-20')}>
        {pageHeader}

        <main
          className="flex-1 p-4 md:p-8"
          style={{ paddingTop: showMap ? '0' : '0.75rem' }}
        >
          {showMap && (
            <section className="-mx-4 mb-4 animate-in slide-in-from-top-2 duration-200 md:-mx-8">
              <HallMapView
                sectors={sectors ?? []}
                countsBySectorId={hallMapCounts}
                selectedSectorName={sectorFilter}
                onSelectSector={handleMapSectorSelect}
                onClearSector={() => setSectorFilter('all')}
                compact
                frameless
              />
            </section>
          )}

          <div className="px-1 pb-1">
            <span className="text-xs font-medium text-muted-foreground">
              {filteredAndSortedBoulders.length} Boulder
              {sectorFilter !== 'all' ? ` in ${activeSectorLabel}` : ''}
            </span>
          </div>

          <div
            id="boulder-results"
            className="space-y-2.5 pb-24"
            style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}
          >
            {isLoading &&
              [...Array(6)].map((_, index) => (
                <Card key={`boulder-list-skeleton-${index}`} className="rounded-2xl border border-border bg-card">
                  <CardContent className="flex items-center gap-3.5 p-3.5">
                    <Skeleton className="h-16 w-16 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-4 w-4 rounded" />
                  </CardContent>
                </Card>
              ))}

            {!isLoading &&
              filteredAndSortedBoulders.map((boulder) => (
                <button
                  key={`boulder-list-${boulder.id}`}
                  type="button"
                  onClick={() => handleBoulderClick(boulder.id)}
                  className="w-full rounded-2xl border border-border bg-card p-3.5 text-left transition-transform active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                      <img
                        className="h-full w-full object-cover object-center transition-opacity duration-300"
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
                      <span
                        className={cn(
                          'absolute bottom-1 right-1 rounded px-1.5 py-0.5 text-[10px] font-bold backdrop-blur-sm',
                          getDifficultyTextColor(boulder.color, boulder.colorHex)
                        )}
                        style={{
                          ...(getColorBackgroundStyle(boulder.color, colors) || {}),
                          color: undefined,
                        }}
                      >
                        {boulder.difficulty === null ? '?' : boulder.difficulty}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-foreground">{boulder.name}</span>
                          {isNewBoulder(boulder) && (
                           <span className="shrink-0 rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">NEU</span>
                          )}
                      </div>
                      <div className="text-xs text-muted-foreground">
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
                </button>
              ))}

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
