import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useBouldersWithSectors } from '@/hooks/useBoulders';
import { useSectorsTransformed } from '@/hooks/useSectors';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { getColorBackgroundStyle, matchesBoulderColorFilter } from '@/utils/colorUtils';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { ArrowUpDown, Check, ChevronRight, LogIn, Map as MapIcon, Palette, Search, SlidersHorizontal, Trophy, X } from 'lucide-react';
import { DifficultyBadge } from '@/components/boulder/DifficultyBadge';
import type { Boulder } from '@/types/boulder';
// Use a data URL for placeholder to ensure it always works
const placeholder = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAwIiBoZWlnaHQ9IjEyMDAiIGZpbGw9Im5vbmUiPjxyZWN0IHdpZHRoPSIxMjAwIiBoZWlnaHQ9IjEyMDAiIGZpbGw9IiNFQUVBRUEiIHJ4PSIzIi8+PGcgb3BhY2l0eT0iLjUiPjxwYXRoIGZpbGw9IiNGQUZBRkEiIGQ9Ik02MDAuNzA5IDczNi41Yy03NS40NTQgMC0xMzYuNjIxLTYxLjE2Ny0xMzYuNjIxLTEzNi42MiAwLTc1LjQ1NCA2MS4xNjctMTM2LjYyMSAxMzYuNjIxLTEzNi42MjEgNzUuNDUzIDAgMTM2LjYyIDYxLjE2NyAxMzYuNjIgMTM2LjYyMSAwIDc1LjQ1My02MS4xNjcgMTM2LjYyLTEzNi42MiAxMzYuNjJaIi8+PHBhdGggc3Ryb2tlPSIjQzlDOUM5IiBzdHJva2Utd2lkdGg9IjIuNDE4IiBkPSJNNjAwLjcwOSA3MzYuNWMtNzUuNDU0IDAtMTM2LjYyMS02MS4xNjctMTM2LjYyMS0xMzYuNjIgMC03NS40NTQgNjEuMTY3LTEzNi42MjEgMTM2LjYyMS0xMzYuNjIxIDc1LjQ1MyAwIDEzNi42MiA2MS4xNjcgMTM2LjYyIDEzNi42MjEgMCA3NS40NTMtNjEuMTY3IDEzNi42Mi0xMzYuNjIgMTM2LjYyWiIvPjwvZz48L3N2Zz4=';

const DIFFICULTIES = [null, 1, 2, 3, 4, 5, 6, 7, 8]; // null = "?" (unknown/not rated)
const formatDifficulty = (d: number | null): string => d === null ? '?' : String(d);
const SECTOR_AREA_ORDER = ['Bug', 'Couch-Ecke', 'Top-Out', 'Lange Platte', 'Grotte'];
const getSectorAreaName = (sectorName: string) => sectorName.replace(/\s+[A-D]$/, '');
const compareSectorNames = (firstSector: string, secondSector: string) => {
  const firstAreaIndex = SECTOR_AREA_ORDER.indexOf(getSectorAreaName(firstSector));
  const secondAreaIndex = SECTOR_AREA_ORDER.indexOf(getSectorAreaName(secondSector));

  if (firstAreaIndex !== secondAreaIndex) {
    if (firstAreaIndex === -1) return 1;
    if (secondAreaIndex === -1) return -1;
    return firstAreaIndex - secondAreaIndex;
  }

  return firstSector.localeCompare(secondSector, 'de', { numeric: true });
};

