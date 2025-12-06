import { useState, useMemo, useEffect, useRef } from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { BoulderDetailDialog } from '@/components/BoulderDetailDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useBouldersWithSectors } from '@/hooks/useBoulders';
import { useSectorsTransformed } from '@/hooks/useSectors';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { getColorBackgroundStyle } from '@/utils/colorUtils';
import { cn } from '@/lib/utils';
import { formatDate } from 'date-fns';
import { de } from 'date-fns/locale';
import { Search, Video, FileText, Calendar, ArrowUpDown, ArrowUp, ArrowDown, AlertCircle, Palette, Map, BarChart3, Filter, X, CheckCircle2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Boulder } from '@/types/boulder';
import { useSearchParams } from 'react-router-dom';

const difficultyColors: Record<number, string> = {
  1: 'bg-green-500',
  2: 'bg-green-600',
  3: 'bg-yellow-500',
  4: 'bg-yellow-600',
  5: 'bg-orange-500',
  6: 'bg-orange-600',
  7: 'bg-red-500',
  8: 'bg-red-700',
};

const COLOR_MAP: Record<string, { bg: string; border: string }> = {
  'Grün': { bg: 'bg-green-500', border: 'border-green-600' },
  'Gelb': { bg: 'bg-yellow-400', border: 'border-yellow-500' },
  'Blau': { bg: 'bg-blue-500', border: 'border-blue-600' },
  'Orange': { bg: 'bg-orange-500', border: 'border-orange-600' },
  'Rot': { bg: 'bg-red-500', border: 'border-red-600' },
  'Schwarz': { bg: 'bg-gray-900', border: 'border-gray-950' },
  'Weiß': { bg: 'bg-white', border: 'border-gray-300' },
  'Lila': { bg: 'bg-purple-500', border: 'border-purple-600' },
};

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

