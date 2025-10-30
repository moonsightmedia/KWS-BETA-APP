import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useBouldersWithSectors } from '@/hooks/useBoulders';
import { useSectorsTransformed } from '@/hooks/useSectors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Filter, Search, Palette, Map, Dumbbell, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import placeholder from '/placeholder.svg';

const DIFFICULTIES = [1,2,3,4,5,6,7,8];
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
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [colorFilter, setColorFilter] = useState<string>('all');
  const { data: boulders } = useBouldersWithSectors();
  const { data: sectors } = useSectorsTransformed();
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
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
    const sectorParam = searchParams.get('sector');
    if (sectorParam) setSectorFilter(sectorParam);
  }, [searchParams]);

  const filtered = useMemo(() => {
    let list = boulders || [];
    // show only hanging boulders in guest view
    list = list.filter((b:any) => (b as any).status !== 'abgeschraubt');
    if (sectorFilter !== 'all') list = list.filter(b => b.sector === sectorFilter);
    if (difficultyFilter !== 'all') list = list.filter(b => String(b.difficulty) === difficultyFilter);
    if (colorFilter !== 'all') list = list.filter(b => b.color === colorFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(b => b.name.toLowerCase().includes(q) || b.sector.toLowerCase().includes(q));
    }
    return list;
  }, [boulders, sectorFilter, difficultyFilter, colorFilter, searchQuery]);

  // Helpers for thumbnails
  const ytId = (url: string) => {
    const m = url.match(/^.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
    return m && m[1].length === 11 ? m[1] : null;
  };
  const vimeoId = (url: string) => {
    const m = url.match(/vimeo\.com\/(\d+)/);
    return m ? m[1] : null;
  };

  useEffect(() => {
    const run = async () => {
      const next: Record<string, string> = { ...thumbs };
      for (const b of filtered) {
        if (!b.betaVideoUrl || next[b.id]) continue;
        const url = b.betaVideoUrl;
        const yid = ytId(url);
        if (yid) { next[b.id] = `https://img.youtube.com/vi/${yid}/hqdefault.jpg`; continue; }
        const vid = vimeoId(url);
        if (vid) { next[b.id] = `https://vumbnail.com/${vid}.jpg`; continue; }
        // Try to extract middle frame for direct video URLs
        try {
          const video = document.createElement('video');
          video.crossOrigin = 'anonymous';
          video.preload = 'metadata';
          video.src = url;
          await new Promise(resolve => video.addEventListener('loadedmetadata', resolve, { once: true }));
          const mid = Math.max(0, (video.duration || 1) / 2);
          video.currentTime = mid;
          await new Promise(resolve => video.addEventListener('seeked', resolve, { once: true }));
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 360;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            next[b.id] = canvas.toDataURL('image/jpeg');
          }
        } catch {
          next[b.id] = placeholder;
        }
      }
      setThumbs(next);
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

  return (
    <div className="min-h-screen bg-background">
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
            {DIFFICULTIES.map(d => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}
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

      <div className="grid gap-3">
        {filtered.map(b => (
          <Card key={b.id} className="hover:bg-muted/50">
            <CardContent className="p-0">
              <img className="w-full aspect-video object-cover rounded-t-lg" src={thumbs[b.id] || placeholder} alt={b.name} />
              <div className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{b.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>{b.sector}</span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <span className={`w-6 h-6 rounded-full border grid place-items-center text-[11px] font-semibold ${TEXT_ON_COLOR[b.color] || 'text-white'}`} style={{ backgroundColor: COLOR_HEX[b.color] || '#9ca3af' }}>
                        {b.difficulty}
                      </span>
                      {b.color}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      

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
                  {DIFFICULTIES.map(d => (
                    <Button key={d} variant={difficultyFilter===String(d)?'default':'outline'} size="sm" onClick={()=> setDifficultyFilter(String(d))}>
                      {d}
                    </Button>
                  ))}
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
                        {DIFFICULTIES.map(d => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}
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
              {/* Auto-scroll to section when opened via quick button */}
              {filterOpen && scrollTo && (
                <span className="sr-only">
                  {setTimeout(() => {
                    const el = scrollTo === 'sector' ? sectorRef.current : scrollTo === 'difficulty' ? difficultyRef.current : colorRef.current;
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    setScrollTo(null);
                  }, 50)}
                </span>
              )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
      <div className="h-24 sm:h-0" />
      </main>
    </div>
  );
};

export default Guest;