const SORT_OPTIONS = [
  { key: 'date-desc', label: 'Neueste zuerst', sortBy: 'date', sortOrder: 'desc' },
  { key: 'date-asc', label: 'Älteste zuerst', sortBy: 'date', sortOrder: 'asc' },
  { key: 'name-asc', label: 'Name A–Z', sortBy: 'name', sortOrder: 'asc' },
  { key: 'name-desc', label: 'Name Z–A', sortBy: 'name', sortOrder: 'desc' },
  { key: 'difficulty-asc', label: 'Leicht → schwer', sortBy: 'difficulty', sortOrder: 'asc' },
  { key: 'difficulty-desc', label: 'Schwer → leicht', sortBy: 'difficulty', sortOrder: 'desc' },
] as const;
const Guest = () => {
  const isCompetitionEnabled = import.meta.env.VITE_ENABLE_COMPETITION === 'true';
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [loadedThumbnails, setLoadedThumbnails] = useState<Set<string>>(new Set());
  const { data: colors } = useColors();
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilters, setSectorFilters] = useState<string[]>([]);
  const [difficultyFilters, setDifficultyFilters] = useState<string[]>([]);
  const [colorFilters, setColorFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'difficulty' | 'date'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const isMobile = useIsMobile();
  // Guest area doesn't need auth, but we still wait for auth to finish loading to avoid race conditions
  const { loading: authLoading } = useAuth();
  const { data: boulders, isLoading: isLoadingBoulders, error: bouldersError } = useBouldersWithSectors(!authLoading);
  const { data: sectors, isLoading: isLoadingSectors, error: sectorsError } = useSectorsTransformed(!authLoading);
  
  // Note: Hooks already have refetchOnMount: true, so data will be reloaded automatically
  const [showSearch, setShowSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);

  useEffect(() => {
    if (bouldersError) {
      console.error('[Guest] Boulder loading error:', bouldersError);
    }
  }, [bouldersError]);

  useEffect(() => {
    if (sectorsError) {
      console.error('[Guest] Sectors loading error:', sectorsError);
    }
  }, [sectorsError]);

  useEffect(() => {
    if (!showSearch) return;

    const animationFrame = window.requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => window.cancelAnimationFrame(animationFrame);
  }, [showSearch]);

  useEffect(() => {
    const sectorParam = searchParams.get('sector');
    const publicSectorName = sectors?.find((sector) => sector.legacyName === sectorParam)?.name;
    setSectorFilters(sectorParam ? [publicSectorName || sectorParam] : []);
  }, [searchParams, sectors]);

  const filtered = useMemo(() => {
    let list = boulders || [];

    // show only hanging boulders in guest view
    list = list.filter((b) => b.status !== 'abgeschraubt');
    
    if (sectorFilters.length > 0) {
      // Filter: Boulder erscheint, wenn er in einem der beiden Sektoren ist
      list = list.filter(b => {
        const inSector1 = sectorFilters.includes(b.sector);
        const inSector2 = Boolean(b.sector2 && sectorFilters.includes(b.sector2));
        return inSector1 || inSector2;
      });
    }
    if (difficultyFilters.length > 0) {
      list = list.filter(b => {
        const bDifficulty = b.difficulty === null ? '?' : String(b.difficulty);
        return difficultyFilters.includes(bDifficulty);
      });
    }
    if (colorFilters.length > 0) {
      list = list.filter(b => colorFilters.some((colorName) => matchesBoulderColorFilter(b.color, b.color2, colorName)));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(b => {
        const sectorText = b.sector2 ? `${b.sector} → ${b.sector2}` : b.sector;
        return b.name.toLowerCase().includes(q) || sectorText.toLowerCase().includes(q);
      });
    }
    
    // Sortierung
    const sorted = [...list].sort((a, b) => {
      let result = 0;
      switch (sortBy) {
        case 'name': {
          result = a.name.localeCompare(b.name, 'de');
          break;
        }
        case 'difficulty': {
          const aDiff = a.difficulty === null ? -1 : a.difficulty;
          const bDiff = b.difficulty === null ? -1 : b.difficulty;
          result = aDiff - bDiff;
          break;
        }
        case 'date': {
          const aDate = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt || 0).getTime();
          const bDate = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt || 0).getTime();
          result = aDate - bDate;
          break;
        }
      }
      return sortOrder === 'asc' ? result : -result;
    });
    
    return sorted;
  }, [boulders, sectorFilters, difficultyFilters, colorFilters, searchQuery, sortBy, sortOrder]);

  // Reset loaded thumbnails when filtered list changes
  useEffect(() => {
    setLoadedThumbnails(new Set());
  }, [filtered.length, sectorFilters, difficultyFilters, colorFilters, searchQuery]);

  // Get thumbnail URL for a boulder - use manually uploaded thumbnail or placeholder
  // Memoized to avoid recalculating on every render
  const thumbnailUrlMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!filtered) return map;
    
    filtered.forEach(b => {
      if (b.thumbnailUrl) {
        let url = b.thumbnailUrl;
        if (url.includes('cdn.kletterwelt-sauerland.de/uploads/videos/')) {
          url = url.replace('/uploads/videos/', '/uploads/');
        }
        map.set(b.id, url);
      } else {
        map.set(b.id, placeholder);
      }
    });
    return map;
  }, [filtered]);

  const getThumbnailUrl = (boulder: Boulder): string => {
    return thumbnailUrlMap.get(boulder.id) || placeholder;
  };

  const isNewBoulder = (boulder: Boulder) => {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - 7);
    return boulder.createdAt >= threshold;
  };

  const sectorNames = [...new Set((sectors ?? []).map((sector) => sector.name))].sort(compareSectorNames);
  const sortedColors = [...(colors ?? [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const activeFilterCount = sectorFilters.length + difficultyFilters.length + colorFilters.length;
  const activeSortKey = `${sortBy}-${sortOrder}`;

  const clearFilters = () => {
    setSectorFilters([]);
    setDifficultyFilters([]);
    setColorFilters([]);
  };

  const toggleSectorFilter = (sectorName: string) => {
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

  const toggleToolbarPanel = (panel: 'search' | 'filters' | 'sort') => {
    setShowSearch((current) => panel === 'search' ? !current : false);
    setShowFilters((current) => panel === 'filters' ? !current : false);
    setShowSort((current) => panel === 'sort' ? !current : false);
  };

  const filterControls = (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.15fr_0.8fr_1.4fr]" aria-label="Boulder filtern">
      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#13112B]/55">Sektor</span>
          <MapIcon className="h-3.5 w-3.5 text-[#13112B]/40" aria-hidden="true" />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {sectorNames.map((sectorName) => {
            const isSelected = sectorFilters.includes(sectorName);
            return (
              <button
                key={sectorName}
                type="button"
                onClick={() => toggleSectorFilter(sectorName)}
                aria-pressed={isSelected}
                className={cn(
                  'relative min-h-11 min-w-0 rounded-kws-control border px-2 text-left text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36B531]/45',
                  isSelected ? 'border-[#36B531] bg-[#36B531] pr-7 text-white' : 'border-[#E1EAE2] bg-white text-[#13112B] hover:bg-[#F1F5F1]'
                )}
              >
                <span className="block truncate">{sectorName}</span>
                {isSelected ? <Check className="absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2" strokeWidth={2.4} /> : null}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#13112B]/55">Schwierigkeit</span>
          <span className="text-[10px] text-[#13112B]/45">Mehrfachauswahl</span>
        </div>
        <div className="grid grid-cols-5 gap-1.5 md:grid-cols-3">
          {DIFFICULTIES.map((difficulty) => {
            const difficultyLabel = formatDifficulty(difficulty);
            const isSelected = difficultyFilters.includes(difficultyLabel);
            return (
              <button
                key={difficultyLabel}
                type="button"
                onClick={() => toggleDifficultyFilter(difficultyLabel)}
                aria-label={difficulty === null ? 'Unbekannter Grad' : `Grad ${difficultyLabel}`}
                aria-pressed={isSelected}
                className={cn(
                  'min-h-11 rounded-kws-control border px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36B531]/45',
                  isSelected ? 'border-[#36B531] bg-[#36B531] text-white' : 'border-[#E1EAE2] bg-white text-[#13112B] hover:bg-[#F1F5F1]'
                )}
              >
                {difficultyLabel}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#13112B]/55">Farbe</span>
          <Palette className="h-3.5 w-3.5 text-[#13112B]/40" aria-hidden="true" />
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {sortedColors.map((color) => {
            const colorStyle = getColorBackgroundStyle(color.name, colors);
            const colorHex = colorStyle.backgroundColor || '#000';
            const isWhite = colorHex === '#ffffff' || colorHex === 'white' || color.name.toLowerCase() === 'weiß';
            const isSelected = colorFilters.includes(color.name);
            return (
              <button
                key={color.name}
                type="button"
                onClick={() => toggleColorFilter(color.name)}
                aria-pressed={isSelected}
                className={cn(
                  'relative flex min-h-11 min-w-0 items-center gap-1.5 rounded-kws-control border px-2 text-left text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36B531]/45',
                  color.name.length > 9 && 'col-span-2',
                  isSelected ? 'border-[#36B531] bg-[#36B531] pr-6 text-white' : 'border-[#E1EAE2] bg-white text-[#13112B] hover:bg-[#F1F5F1]'
                )}
              >
                <span className={cn('h-3 w-3 shrink-0 rounded-[2px] border', isWhite ? 'bg-white' : '', isSelected ? 'border-white/65' : 'border-[#D5DED6]')} style={!isWhite ? colorStyle : undefined} />
                <span className="min-w-0 truncate">{color.name}</span>
                {isSelected ? <Check className="absolute right-2 h-3 w-3" strokeWidth={2.4} /> : null}
              </button>
            );
          })}
        </div>
      </section>

      <div className="md:col-span-3">
        <button
          type="button"
          onClick={clearFilters}
          disabled={activeFilterCount === 0}
          className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-kws-control border border-[#E1EAE2] bg-[#F1F5F1] px-3 text-xs font-semibold text-[#13112B]/60 transition-colors hover:text-[#13112B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36B531]/45 disabled:cursor-default disabled:opacity-45"
        >
          <X className="h-3 w-3" />
          Filter zurücksetzen
        </button>
      </div>
    </div>
  );

  // Thumbnails are loaded lazily using native browser lazy loading
  // No blocking preloading - page shows immediately

  return (
    <div className="min-h-screen bg-[#F9FAF9]">
        <header className="sticky top-0 z-30 border-b border-[#E7F0E8] bg-white/95 px-4 pb-3 pt-[calc(1rem+var(--app-safe-area-top))] backdrop-blur-xl md:pt-[calc(1.25rem+var(--app-safe-area-top))]">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h1 className="truncate text-[2.15rem] font-semibold leading-none tracking-[-0.03em] text-[#192436]">Boulder</h1>
                <p className="mt-1 text-[11px] font-medium text-[#646C71]" aria-live="polite">
                  Gastansicht · {filtered.length} aktuelle Boulder
                </p>
              </div>

              <nav className="flex shrink-0 items-center gap-1.5" aria-label="Boulder-Werkzeuge">
                <button
                  type="button"
                  onClick={() => toggleToolbarPanel('search')}
                  className={cn(
                    'relative flex h-10 w-10 items-center justify-center rounded-kws-control transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36B531]/45',
                    showSearch || searchQuery.trim() ? 'bg-[#36B531] text-white' : 'bg-[#F1F5F1] text-[#13112B]/65'
                  )}
                  aria-label="Boulder suchen"
                  aria-expanded={showSearch}
                >
                  <Search className="h-4 w-4" strokeWidth={1.9} />
                  {!showSearch && searchQuery.trim() ? <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-white" /> : null}
                </button>
                <button
                  type="button"
                  onClick={() => toggleToolbarPanel('filters')}
                  className={cn(
                    'relative flex h-10 w-10 items-center justify-center rounded-kws-control transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36B531]/45',
                    showFilters ? 'bg-[#36B531] text-white' : 'bg-[#F1F5F1] text-[#13112B]/65'
                  )}
                  aria-label="Filter"
                  aria-expanded={showFilters}
                >
                  <SlidersHorizontal className="h-4 w-4" strokeWidth={1.9} />
                  {activeFilterCount > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#13112B] px-1 text-[9px] font-bold text-white">
                      {activeFilterCount}
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  onClick={() => toggleToolbarPanel('sort')}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-kws-control transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36B531]/45',
                    showSort ? 'bg-[#36B531] text-white' : 'bg-[#F1F5F1] text-[#13112B]/65'
                  )}
                  aria-label="Sortierung"
                  aria-expanded={showSort}
                >
                  <ArrowUpDown className="h-4 w-4" strokeWidth={1.9} />
                </button>
                <Button
                  type="button"
                  size="sm"
                  className="hidden h-10 rounded-kws-control bg-[#13112B] px-3 text-white hover:bg-[#24213f] focus-visible:ring-[#36B531]/45 sm:inline-flex"
                  onClick={() => {
                    window.location.href = '/auth';
                  }}
                >
                  <LogIn className="mr-1.5 h-4 w-4" />
                  <span>Anmelden</span>
                </Button>
              </nav>
            </div>

            {showSearch && (
              <div className="relative mt-3 animate-in slide-in-from-top-2 duration-200">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#13112B]/45" />
                <Input
                  ref={searchInputRef}
                  className="h-10 !rounded-kws-control border-none bg-[#F1F5F1] pl-10 pr-10 text-sm text-[#13112B] shadow-none placeholder:text-[#13112B]/45 focus-visible:!ring-2 focus-visible:!ring-[#13112B]/15 focus-visible:!ring-offset-0"
                  placeholder="Boulder oder Sektor suchen…"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setShowSearch(false);
                  }}
                  className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center rounded-kws-control text-[#13112B]/50 transition-colors hover:text-[#13112B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36B531]/45"
                  aria-label="Suche schließen"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {(searchQuery.trim() || activeFilterCount > 0) && (
              <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 md:-mx-8 md:px-8">
                {searchQuery.trim() ? (
                  <button type="button" onClick={() => setSearchQuery('')} className="flex shrink-0 items-center gap-1.5 rounded-kws-control bg-[#36B531] px-3 py-1.5 text-xs font-semibold text-white">
                    Suche: {searchQuery.trim()}
                    <X className="h-3 w-3" />
                  </button>
                ) : null}
                {sectorFilters.map((sectorName) => (
                  <button key={sectorName} type="button" onClick={() => toggleSectorFilter(sectorName)} className="flex shrink-0 items-center gap-1.5 rounded-kws-control bg-[#36B531] px-3 py-1.5 text-xs font-semibold text-white">
                    {sectorName}
                    <X className="h-3 w-3" />
                  </button>
                ))}
                {difficultyFilters.map((difficulty) => (
                  <button key={difficulty} type="button" onClick={() => toggleDifficultyFilter(difficulty)} className="flex shrink-0 items-center gap-1.5 rounded-kws-control bg-[#36B531] px-3 py-1.5 text-xs font-semibold text-white">
                    Grad {difficulty}
                    <X className="h-3 w-3" />
                  </button>
                ))}
                {colorFilters.map((colorName) => (
                  <button key={colorName} type="button" onClick={() => toggleColorFilter(colorName)} className="flex shrink-0 items-center gap-1.5 rounded-kws-control bg-[#36B531] px-3 py-1.5 text-xs font-semibold text-white">
                    {colorName}
                    <X className="h-3 w-3" />
                  </button>
                ))}
              </div>
            )}

            {showFilters && !isMobile ? (
              <div className="mt-3 rounded-kws-control border border-[#E1EAE2] bg-white p-3 shadow-[0_5px_18px_rgba(19,17,43,0.08)] animate-in slide-in-from-top-2 duration-200">
                {filterControls}
              </div>
            ) : null}

            {showSort && (
              <div className="mt-3 rounded-kws-control border border-[#E1EAE2] bg-white p-3 shadow-[0_5px_18px_rgba(19,17,43,0.08)] animate-in slide-in-from-top-2 duration-200">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#13112B]/55">Sortieren nach</div>
                <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3">
                  {SORT_OPTIONS.map((option) => {
                    const isSelected = activeSortKey === option.key;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => {
                          setSortBy(option.sortBy);
                          setSortOrder(option.sortOrder);
                        }}
                        aria-pressed={isSelected}
                        className={cn(
                          'flex min-h-11 items-center justify-between rounded-kws-control border px-3 py-2 text-left text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36B531]/45',
                          isSelected ? 'border-[#36B531] bg-[#36B531] text-white' : 'border-[#E1EAE2] bg-white text-[#13112B] hover:bg-[#F1F5F1]'
                        )}
                      >
                        {option.label}
                        {isSelected ? <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.4} /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </header>

        {isMobile ? (
          <Drawer open={showFilters} onOpenChange={setShowFilters} shouldScaleBackground={false}>
            <DrawerContent className="z-[130] max-h-[88dvh] overflow-hidden rounded-t-kws-card border-[#E1EAE2] bg-[#FAFCF9] [&>div:first-child]:mt-3 [&>div:first-child]:h-1 [&>div:first-child]:w-10 [&>div:first-child]:shrink-0 [&>div:first-child]:rounded-[2px] [&>div:first-child]:bg-[#13112B]/20">
              <DrawerHeader className="px-4 pb-3 pt-4 text-left">
                <DrawerTitle className="font-heading text-2xl font-semibold leading-none tracking-[-0.02em] text-[#13112B]">Filter</DrawerTitle>
                <DrawerDescription className="text-xs text-[#13112B]/55">
                  Mehrere Sektoren, Grade und Farben lassen sich kombinieren.
                </DrawerDescription>
              </DrawerHeader>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
                {filterControls}
              </div>
              <DrawerFooter className="shrink-0 border-t border-[#E1EAE2] bg-[#FAFCF9] px-4 pb-[calc(1rem+var(--app-safe-area-bottom))] pt-3">
                <Button
                  type="button"
                  onClick={() => setShowFilters(false)}
                  className="min-h-11 rounded-kws-control bg-[#36B531] text-sm font-semibold text-white hover:bg-[#2DA029] focus-visible:ring-[#36B531]/45"
                >
                  {filtered.length} Boulder anzeigen
                </Button>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        ) : null}

        <main className="mx-auto max-w-4xl p-4 md:p-8">
          {/* Nikolaus Wettkampf Navigation Card - Temporarily hidden */}
          {isCompetitionEnabled && (
            <Card className="mb-6 rounded-kws-card border border-[#E7F7E9] bg-white shadow-sm transition-shadow hover:shadow-md">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-kws-control bg-[#E7F7E9] sm:h-16 sm:w-16">
                      <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-[#36B531]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg sm:text-xl font-heading font-bold text-[#13112B] mb-1 tracking-wide">
                        Nikolaus Wettkampf
                      </h2>
                      <p className="text-sm text-[#13112B]/60">
                        Nimm am Wettkampf teil, trage deine Ergebnisse ein und verfolge die Live-Rangliste!
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => navigate('/competition')}
                    size="lg"
                    className="h-11 w-full min-w-[140px] rounded-kws-control bg-[#36B531] font-semibold text-white shadow-sm transition-shadow hover:bg-[#2DA029] hover:shadow-md sm:w-auto"
                  >
                    <Trophy className="w-5 h-5 mr-2" />
                    Zum Wettkampf
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

      <div className="grid grid-cols-1 gap-3 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] md:grid-cols-2 md:pb-[calc(2rem+env(safe-area-inset-bottom,0px))] lg:grid-cols-3">
        {filtered.map((b, index) => (
          <button
            key={b.id}
            type="button"
            onClick={() => navigate(`/boulders/${b.id}`)}
            className="w-full overflow-hidden rounded-kws-card bg-white p-0 text-left shadow-[0_3px_14px_rgba(19,17,43,0.07)] transition-[transform,box-shadow] hover:shadow-[0_6px_20px_rgba(19,17,43,0.11)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36B531]/45 focus-visible:ring-offset-2"
          >
            <div className="flex min-h-[94px] items-stretch">
              <div className="relative w-[5.75rem] shrink-0 overflow-hidden bg-muted">
                <img
                  className="absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-300"
                  src={getThumbnailUrl(b)}
                  alt={b.name}
                  loading={index < 12 ? 'eager' : 'lazy'}
                  decoding="async"
                  style={{ opacity: 0 }}
                  onLoad={(event) => {
                    const image = event.currentTarget;
                    const thumbnailUrl = getThumbnailUrl(b);

                    if (image.naturalWidth > image.naturalHeight) {
                      image.style.transform = 'rotate(90deg)';
                    }
                    image.style.opacity = '1';

                    if (thumbnailUrl !== placeholder) {
                      setLoadedThumbnails((prev) => {
                        const next = new Set(prev);
                        next.add(thumbnailUrl);
                        return next;
                      });
                    }
                  }}
                  onError={(event) => {
                    if (event.currentTarget.src !== placeholder) {
                      event.currentTarget.src = placeholder;
                      event.currentTarget.style.opacity = '1';
                    }
                  }}
                />
                <DifficultyBadge
                  color={b.color}
                  color2={b.color2}
                  colorHex={b.colorHex}
                  difficulty={b.difficulty}
                  colors={colors}
                />
              </div>

              <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-[#13112B]">{b.name}</span>
                    {isNewBoulder(b) && (
                      <span className="shrink-0 rounded-kws-badge bg-[#36B531]/15 px-2 py-0.5 text-[10px] font-bold text-[#217a28]">
                        NEU
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-[#13112B]/60">
                    {b.sector2 ? `${b.sector} → ${b.sector2}` : b.sector}
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 shrink-0 text-[#13112B]/40" />
              </div>
            </div>
          </button>
        ))}
      </div>

        </main>
    </div>
  );
};

export default Guest;