const Boulders = () => {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [colorFilter, setColorFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'difficulty' | 'date'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showOnlyHanging, setShowOnlyHanging] = useState(true);
  const [selectedBoulder, setSelectedBoulder] = useState<Boulder | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [quickFilter, setQuickFilter] = useState<null | 'sector' | 'difficulty' | 'color' | 'sort'>(null);
  const { data: colors } = useColors();

  const { user, loading: authLoading } = useAuth();
  // CRITICAL: Only run queries after auth loading is complete
  const { data: boulders, isLoading: isLoadingBoulders, error: bouldersError } = useBouldersWithSectors(!authLoading);
  const { data: sectors, isLoading: isLoadingSectors } = useSectorsTransformed(!authLoading);
  const isLoading = isLoadingBoulders || isLoadingSectors;
  const queryClient = useQueryClient();

  // Log when component is mounted
  useEffect(() => {
    console.log('[Boulders] Component mounted');
  }, []);

  // CRITICAL FIX: Monitor queries for hanging and cancel/refetch if needed
  useEffect(() => {
    if (!authLoading && user) {
      // Monitor queries for 15 seconds - if still loading, cancel and refetch
      const timeoutId = setTimeout(() => {
        const bouldersQuery = queryClient.getQueryState(['boulders']);
        const sectorsQuery = queryClient.getQueryState(['sectors']);
        
        // If queries are still pending after 15s, cancel and refetch
        if (bouldersQuery?.status === 'pending') {
          console.warn('[Boulders] Query [boulders] still pending after 15s - canceling and refetching');
          queryClient.cancelQueries({ queryKey: ['boulders'] });
          queryClient.refetchQueries({ queryKey: ['boulders'] });
        }
        
        if (sectorsQuery?.status === 'pending') {
          console.warn('[Boulders] Query [sectors] still pending after 15s - canceling and refetching');
          queryClient.cancelQueries({ queryKey: ['sectors'] });
          queryClient.refetchQueries({ queryKey: ['sectors'] });
        }
      }, 15000); // 15 second timeout
      
      return () => clearTimeout(timeoutId);
    }
  }, [authLoading, user, queryClient]);

  // Read sector from URL params on mount
  useEffect(() => {
    const sectorParam = searchParams.get('sector');
    if (sectorParam) {
      setSectorFilter(sectorParam);
    }
  }, [searchParams]);

  const filteredAndSortedBoulders = useMemo(() => {
    if (!boulders) return [];

    let filtered = boulders.filter((boulder) => {
      const matchesSearch = boulder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (boulder.sector2 ? `${boulder.sector} → ${boulder.sector2}` : boulder.sector).toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSector = sectorFilter === 'all' || boulder.sector === sectorFilter || boulder.sector2 === sectorFilter;
      const matchesDifficulty = difficultyFilter === 'all' || (boulder.difficulty === null ? '?' : String(boulder.difficulty)) === difficultyFilter;
      const matchesColor = colorFilter === 'all' || boulder.color === colorFilter;
      const matchesStatus = showOnlyHanging ? boulder.status === 'haengt' : true;
      
      return matchesSearch && matchesSector && matchesDifficulty && matchesColor && matchesStatus;
    });

    // Sort
    filtered.sort((a, b) => {
      let result = 0;
      switch (sortBy) {
        case 'name':
          result = a.name.localeCompare(b.name);
          break;
        case 'difficulty':
          const aDiff = a.difficulty === null ? 999 : a.difficulty;
          const bDiff = b.difficulty === null ? 999 : b.difficulty;
          result = aDiff - bDiff;
          break;
        case 'date':
          result = b.createdAt.getTime() - a.createdAt.getTime();
          break;
        default:
          return 0;
      }
      return sortOrder === 'asc' ? result : -result;
    });

      return filtered;
  }, [boulders, searchQuery, sectorFilter, difficultyFilter, colorFilter, sortBy, sortOrder, showOnlyHanging]);

  const handleBoulderClick = (boulder: Boulder) => {
    setSelectedBoulder(boulder);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F9FAF9] flex">
        <div className="flex-1 flex flex-col md:ml-20 mb-20 md:mb-0">
          <DashboardHeader />
          <main className="flex-1 p-4 md:p-8">
            <div className="flex gap-3 mb-6">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-10" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-32 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
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
      <div className="min-h-screen bg-[#F9FAF9] flex">
        <div className="flex-1 flex flex-col md:ml-20 mb-20 md:mb-0">
          <DashboardHeader />
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
    <div className="min-h-screen bg-[#F9FAF9] flex">
      <div className="flex-1 flex flex-col md:ml-20 mb-20 md:mb-0">
        <DashboardHeader />
        
        <main 
          className="flex-1 p-4 md:p-8"
          style={{
            paddingTop: 'max(calc(1rem + env(safe-area-inset-top, 0px)), 1rem)'
          }}
        >
          {/* Search and Filter */}
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Toggle for only hanging boulders */}
            <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-card">
              <Switch
                id="show-only-hanging"
                checked={showOnlyHanging}
                onCheckedChange={setShowOnlyHanging}
              />
              <Label htmlFor="show-only-hanging" className="text-sm font-medium cursor-pointer whitespace-nowrap">
                Nur hängende
              </Label>
            </div>
          </div>

          {/* Boulder Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pb-24 md:pb-4" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}>
            {filteredAndSortedBoulders.map((boulder) => {
              // Get thumbnail URL for boulder
              const getThumbnailUrl = (b: Boulder): string => {
                if (b.thumbnailUrl) {
                  // Fix old URLs that incorrectly include /videos/ in the path
                  let url = b.thumbnailUrl;
                  if (url.includes('cdn.kletterwelt-sauerland.de/uploads/videos/')) {
                    url = url.replace('/uploads/videos/', '/uploads/');
                  }
                  return url;
                }
                // Use placeholder
                return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAwIiBoZWlnaHQ9IjEyMDAiIGZpbGw9Im5vbmUiPjxyZWN0IHdpZHRoPSIxMjAwIiBoZWlnaHQ9IjEyMDAiIGZpbGw9IiNFQUVBRUEiIHJ4PSIzIi8+PGcgb3BhY2l0eT0iLjUiPjxwYXRoIGZpbGw9IiNGQUZBRkEiIGQ9Ik02MDAuNzA5IDczNi41Yy03NS40NTQgMC0xMzYuNjIxLTYxLjE2Ny0xMzYuNjIxLTEzNi42MiAwLTc1LjQ1NCA2MS4xNjctMTM2LjYyMSAxMzYuNjIxLTEzNi42MjEgNzUuNDUzIDAgMTM2LjYyIDYxLjE2NyAxMzYuNjIgMTM2LjYyMSAwIDc1LjQ1My02MS4xNjcgMTM2LjYyLTEzNi42MiAxMzYuNjJaIi8+PHBhdGggc3Ryb2tlPSIjQzlDOUM5IiBzdHJva2Utd2lkdGg9IjIuNDE4IiBkPSJNNjAwLjcwOSA3MzYuNWMtNzUuNDU0IDAtMTM2LjYyMS02MS4xNjctMTM2LjYyMS0xMzYuNjIgMC03NS40NTQgNjEuMTY3LTEzNi42MjEgMTM2LjYyMS0xMzYuNjIxIDc1LjQ1MyAwIDEzNi42MiA2MS4xNjcgMTM2LjYyIDEzNi42MjEgMCA3NS40NTMtNjEuMTY3IDEzNi42Mi0xMzYuNjIgMTM2LjYyWiIvPjwvZz48L3N2Zz4=';
              };

              return (
              <Card 
                key={boulder.id} 
                className="bg-white border border-[#E7F7E9] rounded-2xl shadow-sm hover:bg-muted/50 cursor-pointer transition-colors group h-[100px] sm:h-[112px] overflow-hidden"
                onClick={() => handleBoulderClick(boulder)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleBoulderClick(boulder);
                  }
                }}
              >
                <CardContent className="p-0 pointer-events-none flex h-full items-center gap-3 px-4">
                  {/* Thumbnail links - quadratisch */}
                  <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-xl overflow-hidden bg-muted">
                    <img 
                      className="w-full h-full object-cover pointer-events-none transition-opacity duration-300" 
                      src={getThumbnailUrl(boulder)} 
                      alt={boulder.name}
                      loading="lazy"
                      decoding="async"
                      style={{ 
                        objectFit: 'cover',
                        objectPosition: 'center',
                        opacity: 0
                      }}
                      onLoad={(e) => {
                        const img = e.currentTarget;
                        
                        // Check if image is landscape (width > height) and rotate it to portrait
                        if (img.naturalWidth > img.naturalHeight) {
                          // Landscape image: rotate 90° clockwise to make it portrait
                          img.style.transform = 'rotate(90deg)';
                          console.log(`[Boulders] Rotating landscape thumbnail to portrait: ${img.naturalWidth}x${img.naturalHeight}`);
                        }
                        
                        img.style.opacity = '1';
                      }}
                      onError={(e) => {
                        const placeholder = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAwIiBoZWlnaHQ9IjEyMDAiIGZpbGw9Im5vbmUiPjxyZWN0IHdpZHRoPSIxMjAwIiBoZWlnaHQ9IjEyMDAiIGZpbGw9IiNFQUVBRUEiIHJ4PSIzIi8+PGcgb3BhY2l0eT0iLjUiPjxwYXRoIGZpbGw9IiNGQUZBRkEiIGQ9Ik02MDAuNzA5IDczNi41Yy03NS40NTQgMC0xMzYuNjIxLTYxLjE2Ny0xMzYuNjIxLTEzNi42MiAwLTc1LjQ1NCA2MS4xNjctMTM2LjYyMSAxMzYuNjIxLTEzNi42MjEgNzUuNDUzIDAgMTM2LjYyIDYxLjE2NyAxMzYuNjIgMTM2LjYyMSAwIDc1LjQ1My02MS4xNjcgMTM2LjYyLTEzNi42MiAxMzYuNjJaIi8+PHBhdGggc3Ryb2tlPSIjQzlDOUM5IiBzdHJva2Utd2lkdGg9IjIuNDE4IiBkPSJNNjAwLjcwOSA3MzYuNWMtNzUuNDU0IDAtMTM2LjYyMS02MS4xNjctMTM2LjYyMS0xMzYuNjIgMC03NS40NTQgNjEuMTY3LTEzNi42MjEgMTM2LjYyMS0xMzYuNjIxIDc1LjQ1MyAwIDEzNi42MiA2MS4xNjcgMTM2LjYyIDEzNi42MjEgMCA3NS40NTMtNjEuMTY3IDEzNi42Mi0xMzYuNjIgMTM2LjYyWiIvPjwvZz48L3N2Zz4=';
                        if (e.currentTarget.src !== placeholder) {
                          e.currentTarget.src = placeholder;
                          e.currentTarget.style.opacity = '1';
                        }
                      }}
                    />
                  </div>
                  {/* Content Mitte */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h4 className="font-heading text-base sm:text-lg font-semibold text-[#13112B] truncate mb-0.5">{boulder.name}</h4>
                    <span className="text-xs sm:text-sm text-[#13112B]/60 truncate">
                      {boulder.sector2 ? `${boulder.sector} → ${boulder.sector2}` : boulder.sector}
                    </span>
                  </div>
                  {/* Difficulty Badge rechts - quadratisch */}
                  <div className="flex-shrink-0">
                    <span 
                      className={cn(
                        "w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-xl text-base sm:text-lg font-semibold",
                        TEXT_ON_COLOR[boulder.color] || 'text-white'
                      )}
                      style={getColorBackgroundStyle(boulder.color, colors)}
                    >
                      {boulder.difficulty === null ? '?' : boulder.difficulty}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
            })}
          </div>

          {filteredAndSortedBoulders.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Keine Boulder gefunden.</p>
            </div>
          )}
        </main>

        <BoulderDetailDialog 
          boulder={selectedBoulder}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />

        {/* Quick Filter Bar (mobile) */}
        {quickFilter && (
          <div 
            className="sm:hidden fixed z-[100] pointer-events-none"
            style={{ 
              bottom: 'calc(11rem + env(safe-area-inset-bottom, 0px))',
              left: '1rem',
              right: '1rem',
              width: 'calc(100% - 2rem)',
              maxWidth: '100%'
            }}
          >
            <div className="pointer-events-auto rounded-2xl bg-[#13112B] text-white shadow-2xl border border-white/10 overflow-hidden w-full">
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
                    <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1 h-10 min-w-0 flex-nowrap">
                      {colors?.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map(c => {
                        const colorHex = getColorBackgroundStyle(c.name, colors).backgroundColor || '#000';
                        const isWhite = colorHex === '#ffffff' || colorHex === 'white' || c.name.toLowerCase() === 'weiß';
                        return (
                          <button
                            key={c.name}
                            className={cn(
                              "w-10 h-10 rounded-xl border shadow flex-shrink-0",
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
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 h-10 min-w-0 flex-nowrap">
                    <button 
                      className={cn(
                        "h-10 px-3 rounded-xl text-xs font-semibold shadow transition whitespace-nowrap flex items-center flex-shrink-0",
                        difficultyFilter === 'all' 
                          ? "bg-[#36B531] text-white" 
                          : "bg-white/10 text-white/70 hover:text-white"
                      )}
                      onClick={() => setDifficultyFilter('all')}
                    >
                      Alle
                    </button>
                    {[null, 1, 2, 3, 4, 5, 6, 7, 8].map(d => {
                      const dStr = d === null ? '?' : String(d);
                      return (
                        <button
                          key={dStr}
                          className={cn(
                            "w-10 h-10 rounded-xl text-xs font-semibold shadow transition flex items-center justify-center flex-shrink-0",
                            difficultyFilter === dStr 
                              ? "bg-[#36B531] text-white" 
                              : "bg-white/10 text-white/70 hover:text-white"
                          )}
                          onClick={() => setDifficultyFilter(dStr)}
                        >
                          {dStr}
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
        <nav 
          className="sm:hidden fixed left-4 right-4 z-[100]"
          style={{ bottom: 'calc(7rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="bg-[#13112B] text-white rounded-2xl shadow-2xl border border-white/10 px-2 py-2 flex items-center justify-between">
            <div>
              <button className="h-10 px-3 bg-white text-[#13112B] rounded-xl text-xs font-semibold shadow-sm active:scale-95 transition flex items-center">
                {filteredAndSortedBoulders.length} Treffer
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuickFilter(prev => prev === 'color' ? null : 'color')}
                className="w-10 h-10 rounded-xl bg-white text-[#13112B] flex items-center justify-center shadow-sm active:scale-95"
                aria-label="Farbe filtern"
              >
                {colorFilter !== 'all' ? (
                  <span className="w-5 h-5 rounded-xl border border-[#13112B]/20" style={getColorBackgroundStyle(colorFilter, colors || [])} />
                ) : (
                  <Palette className="w-5 h-5" strokeWidth={1.5} />
                )}
              </button>
              <button
                onClick={() => setQuickFilter(prev => prev === 'sector' ? null : 'sector')}
                className="w-10 h-10 rounded-xl bg-white text-[#13112B] flex items-center justify-center shadow-sm active:scale-95"
                aria-label="Sektionen filtern"
              >
                <Map className="w-5 h-5" strokeWidth={1.5} />
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
      </div>
    </div>
  );
};

export default Boulders;
