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
import { BoulderDetailDialog } from '@/components/BoulderDetailDialog';
import { Boulder } from '@/types/boulder';
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
  const { data: boulders, isLoading: isLoadingBoulders, error: bouldersError } = useBouldersWithSectors();
  const { data: sectors, isLoading: isLoadingSectors, error: sectorsError } = useSectorsTransformed();
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
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
    
    // show only hanging boulders in guest view
    list = list.filter((b:any) => {
      const status = (b as any).status;
      return status !== 'abgeschraubt';
    });
    
    if (sectorFilter !== 'all') {
      // Filter: Boulder erscheint, wenn er in einem der beiden Sektoren ist
      list = list.filter(b => {
        const inSector1 = b.sector === sectorFilter;
        const inSector2 = b.sector2 === sectorFilter;
        return inSector1 || inSector2;
      });
    }
    if (difficultyFilter !== 'all') {
      list = list.filter(b => String(b.difficulty) === difficultyFilter);
    }
    if (colorFilter !== 'all') {
      list = list.filter(b => b.color === colorFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(b => {
        const sectorText = b.sector2 ? `${b.sector} → ${b.sector2}` : b.sector;
        return b.name.toLowerCase().includes(q) || sectorText.toLowerCase().includes(q);
      });
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

  // Create a stable reference for boulder IDs to avoid infinite loops
  const filteredBoulderIds = useMemo(() => {
    return filtered.map(b => b.id).join(',');
  }, [filtered]);

  useEffect(() => {
    let cancelled = false;
    
    const run = async () => {
      // Get current thumbs state using a ref-like approach
      let currentThumbs: Record<string, string> = {};
      setThumbs(prev => {
        currentThumbs = prev;
        return prev;
      });
      
      // Only process boulders that don't have thumbnails yet
      const bouldersToProcess = filtered
        .filter(b => b.betaVideoUrl && !currentThumbs[b.id])
        .slice(0, 5); // Only process first 5 immediately
      
      if (bouldersToProcess.length === 0) return;
      
      // Process thumbnails in parallel for better performance
      const thumbnailPromises = bouldersToProcess.map(async (b) => {
        const url = b.betaVideoUrl!;
        const yid = ytId(url);
        if (yid) {
          return { id: b.id, thumb: `https://img.youtube.com/vi/${yid}/hqdefault.jpg` };
        }
        const vid = vimeoId(url);
        if (vid) {
          return { id: b.id, thumb: `https://vumbnail.com/${vid}.jpg` };
        }
        
        // Try to extract middle frame for direct video URLs (optimized)
        try {
          const video = document.createElement('video');
          video.crossOrigin = 'anonymous';
          video.preload = 'metadata';
          video.muted = true; // Mute to allow autoplay
          video.playsInline = true;
          video.style.display = 'none';
          document.body.appendChild(video);
          video.src = url;
          
          // Wait for metadata to load
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              document.body.removeChild(video);
              reject(new Error('Timeout loading metadata'));
            }, 3000);
            video.addEventListener('loadedmetadata', () => {
              clearTimeout(timeout);
              resolve(null);
            }, { once: true });
            video.addEventListener('error', () => {
              clearTimeout(timeout);
              document.body.removeChild(video);
              reject(new Error('Video load error'));
            }, { once: true });
          });
          
          // Calculate middle time (exactly in the middle)
          const duration = video.duration || 0;
          if (duration <= 0) {
            document.body.removeChild(video);
            return { id: b.id, thumb: placeholder };
          }
          
          const mid = duration / 2;
          
          // Seek to middle and wait for it to complete
          video.currentTime = mid;
          
          // Wait for seek to complete - ensure we're at the middle frame
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              document.body.removeChild(video);
              reject(new Error('Timeout seeking'));
            }, 3000);
            
            const onSeeked = () => {
              // Double-check we're at the middle
              const currentTime = video.currentTime;
              const expectedMid = duration / 2;
              if (Math.abs(currentTime - expectedMid) < 0.5) {
                clearTimeout(timeout);
                video.removeEventListener('seeked', onSeeked);
                video.removeEventListener('error', onError);
                resolve(null);
              }
            };
            
            const onError = () => {
              clearTimeout(timeout);
              video.removeEventListener('seeked', onSeeked);
              video.removeEventListener('error', onError);
              document.body.removeChild(video);
              reject(new Error('Seek error'));
            };
            
            video.addEventListener('seeked', onSeeked, { once: false });
            video.addEventListener('error', onError, { once: false });
            
            // If seeked event doesn't fire, try again
            setTimeout(() => {
              if (Math.abs(video.currentTime - mid) > 0.5) {
                video.currentTime = mid;
              }
            }, 100);
          });
          
          // Use smaller canvas size for faster processing (max 240px width)
          const maxWidth = 240;
          const videoWidth = video.videoWidth || 640;
          const videoHeight = video.videoHeight || 360;
          const aspectRatio = videoHeight / videoWidth;
          const canvas = document.createElement('canvas');
          canvas.width = maxWidth;
          canvas.height = Math.round(maxWidth * aspectRatio);
          
          const ctx = canvas.getContext('2d', { willReadFrequently: false });
          if (ctx && videoWidth > 0 && videoHeight > 0) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const thumb = canvas.toDataURL('image/jpeg', 0.6); // Lower quality for speed
            document.body.removeChild(video);
            return { id: b.id, thumb };
          }
          document.body.removeChild(video);
          return { id: b.id, thumb: placeholder };
        } catch (error) {
          console.warn(`[Guest] Failed to generate thumbnail for ${b.id}:`, error);
          return { id: b.id, thumb: placeholder };
        }
      });
    
      // Wait for all thumbnails to load in parallel
      const results = await Promise.allSettled(thumbnailPromises);
      if (cancelled) return;
      
      const newThumbs: Record<string, string> = {};
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          newThumbs[result.value.id] = result.value.thumb;
        }
      });
      
      if (Object.keys(newThumbs).length > 0) {
        setThumbs(prev => ({ ...prev, ...newThumbs }));
      }
      
      // Load remaining thumbnails lazily (one at a time to avoid overwhelming)
      const remaining = filtered
        .filter(b => b.betaVideoUrl && !currentThumbs[b.id] && !newThumbs[b.id])
        .slice(5); // Skip first 5 that we already processed
      
      // Load remaining thumbnails one by one with delay
      for (const b of remaining) {
        if (cancelled) return;
        await new Promise(resolve => setTimeout(resolve, 200)); // Small delay between each
        
        const url = b.betaVideoUrl!;
        const yid = ytId(url);
        if (yid) {
          setThumbs(prev => ({ ...prev, [b.id]: `https://img.youtube.com/vi/${yid}/hqdefault.jpg` }));
          continue;
        }
        const vid = vimeoId(url);
        if (vid) {
          setThumbs(prev => ({ ...prev, [b.id]: `https://vumbnail.com/${vid}.jpg` }));
          continue;
        }
        
        // For direct video URLs, generate thumbnail in background
        (async () => {
          try {
            const video = document.createElement('video');
            video.crossOrigin = 'anonymous';
            video.preload = 'metadata';
            video.muted = true;
            video.playsInline = true;
            video.style.display = 'none';
            document.body.appendChild(video);
            video.src = url;
            
            await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                document.body.removeChild(video);
                reject(new Error('Timeout'));
              }, 3000);
              video.addEventListener('loadedmetadata', () => {
                clearTimeout(timeout);
                resolve(null);
              }, { once: true });
              video.addEventListener('error', () => {
                clearTimeout(timeout);
                document.body.removeChild(video);
                reject(new Error('Error'));
              }, { once: true });
            });
            
            const duration = video.duration || 0;
            if (duration > 0) {
              const mid = duration / 2;
              video.currentTime = mid;
              
              await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                  document.body.removeChild(video);
                  reject(new Error('Timeout'));
                }, 3000);
                video.addEventListener('seeked', () => {
                  clearTimeout(timeout);
                  resolve(null);
                }, { once: true });
              });
              
              const maxWidth = 240;
              const videoWidth = video.videoWidth || 640;
              const videoHeight = video.videoHeight || 360;
              const aspectRatio = videoHeight / videoWidth;
              const canvas = document.createElement('canvas');
              canvas.width = maxWidth;
              canvas.height = Math.round(maxWidth * aspectRatio);
              
              const ctx = canvas.getContext('2d');
              if (ctx && videoWidth > 0 && videoHeight > 0) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const thumb = canvas.toDataURL('image/jpeg', 0.6);
                document.body.removeChild(video);
                setThumbs(prev => ({ ...prev, [b.id]: thumb }));
              } else {
                document.body.removeChild(video);
                setThumbs(prev => ({ ...prev, [b.id]: placeholder }));
              }
            } else {
              document.body.removeChild(video);
              setThumbs(prev => ({ ...prev, [b.id]: placeholder }));
            }
          } catch {
            setThumbs(prev => ({ ...prev, [b.id]: placeholder }));
          }
        })();
      }
    };
    run();
    
    return () => {
      cancelled = true;
    };
  }, [filteredBoulderIds, filtered]);

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
          <Card 
            key={b.id} 
            className="hover:bg-muted/50 cursor-pointer transition-colors"
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
            <CardContent className="p-0 pointer-events-none">
              <img className="w-full aspect-video object-cover rounded-t-lg pointer-events-none" src={thumbs[b.id] || placeholder} alt={b.name} />
              <div className="p-4 flex items-center justify-between pointer-events-none">
                <div>
                  <div className="font-medium">{b.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>{b.sector2 ? `${b.sector} → ${b.sector2}` : b.sector}</span>
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


