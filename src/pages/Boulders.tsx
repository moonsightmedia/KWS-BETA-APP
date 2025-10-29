import { useState, useMemo, useEffect, useRef } from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { Sidebar } from '@/components/Sidebar';
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
import { formatDate } from 'date-fns';
import { de } from 'date-fns/locale';
import { Search, Video, FileText, Calendar, Filter, ArrowUpDown, ArrowUp, ArrowDown, AlertCircle, Palette, Map, Dumbbell, X } from 'lucide-react';
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
  const [selectedBoulder, setSelectedBoulder] = useState<Boulder | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [quickFilter, setQuickFilter] = useState<null | 'sector' | 'difficulty' | 'color'>(null);
  const [scrollTo, setScrollTo] = useState<null | 'sector' | 'difficulty' | 'color'>(null);
  const sectorRef = useRef<HTMLDivElement | null>(null);
  const difficultyRef = useRef<HTMLDivElement | null>(null);
  const colorRef = useRef<HTMLDivElement | null>(null);

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
                           boulder.sector.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSector = sectorFilter === 'all' || boulder.sector === sectorFilter;
      const matchesDifficulty = difficultyFilter === 'all' || boulder.difficulty.toString() === difficultyFilter;
      const matchesColor = colorFilter === 'all' || boulder.color === colorFilter;
      
      return matchesSearch && matchesSector && matchesDifficulty && matchesColor;
    });

    // Sort
    filtered.sort((a, b) => {
      let result = 0;
      switch (sortBy) {
        case 'name':
          result = a.name.localeCompare(b.name);
          break;
        case 'difficulty':
          result = a.difficulty - b.difficulty;
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
  }, [boulders, searchQuery, sectorFilter, difficultyFilter, colorFilter, sortBy, sortOrder]);

  const handleBoulderClick = (boulder: Boulder) => {
    setSelectedBoulder(boulder);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar />
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
        <Sidebar />
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
      <Sidebar />
      
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="flex-shrink-0">
                  <Filter className="w-5 h-5" />
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
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sektor</label>
                    <Select value={sectorFilter} onValueChange={setSectorFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Alle Sektoren" />
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
                        <SelectValue placeholder="Alle Schwierigkeiten" />
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
                        <SelectValue placeholder="Alle Farben" />
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
                                    style={!colorInfo?.bg ? { backgroundColor: colorInfo?.hex || '#9ca3af' } : {}}
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
                            <SelectValue placeholder="Sortieren nach" />
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAndSortedBoulders.map((boulder) => (
              <Card 
                key={boulder.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleBoulderClick(boulder)}
              >
              <CardHeader>
                  <div className="flex items-start justify-between mb-3">
                    <div className="space-y-2">
                      <CardTitle className="text-lg">{boulder.name}</CardTitle>
                      <Badge variant="outline" className="font-medium">
                        {boulder.sector}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-6 h-6 rounded-full border grid place-items-center text-[11px] font-semibold ${TEXT_ON_COLOR[boulder.color] || 'text-white'}`}
                        title={boulder.color}
                        style={{ backgroundColor: COLOR_HEX[boulder.color] || '#9ca3af' }}
                      >
                        {boulder.difficulty}
                      </span>
                      {boulder.status && (
                        <Badge variant={boulder.status === 'haengt' ? 'default' : 'secondary'}>
                          {boulder.status === 'haengt' ? 'Hängt' : 'Abgeschraubt'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  {boulder.note && (
                    <div className="flex items-start gap-2 text-sm">
                      <FileText className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <p className="text-muted-foreground">{boulder.note}</p>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Erstellt: {formatDate(boulder.createdAt, 'dd. MMM yyyy', { locale: de })}</span>
                  </div>

                  {boulder.betaVideoUrl && (
                    <Button variant="outline" size="sm" className="w-full">
                      <Video className="w-4 h-4 mr-2" />
                      Beta Video ansehen
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
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
          <div className="sm:hidden fixed left-4 right-4 bottom-24 z-[60] bg-sidebar-bg rounded-2xl shadow-2xl border border-border">
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
                    {[1,2,3,4,5,6,7,8].map(d => (
                      <Button key={d} variant={difficultyFilter===String(d)?'default':'outline'} size="sm" onClick={()=> setDifficultyFilter(String(d))}>
                        {d}
                      </Button>
                    ))}
                  </>
                )}
                {quickFilter === 'color' && (
                  <>
                    <Button variant={colorFilter==='all'?'default':'outline'} size="sm" onClick={()=> setColorFilter('all')}>Alle</Button>
                    {Object.keys(COLOR_MAP).map(c => (
                      <Button key={c} variant={colorFilter===c?'default':'outline'} size="sm" onClick={()=> setColorFilter(c)}>
                        <span className="inline-flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full border" />
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

        {/* Floating Filter Bar (mobile) */}
        <nav className="sm:hidden fixed bottom-28 left-4 right-4 z-[60] bg-sidebar-bg rounded-2xl shadow-2xl border border-border">
          <div className="flex items-center justify-between px-3 py-2 gap-2">
            <span className="text-xs px-3 py-1 rounded-full border bg-card">{filteredAndSortedBoulders.length} Treffer</span>
            <div className="flex items-center gap-2">
              <Sheet open={filterOpen} onOpenChange={(open)=>{ setFilterOpen(open); if(!open) setScrollTo(null); }}>
                <Button aria-label="Farben filtern" variant="outline" size="icon" onClick={()=> setQuickFilter(prev => prev === 'color' ? null : 'color')}>
                  {colorFilter !== 'all' ? (
                    <span className="w-5 h-5 rounded-full border" />
                  ) : (
                    <Palette className="w-5 h-5" />
                  )}
                </Button>
                <Button aria-label="Sektor filtern" variant="outline" size="icon" onClick={()=> setQuickFilter(prev => prev === 'sector' ? null : 'sector')}>
                  <span className="relative inline-flex">
                    <Map className="w-5 h-5" />
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
                    <SheetTitle>{scrollTo === null ? 'Filter' : scrollTo === 'sector' ? 'Sektor wählen' : scrollTo === 'difficulty' ? 'Schwierigkeit wählen' : 'Farbe wählen'}</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input className="pl-9" placeholder="Suchen" value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} />
                    </div>
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
                    <div ref={difficultyRef}>
                      <label className="text-sm font-medium">Schwierigkeit</label>
                      <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                        <SelectTrigger><SelectValue placeholder="Grad" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle</SelectItem>
                          {[1,2,3,4,5,6,7,8].map(d => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div ref={colorRef}>
                      <label className="text-sm font-medium">Farbe</label>
                      <Select value={colorFilter} onValueChange={setColorFilter}>
                        <SelectTrigger><SelectValue placeholder="Farbe" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle</SelectItem>
                          {Object.keys(COLOR_MAP).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
};

export default Boulders;
