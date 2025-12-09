import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useBouldersWithSectors } from '@/hooks/useBoulders';
import { useSectorsTransformed } from '@/hooks/useSectors';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/hooks/useAuth';
import { getColorBackgroundStyle } from '@/utils/colorUtils';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Palette, Map as MapIcon, BarChart3, ArrowUpDown, X, Loader2, ArrowUp, ArrowDown, Trophy } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { BoulderDetailDialog } from '@/components/BoulderDetailDialog';
import { Boulder } from '@/types/boulder';
import { Progress } from '@/components/ui/progress';
import { useOnboarding } from '@/components/Onboarding';
// Use a data URL for placeholder to ensure it always works
const placeholder = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAwIiBoZWlnaHQ9IjEyMDAiIGZpbGw9Im5vbmUiPjxyZWN0IHdpZHRoPSIxMjAwIiBoZWlnaHQ9IjEyMDAiIGZpbGw9IiNFQUVBRUEiIHJ4PSIzIi8+PGcgb3BhY2l0eT0iLjUiPjxwYXRoIGZpbGw9IiNGQUZBRkEiIGQ9Ik02MDAuNzA5IDczNi41Yy03NS40NTQgMC0xMzYuNjIxLTYxLjE2Ny0xMzYuNjIxLTEzNi42MiAwLTc1LjQ1NCA2MS4xNjctMTM2LjYyMSAxMzYuNjIxLTEzNi42MjEgNzUuNDUzIDAgMTM2LjYyIDYxLjE2NyAxMzYuNjIgMTM2LjYyMSAwIDc1LjQ1My02MS4xNjcgMTM2LjYyLTEzNi42MiAxMzYuNjJaIi8+PHBhdGggc3Ryb2tlPSIjQzlDOUM5IiBzdHJva2Utd2lkdGg9IjIuNDE4IiBkPSJNNjAwLjcwOSA3MzYuNWMtNzUuNDU0IDAtMTM2LjYyMS02MS4xNjctMTM2LjYyMS0xMzYuNjIgMC03NS40NTQgNjEuMTY3LTEzNi42MjEgMTM2LjYyMS0xMzYuNjIxIDc1LjQ1MyAwIDEzNi42MiA2MS4xNjcgMTM2LjYyIDEzNi42MjEgMCA3NS40NTMtNjEuMTY3IDEzNi42Mi0xMzYuNjIgMTM2LjYyWiIvPjwvZz48L3N2Zz4=';

const DIFFICULTIES = [null, 1, 2, 3, 4, 5, 6, 7, 8]; // null = "?" (unknown/not rated)
const formatDifficulty = (d: number | null): string => d === null ? '?' : String(d);
const COLORS = ['Grün','Gelb','Blau','Orange','Rot','Schwarz','Weiß','Lila'];
const COLOR_HEX: Record<string, string> = {
  'Grün': '#22c55e',
  'Gelb': '#facc15',
  'Blau': '#3b82f6',
  'Orange': '#f97316',
  'Rot': '#ef4444',
  'Schwarz': '#111827',
  'Weiß': '#ffffff',
  'Lila': '#a855f7',
};
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

