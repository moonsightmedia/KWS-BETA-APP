import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useBouldersWithSectors } from '@/hooks/useBoulders';
import { useSectorsTransformed } from '@/hooks/useSectors';
import { useColors } from '@/hooks/useColors';
import { getColorBackgroundStyle } from '@/utils/colorUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Filter, Search, Palette, Map as MapIcon, Dumbbell, X, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { BoulderDetailDialog } from '@/components/BoulderDetailDialog';
import { Boulder } from '@/types/boulder';
import { Progress } from '@/components/ui/progress';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [colorFilter, setColorFilter] = useState<string>('all');
  const { data: boulders, isLoading: isLoadingBoulders, error: bouldersError } = useBouldersWithSectors();
  const { data: sectors, isLoading: isLoadingSectors, error: sectorsError } = useSectorsTransformed();
  
  // Note: Hooks already have refetchOnMount: true, so data will be reloaded automatically
  const [selectedBoulder, setSelectedBoulder] = useState<Boulder | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [scrollTo, setScrollTo] = useState<null | 'sector' | 'difficulty' | 'color'>(null);
  const [quickFilter, setQuickFilter] = useState<null | 'sector' | 'difficulty' | 'color'>(null);
  const sectorRef = useRef<HTMLDivElement | null>(null);
  const difficultyRef = useRef<HTMLDivElement | null>(null);
  const colorRef = useRef<HTMLDivElement | null>(null);

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

  // Auto-scroll to section when filter sheet opens
  useEffect(() => {
    if (filterOpen && scrollTo) {
      const timeout = setTimeout(() => {
        const el = scrollTo === 'sector' ? sectorRef.current : scrollTo === 'difficulty' ? difficultyRef.current : colorRef.current;
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setScrollTo(null);
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [filterOpen, scrollTo]);

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
    
    console.log('[Guest] Final filtered count:', list.length);
    return list;
  }, [boulders, sectorFilter, difficultyFilter, colorFilter, searchQuery]);

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
    <div className="min-h-screen bg-background">
      {/* Full-Screen Loading Overlay - Show until all thumbnails are loaded */}
      {!allThumbnailsLoaded && (
        <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
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
        <header className="sticky top-0 z-30 border-b bg-gradient-to-b from-primary/10 to-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-teko tracking-wide leading-none">Boulder (Gastansicht)</h1>
              <p className="text-xs text-muted-foreground mt-1">Filtere die Boulder. Für mehr Infos anmelden.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border bg-card">
                <span className="inline-block w-2 h-2 rounded-full bg-primary" />
                {filtered.length} Treffer
              </span>
              <Button size="sm" onClick={() => { 
                console.log('[Guest] CTA clicked → hard redirect to /auth');
                window.location.href = '/auth';
              }}>
                Mehr erfahren – Anmelden
              </Button>
            </div>
          </div>
        </header>

        <main className="p-4 max-w-4xl mx-auto">

      {/* Desktop filter row */}
      <div className="hidden sm:flex flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Suchen" value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} />
        </div>
        <Select value={sectorFilter} onValueChange={setSectorFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Sektor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            {sectors?.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Grad" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            {DIFFICULTIES.map(d => <SelectItem key={d === null ? '?' : String(d)} value={d === null ? '?' : String(d)}>{formatDifficulty(d)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={colorFilter} onValueChange={setColorFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Farbe" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            {COLORS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Mobile: no top search; use floating filter bar below */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {filtered.map((b, index) => (
          <Card 
            key={b.id} 
            className="hover:bg-muted/50 cursor-pointer transition-colors h-[120px] sm:h-[140px] overflow-hidden"
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
            <CardContent className="p-0 pointer-events-none flex h-full">
              {/* Thumbnail links - Portrait aspect ratio for vertical images */}
              <div className="w-20 sm:w-24 flex-shrink-0 h-full relative overflow-hidden bg-muted">
                <img 
                  className="w-full h-full object-cover pointer-events-none transition-opacity duration-200" 
                  src={getThumbnailUrl(b)} 
                  alt={b.name}
                  loading={index < 18 ? "eager" : "lazy"}
                  decoding="async"
                  fetchPriority={index < 6 ? "high" : index < 18 ? "auto" : "low"}
                  style={{ 
                    objectFit: 'cover',
                    objectPosition: 'center',
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
                    }
                  }}
                />
              </div>
              {/* Content rechts */}
              <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between min-w-0">
                <div>
                  <div className="font-medium text-sm sm:text-base truncate">{b.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    <div className="truncate">{b.sector2 ? `${b.sector} → ${b.sector2}` : b.sector}</div>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span 
                    className="w-6 h-6 rounded-full border grid place-items-center text-[11px] font-semibold flex-shrink-0 text-white" 
                    style={getColorBackgroundStyle(b.color, colors)}
                  >
                    {formatDifficulty(b.difficulty)}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">{b.color}</span>
                </div>
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

      

      {/* Floating Filter Bar (mobile) */}
      {quickFilter && (
        <div className="sm:hidden fixed left-4 right-4 bottom-24 z-50 bg-sidebar-bg rounded-2xl shadow-2xl border border-border">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs px-2 py-1 rounded-full border bg-card">
              {quickFilter === 'color' ? 'Farbe' : quickFilter === 'sector' ? 'Sektor' : 'Schwierigkeit'}
            </span>
            <Button variant="ghost" size="icon" onClick={()=> setQuickFilter(null)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <ScrollArea className="w-full">
            <div className="flex items-center gap-2 px-3 pb-3 min-w-max">
              {quickFilter === 'sector' && (
                <>
                  <Button variant={sectorFilter==='all'?'default':'outline'} size="sm" onClick={()=> setSectorFilter('all')}>Alle</Button>
                  {sectors?.map(s => (
                    <Button key={s.id} variant={sectorFilter===s.name?'default':'outline'} size="sm" onClick={()=> setSectorFilter(s.name)}>
                      {s.name}
                    </Button>
                  ))}
                </>
              )}
              {quickFilter === 'difficulty' && (
                <>
                  <Button variant={difficultyFilter==='all'?'default':'outline'} size="sm" onClick={()=> setDifficultyFilter('all')}>Alle</Button>
                  {DIFFICULTIES.map(d => {
                    const dStr = d === null ? '?' : String(d);
                    return (
                      <Button key={dStr} variant={difficultyFilter===dStr?'default':'outline'} size="sm" onClick={()=> setDifficultyFilter(dStr)}>
                        {formatDifficulty(d)}
                      </Button>
                    );
                  })}
                </>
              )}
              {quickFilter === 'color' && (
                <>
                  <Button variant={colorFilter==='all'?'default':'outline'} size="sm" onClick={()=> setColorFilter('all')}>Alle</Button>
                  {COLORS.map(c => (
                    <Button key={c} variant={colorFilter===c?'default':'outline'} size="sm" onClick={()=> setColorFilter(c)}>
                      <span className="inline-flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: COLOR_HEX[c] || '#9ca3af' }} />
                        {c}
                      </span>
                    </Button>
                  ))}
                </>
              )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}
      <nav className="sm:hidden fixed bottom-4 left-4 right-4 z-40 bg-sidebar-bg rounded-2xl shadow-2xl border border-border">
        <div className="flex items-center justify-between px-3 py-2 gap-2">
          <span className="text-xs px-3 py-1 rounded-full border bg-card">{filtered.length} Treffer</span>
          <div className="flex items-center gap-2">
            <Sheet open={filterOpen} onOpenChange={(open)=>{ setFilterOpen(open); if(!open) setScrollTo(null); }}>
              <Button aria-label="Farben filtern" variant="outline" size="icon" onClick={()=> setQuickFilter(prev => prev === 'color' ? null : 'color')}>
                {colorFilter !== 'all' ? (
                  <span className="w-5 h-5 rounded-full border" style={{ backgroundColor: COLOR_HEX[colorFilter] || '#22c55e' }} />
                ) : (
                  <Palette className="w-5 h-5" />
                )}
              </Button>
              <Button aria-label="Sektor filtern" variant="outline" size="icon" onClick={()=> setQuickFilter(prev => prev === 'sector' ? null : 'sector')}>
                <span className="relative inline-flex">
                  <MapIcon className="w-5 h-5" />
                  {sectorFilter !== 'all' && <span className="absolute -right-0.5 -bottom-0.5 w-2 h-2 rounded-full bg-primary border border-background" />}
                </span>
              </Button>
              <Button aria-label="Schwierigkeit filtern" variant="outline" size="icon" onClick={()=> setQuickFilter(prev => prev === 'difficulty' ? null : 'difficulty')}>
                {difficultyFilter !== 'all' ? (
                  <span className="w-5 h-5 grid place-items-center text-[11px] font-semibold leading-none">{difficultyFilter}</span>
                ) : (
                  <Dumbbell className="w-5 h-5" />
                )}
              </Button>
              <Button variant="outline" size="icon" onClick={()=>{ setScrollTo(null); setFilterOpen(true); }}><Filter className="w-5 h-5" /></Button>
              <SheetContent side="bottom" className="h-[85vh]">
              <SheetHeader>
                <SheetTitle>
                  {scrollTo === 'color' ? 'Farbe wählen' : scrollTo === 'sector' ? 'Sektor wählen' : scrollTo === 'difficulty' ? 'Schwierigkeit wählen' : 'Filter'}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-3">
                {scrollTo === null && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Suchen" value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} />
                  </div>
                )}

                {(scrollTo === null || scrollTo === 'sector') && (
                  <div ref={sectorRef}>
                    <label className="text-sm font-medium">Sektor</label>
                    <Select value={sectorFilter} onValueChange={setSectorFilter}>
                      <SelectTrigger><SelectValue placeholder="Sektor" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle</SelectItem>
                        {sectors?.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(scrollTo === null || scrollTo === 'difficulty') && (
                  <div ref={difficultyRef}>
                    <label className="text-sm font-medium">Schwierigkeit</label>
                    <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                      <SelectTrigger><SelectValue placeholder="Grad" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle</SelectItem>
                        {DIFFICULTIES.map(d => <SelectItem key={d === null ? '?' : String(d)} value={d === null ? '?' : String(d)}>{formatDifficulty(d)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(scrollTo === null || scrollTo === 'color') && (
                  <div ref={colorRef}>
                    <label className="text-sm font-medium">Farbe</label>
                    <Select value={colorFilter} onValueChange={setColorFilter}>
                      <SelectTrigger><SelectValue placeholder="Farbe" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle</SelectItem>
                        {COLORS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
      <div className="h-24 sm:h-0" />
        </main>
      </div>
    </div>
  );
};

export default Guest;


