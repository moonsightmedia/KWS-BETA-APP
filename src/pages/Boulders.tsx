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
import { getColorBackgroundStyle } from '@/utils/colorUtils';
import { cn } from '@/lib/utils';
import { formatDate } from 'date-fns';
import { de } from 'date-fns/locale';
import { Search, Video, FileText, Calendar, Filter, ArrowUpDown, ArrowUp, ArrowDown, AlertCircle, Palette, Map, Dumbbell, X, CheckCircle2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
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
  const [showOnlyHanging, setShowOnlyHanging] = useState(false);
  const [selectedBoulder, setSelectedBoulder] = useState<Boulder | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [quickFilter, setQuickFilter] = useState<null | 'sector' | 'difficulty' | 'color' | 'sort'>(null);
  const { data: colors } = useColors();

  const { data: boulders, isLoading: isLoadingBoulders, error: bouldersError } = useBouldersWithSectors();
  const { data: sectors, isLoading: isLoadingSectors } = useSectorsTransformed();
  const isLoading = isLoadingBoulders || isLoadingSectors;

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
      const matchesStatus = !showOnlyHanging || boulder.status === 'haengt';
      
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
      <div className="min-h-screen bg-background flex">
        <div className="flex-1 flex flex-col md:ml-20 mb-20 md:mb-0">
          <DashboardHeader />
          <main className="flex-1 p-4 md:p-8">
            <div className="mb-8">
              <Skeleton className="h-9 w-48 mb-2" />
              <Skeleton className="h-5 w-64" />
            </div>
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
      <div className="min-h-screen bg-background flex">
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
    <div className="min-h-screen bg-background flex">
      <div className="flex-1 flex flex-col md:ml-20 mb-20 md:mb-0">
        <DashboardHeader />
        
        <main className="flex-1 p-4 md:p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2 font-teko tracking-wide">Boulder</h1>
            <p className="text-muted-foreground">
              {filteredAndSortedBoulders.length} von {boulders?.length || 0} Bouldern
            </p>
          </div>

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

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="flex-shrink-0">
                  <Filter className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[85vh]">
                <SheetHeader>
                  <SheetTitle className="font-teko text-2xl tracking-wide">Filter</SheetTitle>
                  <SheetDescription>
                    Filtere nach Sektor, Schwierigkeit und sortiere die Boulder
                  </SheetDescription>
                </SheetHeader>
                
                <div className="mt-6 space-y-4">
                  {/* Toggle for only hanging boulders */}
                  <div className="flex items-center justify-between p-3 border rounded-md bg-card">
                    <Label htmlFor="show-only-hanging-filter" className="text-sm font-medium cursor-pointer">
                      Nur hängende Boulder anzeigen
                    </Label>
                    <Switch
                      id="show-only-hanging-filter"
                      checked={showOnlyHanging}
                      onCheckedChange={setShowOnlyHanging}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sektor</label>
                    <Select value={sectorFilter} onValueChange={setSectorFilter}>
                      <SelectTrigger>
                        <SelectValue>
                          {sectorFilter === 'all' ? 'Alle Sektoren' : sectorFilter}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-card z-50">
                        <SelectItem value="all">Alle Sektoren</SelectItem>
                        {sectors?.map((sector) => (
                          <SelectItem key={sector.id} value={sector.name}>
                            {sector.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Schwierigkeit</label>
                    <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                      <SelectTrigger>
                        <SelectValue>
                          {difficultyFilter === 'all' ? 'Alle Schwierigkeiten' : `Schwierigkeit ${difficultyFilter}`}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-card z-50">
                        <SelectItem value="all">Alle Schwierigkeiten</SelectItem>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((diff) => (
                          <SelectItem key={diff} value={diff.toString()}>
                            Schwierigkeit {diff}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Farbe</label>
                    <Select value={colorFilter} onValueChange={setColorFilter}>
                      <SelectTrigger>
                        <SelectValue>
                          {colorFilter === 'all' ? 'Alle Farben' : colorFilter}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-card z-50">
                        <SelectItem value="all">Alle Farben</SelectItem>
                        {(() => {
                          // Sammle alle einzigartigen Farben aus den Bouldern
                          const uniqueColors = new Set<string>();
                          boulders?.forEach(b => uniqueColors.add(b.color));
                          const sortedColors = Array.from(uniqueColors).sort();
                          
                          return sortedColors.map((color) => {
                            const colorInfo = COLOR_MAP[color];
                            return (
                              <SelectItem key={color} value={color}>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className={`w-4 h-4 rounded-full border ${colorInfo?.bg || ''} ${colorInfo?.border || ''}`}
                                    style={!colorInfo?.bg ? { backgroundColor: '#9ca3af' } : {}}
                                  />
                                  {color}
                                </div>
                              </SelectItem>
                            );
                          });
                        })()}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sortierung</label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                          <SelectTrigger>
                            <SelectValue>
                              {sortBy === 'date' ? 'Datum' : sortBy === 'name' ? 'Name' : 'Schwierigkeit'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="bg-card z-50">
                            <SelectItem value="date">Datum</SelectItem>
                            <SelectItem value="difficulty">Schwierigkeit</SelectItem>
                            <SelectItem value="name">Name</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      >
                        {sortOrder === 'asc' ? (
                          <ArrowUp className="w-4 h-4" />
                        ) : (
                          <ArrowDown className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      {filteredAndSortedBoulders.length} von {boulders?.length || 0} Bouldern gefunden
                    </p>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Boulder Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                className="hover:bg-muted/50 cursor-pointer transition-colors h-[120px] sm:h-[140px] overflow-hidden"
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
                <CardContent className="p-0 pointer-events-none flex h-full">
                  {/* Thumbnail links */}
                  <div className="w-20 sm:w-24 flex-shrink-0 h-full relative overflow-hidden bg-muted">
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
                  {/* Content rechts */}
                  <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="font-medium text-sm sm:text-base truncate">{boulder.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        <div className="truncate">{boulder.sector2 ? `${boulder.sector} → ${boulder.sector2}` : boulder.sector}</div>
                      </div>
                      {boulder.status && (
                        <Badge 
                          variant={boulder.status === 'haengt' ? 'default' : 'secondary'} 
                          className="mt-1 text-[10px] px-1.5 py-0"
                        >
                          {boulder.status === 'haengt' ? 'Hängt' : 'Abgeschraubt'}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span 
                        className="w-6 h-6 rounded-full border grid place-items-center text-[11px] font-semibold flex-shrink-0 text-white" 
                        style={getColorBackgroundStyle(boulder.color, colors)}
                      >
                        {boulder.difficulty === null ? '?' : boulder.difficulty}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">{boulder.color}</span>
                    </div>
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
          <div className="sm:hidden fixed left-4 right-4 bottom-44 z-[100] bg-sidebar-bg rounded-2xl shadow-2xl border border-border">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-xs px-2 py-1 rounded-full border bg-card">
                {quickFilter === 'color' ? 'Farbe' : quickFilter === 'sector' ? 'Sektor' : quickFilter === 'difficulty' ? 'Schwierigkeit' : 'Sortierung'}
              </span>
              <Button variant="ghost" size="icon" onClick={()=> setQuickFilter(null)}>
                <X className="w-6 h-6" />
              </Button>
            </div>
          <ScrollArea className="w-full scrollbar-hide">
            <div className={cn(
              "flex items-center gap-2 px-3 pb-3 min-w-max",
              quickFilter === 'color' && "py-2"
            )}>
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
                    {[null, 1, 2, 3, 4, 5, 6, 7, 8].map(d => {
                      const dStr = d === null ? '?' : String(d);
                      const formatDifficulty = (d: number | null): string => d === null ? '?' : String(d);
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
                    {colors?.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map(c => (
                      <Button 
                        key={c.name} 
                        variant="outline" 
                        size="sm" 
                        onClick={()=> setColorFilter(c.name)}
                        className={cn(
                          "w-10 h-10 rounded-full p-0 flex items-center justify-center border-2 transition-all",
                          colorFilter === c.name 
                            ? "border-primary shadow-lg scale-110" 
                            : "border-border hover:border-primary/50 hover:scale-105"
                        )}
                        title={c.name}
                      >
                        <span 
                          className="w-6 h-6 rounded-full"
                          style={getColorBackgroundStyle(c.name, colors)}
                        >
                          {colorFilter === c.name && (
                            <div className="w-full h-full rounded-full bg-white/90 shadow-sm" />
                          )}
                        </span>
                      </Button>
                    ))}
                  </>
                )}
                {quickFilter === 'sort' && (
                  <>
                    <Button 
                      variant={sortBy==='date'?'default':'outline'} 
                      size="sm" 
                      onClick={()=> setSortBy('date')}
                    >
                      Datum
                    </Button>
                    <Button 
                      variant={sortBy==='name'?'default':'outline'} 
                      size="sm" 
                      onClick={()=> setSortBy('name')}
                    >
                      Name
                    </Button>
                    <Button 
                      variant={sortBy==='difficulty'?'default':'outline'} 
                      size="sm" 
                      onClick={()=> setSortBy('difficulty')}
                    >
                      Schwierigkeit
                    </Button>
                    <div className="h-6 w-px bg-border mx-1" />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={()=> setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="flex items-center gap-1"
                    >
                      {sortOrder === 'asc' ? (
                        <ArrowUp className="w-3 h-3" />
                      ) : (
                        <ArrowDown className="w-3 h-3" />
                      )}
                    </Button>
                  </>
                )}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        )}

        {/* Floating Filter Bar (mobile) */}
        <nav className="sm:hidden fixed bottom-28 left-4 right-4 z-[100] bg-sidebar-bg rounded-2xl shadow-2xl border border-border">
          <div className="flex items-center justify-between px-3 py-2 gap-2">
            <span className="text-xs px-3 py-1 rounded-full border bg-card">{filteredAndSortedBoulders.length} Treffer</span>
            <div className="flex items-center gap-2">
              <Button 
                aria-label="Farben filtern" 
                variant={quickFilter === 'color' ? 'default' : 'outline'} 
                size="icon" 
                onClick={()=> setQuickFilter(prev => prev === 'color' ? null : 'color')}
              >
                {colorFilter !== 'all' ? (
                  <span className="w-5 h-5 rounded-full border" />
                ) : (
                  <Palette className="w-5 h-5" />
                )}
              </Button>
              <Button 
                aria-label="Sektor filtern" 
                variant={quickFilter === 'sector' ? 'default' : 'outline'} 
                size="icon" 
                onClick={()=> setQuickFilter(prev => prev === 'sector' ? null : 'sector')}
              >
                <span className="relative inline-flex">
                  <Map className="w-6 h-6" />
                  {sectorFilter !== 'all' && <span className="absolute -right-0.5 -bottom-0.5 w-2 h-2 rounded-full bg-primary border border-background" />}
                </span>
              </Button>
              <Button 
                aria-label="Schwierigkeit filtern" 
                variant={quickFilter === 'difficulty' ? 'default' : 'outline'} 
                size="icon" 
                onClick={()=> setQuickFilter(prev => prev === 'difficulty' ? null : 'difficulty')}
              >
                {difficultyFilter !== 'all' ? (
                  <span className="w-5 h-5 grid place-items-center text-[11px] font-semibold leading-none">{difficultyFilter}</span>
                ) : (
                  <Dumbbell className="w-6 h-6" />
                )}
              </Button>
              <Button 
                variant={quickFilter === 'sort' ? 'default' : 'outline'} 
                size="icon" 
                onClick={()=> setQuickFilter(prev => prev === 'sort' ? null : 'sort')}
                aria-label="Sortierung"
              >
                <Filter className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
};

export default Boulders;