const Guest = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loadedThumbnails, setLoadedThumbnails] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const { data: colors } = useColors();
  const { isOpen: isOnboardingOpen } = useOnboarding();
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [colorFilter, setColorFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'difficulty' | 'date'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  // Guest area doesn't need auth, but we still wait for auth to finish loading to avoid race conditions
  const { loading: authLoading } = useAuth();
  const { data: boulders, isLoading: isLoadingBoulders, error: bouldersError } = useBouldersWithSectors(!authLoading);
  const { data: sectors, isLoading: isLoadingSectors, error: sectorsError } = useSectorsTransformed(!authLoading);
  
  // Note: Hooks already have refetchOnMount: true, so data will be reloaded automatically
  const [selectedBoulder, setSelectedBoulder] = useState<Boulder | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [quickFilter, setQuickFilter] = useState<null | 'sector' | 'difficulty' | 'color' | 'sort'>(null);

  useEffect(() => {
    console.log('[Guest] mounted');
    return () => console.log('[Guest] unmounted');
  }, []);

  useEffect(() => {
    console.log('[Guest] Boulders data:', {
      isLoading: isLoadingBoulders,
      hasData: !!boulders,
      count: boulders?.length || 0,
      error: bouldersError,
    });
    if (boulders && boulders.length > 0) {
      console.log('[Guest] Sample boulder:', boulders[0]);
      console.log('[Guest] Boulder statuses:', boulders.map(b => ({ name: b.name, status: (b as any).status })));
      console.log('[Guest] Boulder thumbnails:', boulders.map(b => ({ 
        name: b.name, 
        thumbnailUrl: b.thumbnailUrl,
        betaVideoUrl: b.betaVideoUrl 
      })));
    }
    if (bouldersError) {
      console.error('[Guest] Boulder loading error:', bouldersError);
    }
  }, [boulders, isLoadingBoulders, bouldersError]);

  useEffect(() => {
    if (sectorsError) {
      console.error('[Guest] Sectors loading error:', sectorsError);
    }
  }, [sectorsError]);

  useEffect(() => {
    const sectorParam = searchParams.get('sector');
    if (sectorParam) setSectorFilter(sectorParam);
  }, [searchParams]);

  const filtered = useMemo(() => {
    let list = boulders || [];
    
    console.log('[Guest] Filtering boulders:', {
      total: boulders?.length || 0,
      sectorFilter,
      difficultyFilter,
      colorFilter,
      searchQuery,
    });
    
    // show only hanging boulders in guest view
    const beforeStatusFilter = list.length;
    list = list.filter((b:any) => {
      const status = (b as any).status;
      const isHanging = status !== 'abgeschraubt';
      if (!isHanging && beforeStatusFilter > 0) {
        console.log('[Guest] Filtered out boulder:', b.name, 'status:', status);
      }
      return isHanging;
    });
    console.log('[Guest] After status filter (hanging only):', list.length, 'of', beforeStatusFilter);
    
    if (sectorFilter !== 'all') {
      // Filter: Boulder erscheint, wenn er in einem der beiden Sektoren ist
      const beforeSectorFilter = list.length;
      list = list.filter(b => {
        const inSector1 = b.sector === sectorFilter;
        const inSector2 = b.sector2 === sectorFilter;
        return inSector1 || inSector2;
      });
      console.log('[Guest] After sector filter:', list.length, 'of', beforeSectorFilter);
    }
    if (difficultyFilter !== 'all') {
      const beforeDifficultyFilter = list.length;
      list = list.filter(b => {
        const bDifficulty = b.difficulty === null ? '?' : String(b.difficulty);
        return bDifficulty === difficultyFilter;
      });
      console.log('[Guest] After difficulty filter:', list.length, 'of', beforeDifficultyFilter);
    }
    if (colorFilter !== 'all') {
      const beforeColorFilter = list.length;
      list = list.filter(b => b.color === colorFilter);
      console.log('[Guest] After color filter:', list.length, 'of', beforeColorFilter);
    }
    if (searchQuery.trim()) {
      const beforeSearchFilter = list.length;
      const q = searchQuery.toLowerCase();
      list = list.filter(b => {
        const sectorText = b.sector2 ? `${b.sector} → ${b.sector2}` : b.sector;
        return b.name.toLowerCase().includes(q) || sectorText.toLowerCase().includes(q);
      });
      console.log('[Guest] After search filter:', list.length, 'of', beforeSearchFilter);
    }
    
    // Sortierung
    const sorted = [...list].sort((a, b) => {
      let result = 0;
      switch (sortBy) {
        case 'name':
          result = a.name.localeCompare(b.name, 'de');
          break;
        case 'difficulty':
          const aDiff = a.difficulty === null ? -1 : a.difficulty;
          const bDiff = b.difficulty === null ? -1 : b.difficulty;
          result = aDiff - bDiff;
          break;
        case 'date':
          const aDate = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt || 0).getTime();
          const bDate = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt || 0).getTime();
          result = aDate - bDate;
          break;
      }
      return sortOrder === 'asc' ? result : -result;
    });
    
    console.log('[Guest] Final filtered and sorted count:', sorted.length);
    return sorted;
  }, [boulders, sectorFilter, difficultyFilter, colorFilter, searchQuery, sortBy, sortOrder]);

  // Reset loaded thumbnails when filtered list changes
  useEffect(() => {
    setLoadedThumbnails(new Set());
  }, [filtered.length, sectorFilter, difficultyFilter, colorFilter, searchQuery]);

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

  // Preload ALL thumbnails before showing the page
  useEffect(() => {
    if (!filtered || filtered.length === 0) {
      // No thumbnails to load, page can be shown
      return;
    }
    
    // Get all thumbnail URLs that need to be loaded (exclude placeholders)
    const allThumbnailUrls = filtered
      .map(b => thumbnailUrlMap.get(b.id) || placeholder)
      .filter(url => url !== placeholder);
    
    if (allThumbnailUrls.length === 0) {
      // No real thumbnails to load, page can be shown
      return;
    }
    
    // Filter out already loaded thumbnails
    const thumbnailsToLoad = allThumbnailUrls.filter(url => !loadedThumbnails.has(url));
    
    if (thumbnailsToLoad.length === 0) {
      // All thumbnails already loaded
      return;
    }
    
    console.log(`[Guest] Preloading ${thumbnailsToLoad.length} thumbnails before showing page...`);
    
    // Load all thumbnails with staggered timing to avoid overwhelming the browser
    thumbnailsToLoad.forEach((url, index) => {
      const delay = index < 6 ? 0 : (index - 6) * 10; // First 6 immediate, rest with 10ms delay
      
      setTimeout(() => {
        const img = new Image();
        img.onload = () => {
          setLoadedThumbnails(prev => {
            const next = new Set(prev);
            next.add(url);
            return next;
          });
        };
        img.onerror = () => {
          // Mark as loaded even on error (will show placeholder)
          setLoadedThumbnails(prev => {
            const next = new Set(prev);
            next.add(url);
            return next;
          });
        };
        // Set src immediately to start loading
        img.src = url;
        // Use decode() for better performance if available
        if (img.decode) {
          img.decode().catch(() => {});
        }
      }, delay);
    });
  }, [filtered, thumbnailUrlMap, loadedThumbnails]);

  // Check if all thumbnails are loaded
  const allThumbnailsLoaded = useMemo(() => {
    if (!filtered || filtered.length === 0) return true;
    
    // Get all thumbnail URLs that need to be loaded (exclude placeholders)
    const allThumbnailUrls = filtered
      .map(b => thumbnailUrlMap.get(b.id) || placeholder)
      .filter(url => url !== placeholder);
    
    if (allThumbnailUrls.length === 0) return true;
    
    // Check if all thumbnails are loaded
    const allLoaded = allThumbnailUrls.every(url => loadedThumbnails.has(url));
    return allLoaded;
  }, [filtered, thumbnailUrlMap, loadedThumbnails]);

  // Calculate loading progress
  const loadingProgress = useMemo(() => {
    if (!filtered || filtered.length === 0) return 100;
    
    const allThumbnailUrls = filtered
      .map(b => thumbnailUrlMap.get(b.id) || placeholder)
      .filter(url => url !== placeholder);
    
    if (allThumbnailUrls.length === 0) return 100;
    
    const loadedCount = allThumbnailUrls.filter(url => loadedThumbnails.has(url)).length;
    return Math.round((loadedCount / allThumbnailUrls.length) * 100);
  }, [filtered, thumbnailUrlMap, loadedThumbnails]);

  // Removed automatic thumbnail generation - now using manually uploaded thumbnails

  return (
    <div className="min-h-screen bg-[#F9FAF9]">
      {/* Full-Screen Loading Overlay - Show until all thumbnails are loaded */}
      {!allThumbnailsLoaded && (
        <div className="fixed inset-0 z-50 bg-[#F9FAF9] flex items-center justify-center">
          <div className="text-center space-y-4 max-w-sm mx-auto px-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Thumbnails werden geladen...</h2>
              <p className="text-sm text-muted-foreground">
                Bitte warten, während die Bilder vorbereitet werden
              </p>
              <div className="space-y-1 pt-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Fortschritt</span>
                  <span>{loadingProgress}%</span>
                </div>
                <Progress value={loadingProgress} className="h-2" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Only visible when all thumbnails are loaded */}
      <div className={allThumbnailsLoaded ? '' : 'opacity-0 pointer-events-none'}>
        <header 
          className="sticky top-0 z-30 border-b border-[#E7F7E9] bg-white"
          style={{ 
            paddingTop: 'max(env(safe-area-inset-top, 0px), 0px)',
          }}
        >
          <div className="max-w-4xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-heading font-bold tracking-wide leading-none text-[#13112B]">BOULDER</h1>
              <p className="text-xs text-[#13112B]/60 mt-1">Filtere die Boulder. Für mehr Infos anmelden.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl border border-[#E7F7E9] bg-[#F9FAF9] text-[#13112B]">
                <span className="inline-block w-2 h-2 rounded-xl bg-[#36B531]" />
                {filtered.length} Treffer
              </span>
              <Button 
                size="sm" 
                className="h-9 rounded-xl bg-[#36B531] text-white hover:bg-[#2DA029]"
                onClick={() => { 
                  console.log('[Guest] CTA clicked → hard redirect to /auth');
                  window.location.href = '/auth';
                }}
              >
                Mehr erfahren – Anmelden
              </Button>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-8 max-w-4xl mx-auto">
          {/* Nikolaus Wettkampf Navigation Card - Temporarily hidden */}
          {false && (
            <Card className="mb-6 bg-white border border-[#E7F7E9] rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-[#E7F7E9] flex items-center justify-center">
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
                    className="w-full sm:w-auto min-w-[140px] h-11 rounded-xl bg-[#36B531] text-white hover:bg-[#2DA029] font-semibold shadow-sm hover:shadow-md transition-shadow"
                  >
                    <Trophy className="w-5 h-5 mr-2" />
                    Zum Wettkampf
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

      {/* Desktop filter row */}
      <div className="hidden sm:flex flex-row gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#13112B]/50" />
          <Input 
            className="pl-9 h-11 rounded-xl border border-[#E7F7E9] focus:ring-2 focus:ring-[#36B531] focus:border-[#36B531]" 
            placeholder="Suchen..." 
            value={searchQuery} 
            onChange={(e)=>setSearchQuery(e.target.value)} 
          />
        </div>
        <Select value={sectorFilter} onValueChange={setSectorFilter}>
          <SelectTrigger className="w-44 h-11 rounded-xl border-[#E7F7E9]">
            <SelectValue placeholder="Sektor">
              {sectorFilter === 'all' ? 'Sektor' : sectorFilter}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl border-[#E7F7E9]">
            <SelectItem value="all">Sektor</SelectItem>
            {sectors?.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
          <SelectTrigger className="w-32 h-11 rounded-xl border-[#E7F7E9]">
            <SelectValue placeholder="Grad">
              {difficultyFilter === 'all' ? 'Grad' : formatDifficulty(difficultyFilter === '?' ? null : Number(difficultyFilter))}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl border-[#E7F7E9]">
            <SelectItem value="all">Grad</SelectItem>
            {DIFFICULTIES.map(d => <SelectItem key={d === null ? '?' : String(d)} value={d === null ? '?' : String(d)}>{formatDifficulty(d)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={colorFilter} onValueChange={setColorFilter}>
          <SelectTrigger className="w-40 h-11 rounded-xl border-[#E7F7E9]">
            <SelectValue placeholder="Farbe">
              {colorFilter === 'all' ? 'Farbe' : colorFilter}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl border-[#E7F7E9]">
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Farbe
              </div>
            </SelectItem>
            {colors?.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map((c) => (
              <SelectItem key={c.name} value={c.name}>
                <div className="flex items-center gap-2">
                  <span 
                    className="w-4 h-4 rounded-xl border border-[#E7F7E9] flex-shrink-0"
                    style={getColorBackgroundStyle(c.name, colors)}
                  />
                  {c.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
          <SelectTrigger className="w-40 h-11 rounded-xl border-[#E7F7E9]">
            <SelectValue placeholder="Sortieren nach">
              {sortBy === 'date' ? 'Datum' : sortBy === 'name' ? 'Name' : 'Schwierigkeit'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl border-[#E7F7E9]">
            <SelectItem value="date">Datum</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="difficulty">Schwierigkeit</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="w-11 h-11 rounded-xl border-[#E7F7E9] hover:bg-[#E7F7E9]"
        >
          {sortOrder === 'asc' ? (
            <ArrowUp className="w-5 h-5" />
          ) : (
            <ArrowDown className="w-5 h-5" />
          )}
        </Button>
      </div>

      {/* Mobile: no top search; use floating filter bar below */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}>
        {filtered.map((b, index) => (
          <Card 
            key={b.id} 
            className="bg-white border border-[#E7F7E9] rounded-2xl shadow-sm hover:bg-muted/50 cursor-pointer transition-colors group h-[100px] sm:h-[112px] overflow-hidden"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('[Guest] Boulder clicked:', b.id, b.name);
              setSelectedBoulder(b);
              setDialogOpen(true);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSelectedBoulder(b);
                setDialogOpen(true);
              }
            }}
          >
            <CardContent className="p-0 pointer-events-none flex h-full items-center gap-3 px-4">
              {/* Thumbnail links - quadratisch */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-xl overflow-hidden bg-muted">
                <img 
                  className="w-full h-full object-cover pointer-events-none transition-opacity duration-300" 
                  src={getThumbnailUrl(b)} 
                  alt={b.name}
                  loading={index < 18 ? "eager" : "lazy"}
                  decoding="async"
                  fetchPriority={index < 6 ? "high" : index < 18 ? "auto" : "low"}
                  style={{ 
                    objectFit: 'cover',
                    objectPosition: 'center',
                    opacity: 0
                  }}
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    const thumbnailUrl = getThumbnailUrl(b);
                    
                    // Check if image is landscape (width > height) and rotate it to portrait
                    if (img.naturalWidth > img.naturalHeight) {
                      // Landscape image: rotate 90° clockwise to make it portrait
                      img.style.transform = 'rotate(90deg)';
                      console.log(`[Guest] Rotating landscape thumbnail to portrait: ${img.naturalWidth}x${img.naturalHeight}`);
                    }
                    
                    img.style.opacity = '1';
                    
                    // Track loaded thumbnail (skip placeholder)
                    if (thumbnailUrl !== placeholder) {
                      setLoadedThumbnails(prev => {
                        const next = new Set(prev);
                        next.add(thumbnailUrl);
                        return next;
                      });
                    }
                  }}
                  onError={(e) => {
                    // Fallback to placeholder if image fails to load
                    if (e.currentTarget.src !== placeholder) {
                      e.currentTarget.src = placeholder;
                      e.currentTarget.style.opacity = '1';
                    }
                  }}
                />
              </div>
              {/* Content Mitte */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h4 className="font-heading text-base sm:text-lg font-semibold text-[#13112B] truncate mb-0.5">{b.name}</h4>
                <span className="text-xs sm:text-sm text-[#13112B]/60 truncate">
                  {b.sector2 ? `${b.sector} → ${b.sector2}` : b.sector}
                </span>
              </div>
              {/* Difficulty Badge rechts - quadratisch */}
              <div className="flex-shrink-0">
                <span 
                  className={cn(
                    "w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-xl text-base sm:text-lg font-semibold",
                    TEXT_ON_COLOR[b.color] || 'text-white'
                  )}
                  style={getColorBackgroundStyle(b.color, colors)}
                >
                  {formatDifficulty(b.difficulty)}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Boulder Detail Dialog */}
      {selectedBoulder && (
        <BoulderDetailDialog
          boulder={selectedBoulder}
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setSelectedBoulder(null);
            }
          }}
        />
      )}

      

      {/* Quick Filter Bar (mobile) */}
      {quickFilter && (
        <div className="sm:hidden fixed left-4 right-4 bottom-20 z-[100] pointer-events-none">
          <div className="pointer-events-auto rounded-2xl bg-[#13112B] text-white shadow-2xl border border-white/10 overflow-hidden">
            <div className="flex items-center px-3 py-2">
              <span className="px-3 py-1 bg-white/10 rounded-xl text-xs font-semibold">
                {quickFilter === 'color' ? 'Farbe' : quickFilter === 'sector' ? 'Sektor' : quickFilter === 'difficulty' ? 'Schwierigkeit' : 'Sortierung'}
              </span>
            </div>
            <div className="px-3 pb-3">
              {quickFilter === 'color' && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <button 
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-semibold shadow transition",
                        colorFilter === 'all' 
                          ? "bg-[#36B531] text-white" 
                          : "bg-white/10 text-white/70 hover:text-white"
                      )}
                      onClick={() => setColorFilter('all')}
                    >
                      Alle
                    </button>
                  </div>
                  <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1 h-10">
                    {colors?.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map(c => {
                      const colorHex = getColorBackgroundStyle(c.name, colors).backgroundColor || '#000';
                      const isWhite = colorHex === '#ffffff' || colorHex === 'white' || c.name.toLowerCase() === 'weiß';
                      return (
                        <button
                          key={c.name}
                          className={cn(
                            "w-10 h-10 rounded-xl border shadow",
                            isWhite ? "bg-white border-gray-200" : "border-black/10"
                          )}
                          style={!isWhite ? { backgroundColor: colorHex } : undefined}
                          onClick={() => setColorFilter(c.name)}
                          aria-label={`Filter Farbe ${c.name}`}
                        />
                      );
                    })}
                  </div>
                </>
              )}
              {quickFilter === 'sector' && (
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 h-10">
                  <button 
                    className={cn(
                      "h-10 px-3 rounded-xl text-xs font-semibold shadow transition whitespace-nowrap flex items-center",
                      sectorFilter === 'all' 
                        ? "bg-[#36B531] text-white" 
                        : "bg-white/10 text-white/70 hover:text-white"
                    )}
                    onClick={() => setSectorFilter('all')}
                  >
                    Alle
                  </button>
                  {sectors?.map(s => (
                    <button
                      key={s.id}
                      className={cn(
                        "h-10 px-3 rounded-xl text-xs font-semibold shadow transition whitespace-nowrap flex items-center",
                        sectorFilter === s.name 
                          ? "bg-[#36B531] text-white" 
                          : "bg-white/10 text-white/70 hover:text-white"
                      )}
                      onClick={() => setSectorFilter(s.name)}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
              {quickFilter === 'difficulty' && (
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 h-10">
                  <button 
                    className={cn(
                      "h-10 px-3 rounded-xl text-xs font-semibold shadow transition whitespace-nowrap flex items-center",
                      difficultyFilter === 'all' 
                        ? "bg-[#36B531] text-white" 
                        : "bg-white/10 text-white/70 hover:text-white"
                    )}
                    onClick={() => setDifficultyFilter('all')}
                  >
                    Alle
                  </button>
                  {DIFFICULTIES.map(d => {
                    const dStr = d === null ? '?' : String(d);
                    return (
                      <button
                        key={dStr}
                        className={cn(
                          "w-10 h-10 rounded-xl text-xs font-semibold shadow transition flex items-center justify-center",
                          difficultyFilter === dStr 
                            ? "bg-[#36B531] text-white" 
                            : "bg-white/10 text-white/70 hover:text-white"
                        )}
                        onClick={() => setDifficultyFilter(dStr)}
                      >
                        {formatDifficulty(d)}
                      </button>
                    );
                  })}
                </div>
              )}
              {quickFilter === 'sort' && (
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 h-10">
                  <button 
                    className={cn(
                      "h-10 px-3 rounded-xl text-xs font-semibold shadow transition whitespace-nowrap flex items-center",
                      sortBy === 'date' 
                        ? "bg-[#36B531] text-white" 
                        : "bg-white/10 text-white/70 hover:text-white"
                    )}
                    onClick={() => setSortBy('date')}
                  >
                    Datum
                  </button>
                  <button 
                    className={cn(
                      "h-10 px-3 rounded-xl text-xs font-semibold shadow transition whitespace-nowrap flex items-center",
                      sortBy === 'name' 
                        ? "bg-[#36B531] text-white" 
                        : "bg-white/10 text-white/70 hover:text-white"
                    )}
                    onClick={() => setSortBy('name')}
                  >
                    Name
                  </button>
                  <button 
                    className={cn(
                      "h-10 px-3 rounded-xl text-xs font-semibold shadow transition whitespace-nowrap flex items-center",
                      sortBy === 'difficulty' 
                        ? "bg-[#36B531] text-white" 
                        : "bg-white/10 text-white/70 hover:text-white"
                    )}
                    onClick={() => setSortBy('difficulty')}
                  >
                    Schwierigkeit
                  </button>
                  <div className="h-10 w-px bg-white/20 mx-1" />
                  <button 
                    className="h-10 px-3 bg-white/10 text-white/70 hover:text-white rounded-xl text-xs font-semibold shadow transition flex items-center gap-1"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  >
                    {sortOrder === 'asc' ? (
                      <ArrowUp className="w-3 h-3" />
                    ) : (
                      <ArrowDown className="w-3 h-3" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Floating Filter Bar (mobile) */}
      {!isOnboardingOpen && (
      <nav className="sm:hidden fixed bottom-4 left-4 right-4 z-[100]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}>
        <div className="bg-[#13112B] text-white rounded-2xl shadow-2xl border border-white/10 px-2 py-2 flex items-center justify-between">
          <div>
            <button className="h-10 px-3 bg-white text-[#13112B] rounded-xl text-xs font-semibold shadow-sm active:scale-95 transition flex items-center">
              {filtered.length} Treffer
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuickFilter(prev => prev === 'color' ? null : 'color')}
              className="w-10 h-10 rounded-xl bg-white text-[#13112B] flex items-center justify-center shadow-sm active:scale-95"
              aria-label="Farbe filtern"
            >
              {colorFilter !== 'all' ? (
                <span 
                  className="w-5 h-5 rounded-xl border border-[#13112B]/20" 
                  style={getColorBackgroundStyle(colorFilter, colors || [])}
                />
              ) : (
                <Palette className="w-5 h-5" strokeWidth={1.5} />
              )}
            </button>
            <button
              onClick={() => setQuickFilter(prev => prev === 'sector' ? null : 'sector')}
              className="w-10 h-10 rounded-xl bg-white text-[#13112B] flex items-center justify-center shadow-sm active:scale-95"
              aria-label="Sektionen filtern"
            >
              <MapIcon className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setQuickFilter(prev => prev === 'difficulty' ? null : 'difficulty')}
              className="w-10 h-10 rounded-xl bg-white text-[#13112B] flex items-center justify-center shadow-sm active:scale-95"
              aria-label="Schwierigkeit filtern"
            >
              {difficultyFilter !== 'all' ? (
                <span className="text-[11px] font-semibold leading-none">{difficultyFilter}</span>
              ) : (
                <BarChart3 className="w-5 h-5" strokeWidth={1.5} />
              )}
            </button>
            <button
              onClick={() => setQuickFilter(prev => prev === 'sort' ? null : 'sort')}
              className="w-10 h-10 rounded-xl bg-white text-[#13112B] flex items-center justify-center shadow-sm active:scale-95"
              aria-label="Sortieren"
            >
              <ArrowUpDown className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </nav>
      )}
      <div className="h-24 sm:h-0" />
        </main>
      </div>
    </div>
  );
};

export default Guest;


