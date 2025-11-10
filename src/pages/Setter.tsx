import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
import { useAuth } from '@/hooks/useAuth';
import { useHasRole } from '@/hooks/useHasRole';
import { useNavigate } from 'react-router-dom';
import { useSectorsTransformed, useUpdateSector } from '@/hooks/useSectors';
import { useBouldersWithSectors, useCreateBoulder, useUpdateBoulder, useBulkUpdateBoulderStatus, useDeleteBoulder } from '@/hooks/useBoulders';
import { uploadBetaVideo } from '@/integrations/supabase/storage';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Search, PlusCircle, Edit3, Calendar, Wrench, Hammer, X, Sparkles } from 'lucide-react';
import { useMemo as useMemoReact, useRef } from 'react';
import { useSectorSchedule, useCreateSectorSchedule, useDeleteSectorSchedule } from '@/hooks/useSectorSchedule';
import { useColors } from '@/hooks/useColors';

const DIFFICULTIES = [1,2,3,4,5,6,7,8];
const DEFAULT_COLORS = ['Grün','Gelb','Blau','Orange','Rot','Schwarz','Weiß','Lila'];
const DEFAULT_COLOR_HEX: Record<string, string> = {
  'Grün': '#22c55e',
  'Gelb': '#facc15',
  'Blau': '#3b82f6',
  'Orange': '#f97316',
  'Rot': '#ef4444',
  'Schwarz': '#111827',
  'Weiß': '#ffffff',
  'Lila': '#a855f7',
};
function getTextClassForHex(hex?: string): string {
  if (!hex) return 'text-white';
  const c = hex.replace('#','');
  const r = parseInt(c.substring(0,2),16);
  const g = parseInt(c.substring(2,4),16);
  const b = parseInt(c.substring(4,6),16);
  const luminance = (0.2126*r + 0.7152*g + 0.0722*b) / 255;
  return luminance > 0.6 ? 'text-black' : 'text-white';
}

// Simple Boulder name generator
const COLOR_ADJECTIVES: Record<string, string> = {
  'Grün': 'Grüner',
  'Gelb': 'Gelber',
  'Blau': 'Blauer',
  'Orange': 'Oranger',
  'Rot': 'Roter',
  'Schwarz': 'Schwarzer',
  'Weiß': 'Weißer',
  'Lila': 'Lilaner',
};
const NAME_ADJECTIVES: string[] = [
  'Wilder', 'Stiller', 'Flinker', 'Mutiger', 'Frecher', 'Geheimer', 'Schneller', 'Kleiner', 'Großer', 'Felsiger',
  'Sanfter', 'Kniffliger', 'Starker', 'Leichter', 'Zäher', 'Kühner', 'Wackerer', 'Frischer', 'Neuer', 'Alter'
];
const NAME_NOUNS: string[] = [
  'Gecko', 'Phantom', 'Panther', 'Meteor', 'Kolibri', 'Specht', 'Saturn', 'Drache', 'Komet', 'Puma',
  'Goblin', 'Adler', 'Wal', 'Berserker', 'Nebel', 'Fuchs', 'Wolf', 'Rätsel', 'Rücken', 'Block'
];
function toColorAdjective(color: string): string {
  return COLOR_ADJECTIVES[color] || '';
}
function getRandom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function generateBoulderName(color: string, difficulty: number): string {
  const parts: string[] = [];
  const colorAdj = toColorAdjective(color);
  if (colorAdj) parts.push(colorAdj);
  parts.push(getRandom(NAME_ADJECTIVES));
  parts.push(getRandom(NAME_NOUNS));
  return parts.join(' ');
}

// If the current name starts with a color adjective, replace it when color changes
function adjustNameForColor(name: string, newColor: string): string {
  if (!name) return name;
  const adjs = Object.values(COLOR_ADJECTIVES);
  const pattern = new RegExp(`^(${adjs.join('|')})\\b`);
  if (!pattern.test(name)) return name;
  const newAdj = toColorAdjective(newColor);
  if (!newAdj) return name;
  return name.replace(pattern, newAdj);
}

const Setter = () => {
  const { session } = useAuth();
  const { hasRole: isSetter, loading: loadingSetter } = useHasRole('setter');
  const { hasRole: isAdmin, loading: loadingAdmin } = useHasRole('admin');
  const navigate = useNavigate();
  const { data: sectors } = useSectorsTransformed();
  const { data: boulders } = useBouldersWithSectors();
  const createBoulder = useCreateBoulder();
  const updateBoulder = useUpdateBoulder();
  const deleteBoulder = useDeleteBoulder();
  const updateSector = useUpdateSector();
  const bulkStatus = useBulkUpdateBoulderStatus();

  useEffect(() => {
    if (!session) navigate('/auth');
  }, [session, navigate]);

  const isLoadingRoles = loadingSetter || loadingAdmin;
  const canAccess = isSetter || isAdmin;

  const [form, setForm] = useState({
    name: '',
    sector_id: '',
    spansMultipleSectors: false,
    sector_id_2: '',
    difficulty: 1,
    color: 'Grün',
    note: '',
    file: null as File | null,
  });
  const [isUploading, setIsUploading] = useState(false);
  const [view, setView] = useState<'create' | 'edit' | 'schedule' | 'status'>('create');
  const [editSearch, setEditSearch] = useState('');
  const [editSector, setEditSector] = useState<string>('all');
  const [editDifficulty, setEditDifficulty] = useState<string>('all');
  const [editColor, setEditColor] = useState<string>('all');
  const [editing, setEditing] = useState<any | null>(null);
  const [scheduleSectorId, setScheduleSectorId] = useState<string>('');
  const [scheduleDate, setScheduleDate] = useState<string>('');
  const scheduleRef = useRef<HTMLDivElement | null>(null);
  const captureInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const { data: schedule } = useSectorSchedule();
  const createSchedule = useCreateSectorSchedule();
  const deleteSchedule = useDeleteSectorSchedule();
  const [statusFilter, setStatusFilter] = useState<'all' | 'haengt' | 'abgeschraubt'>('all');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const { data: colorsDb } = useColors();
  const COLORS = useMemo(() => (colorsDb && colorsDb.length>0 ? colorsDb.map(c=>c.name) : DEFAULT_COLORS), [colorsDb]);
  const COLOR_HEX: Record<string, string> = useMemo(() => {
    if (colorsDb && colorsDb.length>0) {
      const map: Record<string, string> = {};
      colorsDb.forEach(c => { map[c.name] = c.hex; });
      return map;
    }
    return DEFAULT_COLOR_HEX;
  }, [colorsDb]);
  const TEXT_ON_COLOR: Record<string, string> = useMemo(() => {
    const map: Record<string,string> = {};
    (COLORS || []).forEach(name => { map[name] = getTextClassForHex(COLOR_HEX[name]); });
    return map;
  }, [COLORS, COLOR_HEX]);

  const canSubmit = useMemo(() => {
    return !!form.name && !!form.sector_id && form.difficulty >= 1 && form.difficulty <= 8;
  }, [form]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !canAccess) return;
    try {
      setIsUploading(true);
      
      // Create boulder immediately (without video URL if file exists)
      const boulderData = {
        name: form.name,
        sector_id: form.sector_id,
        sector_id_2: form.spansMultipleSectors && form.sector_id_2 ? form.sector_id_2 : null,
        difficulty: form.difficulty,
        color: form.color,
        beta_video_url: form.file ? null : null, // Will be updated after upload
        note: form.note,
      };
      
      const createdBoulder = await createBoulder.mutateAsync(boulderData as any);
      
      // If there's a file, upload it in the background and update the boulder
      if (form.file && createdBoulder?.id) {
        // Show upload progress toast with custom progress bar
        let currentProgress = 0;
        const toastId = toast.custom((t) => (
          <div className="w-full max-w-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Video wird hochgeladen...</span>
              <span className="text-xs text-muted-foreground">{Math.round(currentProgress)}%</span>
            </div>
            <Progress value={currentProgress} className="h-2" />
          </div>
        ), {
          duration: Infinity, // Keep toast open until we dismiss it
        });
        
        // Upload video in background (don't await - let it run async)
        uploadBetaVideo(form.file, (progress) => {
          currentProgress = progress;
          // Update toast with new progress
          toast.custom((t) => (
            <div className="w-full max-w-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Video wird hochgeladen...</span>
                <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          ), {
            id: toastId,
            duration: Infinity,
          });
        }).then((betaUrl) => {
          // Update boulder with video URL after upload completes
          updateBoulder.mutateAsync({
            id: createdBoulder.id,
            beta_video_url: betaUrl,
          } as any).catch((error) => {
            console.error('[Setter] Failed to update boulder with video URL:', error);
            toast.error('Video hochgeladen, aber Boulder konnte nicht aktualisiert werden', {
              description: error.message,
              duration: 5000,
            });
          });
          
          // Update toast to success and auto-dismiss after 3 seconds
          toast.success('Video erfolgreich hochgeladen!', {
            id: toastId,
            duration: 3000, // Auto-dismiss after 3 seconds
          });
        }).catch((error) => {
          console.error('[Setter] Video upload failed:', error);
          toast.error('Fehler beim Hochladen des Videos', {
            id: toastId,
            description: error.message || 'Unbekannter Fehler',
            duration: 5000, // Auto-dismiss after 5 seconds
          });
        });
      }
      
      setForm({ name: '', sector_id: '', spansMultipleSectors: false, sector_id_2: '', difficulty: 1, color: 'Grün', note: '', file: null });
      navigate('/boulders');
    } catch (error: any) {
      // Dismiss any existing upload toast on error
      toast.dismiss();
      toast.error('Fehler beim Erstellen', {
        description: error.message || 'Unbekannter Fehler',
        duration: 5000, // Auto-dismiss after 5 seconds
      });
    } finally {
      setIsUploading(false);
    }
  };

  const filteredBoulders = useMemo(() => {
    let list = boulders || [];
    if (editSector !== 'all') {
      const selectedSectorName = sectors?.find(s => s.id === editSector)?.name;
      // Filter: Boulder erscheint, wenn er in einem der beiden Sektoren ist
      list = list.filter(b => {
        const inSector1 = b.sector === selectedSectorName;
        const inSector2 = b.sector2 === selectedSectorName;
        return inSector1 || inSector2;
      });
    }
    if (statusFilter !== 'all') {
      list = list.filter((b:any) => (b as any).status === statusFilter);
    }
    if (editDifficulty !== 'all') {
      list = list.filter(b => String(b.difficulty) === editDifficulty);
    }
    if (editColor !== 'all') {
      list = list.filter(b => b.color === editColor);
    }
    if (editSearch.trim()) {
      const q = editSearch.toLowerCase();
      list = list.filter(b => {
        const sectorText = b.sector2 ? `${b.sector} → ${b.sector2}` : b.sector;
        return b.name.toLowerCase().includes(q) || sectorText.toLowerCase().includes(q);
      });
    }
    return list.slice(0, 100);
  }, [boulders, editSector, editDifficulty, editColor, editSearch, sectors]);

  const startEdit = (b: any) => {
    setEditing(b);
    setView('edit');
    // map into form-like state
    const sector1Id = sectors?.find(s => s.name === b.sector)?.id || '';
    const sector2Id = b.sector2 ? sectors?.find(s => s.name === b.sector2)?.id || '' : '';
    setForm({
      name: b.name,
      sector_id: sector1Id,
      spansMultipleSectors: !!b.sector2,
      sector_id_2: sector2Id,
      difficulty: b.difficulty,
      color: b.color,
      note: b.note || '',
      file: null,
    });
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setIsUploading(true);
    try {
      // Update boulder immediately (without video URL if new file exists)
      const updateData = {
        id: editing.id,
        name: form.name,
        sector_id: form.sector_id,
        sector_id_2: form.spansMultipleSectors && form.sector_id_2 ? form.sector_id_2 : null,
        difficulty: form.difficulty,
        color: form.color,
        beta_video_url: form.file ? editing.betaVideoUrl || null : editing.betaVideoUrl || null, // Keep existing or null if new file
        note: form.note,
      };
      
      await updateBoulder.mutateAsync(updateData as any);
      
      // If there's a new file, upload it in the background and update the boulder
      if (form.file) {
        // Show upload progress toast with custom progress bar
        let currentProgress = 0;
        const toastId = toast.custom((t) => (
          <div className="w-full max-w-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Video wird hochgeladen...</span>
              <span className="text-xs text-muted-foreground">{Math.round(currentProgress)}%</span>
            </div>
            <Progress value={currentProgress} className="h-2" />
          </div>
        ), {
          duration: Infinity, // Keep toast open until we dismiss it
        });
        
        // Upload video in background (don't await - let it run async)
        uploadBetaVideo(form.file, (progress) => {
          currentProgress = progress;
          // Update toast with new progress
          toast.custom((t) => (
            <div className="w-full max-w-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Video wird hochgeladen...</span>
                <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          ), {
            id: toastId,
            duration: Infinity,
          });
        }).then((betaUrl) => {
          // Update boulder with video URL after upload completes
          updateBoulder.mutateAsync({
            id: editing.id,
            beta_video_url: betaUrl,
          } as any).catch((error) => {
            console.error('[Setter] Failed to update boulder with video URL:', error);
            toast.error('Video hochgeladen, aber Boulder konnte nicht aktualisiert werden', {
              description: error.message,
              duration: 5000,
            });
          });
          
          // Update toast to success and auto-dismiss after 3 seconds
          toast.success('Video erfolgreich hochgeladen!', {
            id: toastId,
            duration: 3000, // Auto-dismiss after 3 seconds
          });
        }).catch((error) => {
          console.error('[Setter] Video upload failed:', error);
          toast.error('Fehler beim Hochladen des Videos', {
            id: toastId,
            description: error.message || 'Unbekannter Fehler',
            duration: 5000, // Auto-dismiss after 5 seconds
          });
        });
      }
      
      setEditing(null);
    } catch (error: any) {
      // Dismiss any existing upload toast on error
      toast.dismiss();
      toast.error('Fehler beim Aktualisieren', {
        description: error.message || 'Unbekannter Fehler',
        duration: 5000, // Auto-dismiss after 5 seconds
      });
    } finally {
      setIsUploading(false);
    }
  };

  const scheduleNextSector = async () => {
    if (!scheduleSectorId || !scheduleDate) return;
    await createSchedule.mutateAsync({ sector_id: scheduleSectorId, scheduled_at: scheduleDate, note: null } as any);
    setScheduleSectorId('');
    setScheduleDate('');
  };

  const weeks = useMemoReact(() => {
    const start = new Date();
    start.setHours(0,0,0,0);
    const day = start.getDay();
    const diff = (day === 0 ? -6 : 1) - day; // Monday as start
    start.setDate(start.getDate() + diff);
    return Array.from({ length: 6 }).map((_, w) => {
      const weekStart = new Date(start);
      weekStart.setDate(start.getDate() + w * 7);
      const days = Array.from({ length: 7 }).map((__, d) => {
        const dt = new Date(weekStart);
        dt.setDate(weekStart.getDate() + d);
        return dt;
      });
      return { weekStart, days };
    });
  }, []);

  const toggleSelect = (id: string) => {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  };
  const selectAll = (ids: string[], value: boolean) => {
    const next: Record<string, boolean> = { ...selected };
    ids.forEach(id => { next[id] = value; });
    setSelected(next);
  };

  const selectedCount = useMemo(() => {
    return (boulders || []).filter(b => selected[(b as any).id]).length;
  }, [boulders, selected]);

  // Warte, bis die Rollen geladen sind, bevor wir "Zugriff verweigert" anzeigen
  if (isLoadingRoles) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Lädt...</p>
        </div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Zugriff verweigert</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Du benötigst die Rolle Setter oder Admin.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar hideMobileNav={view==='status' && selectedCount>0} />
      <div className="flex-1 flex flex-col md:ml-20 mb-20 md:mb-0">
        <DashboardHeader />
        <main className="flex-1 p-4 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2 font-teko tracking-wide">Setter</h1>
            <p className="text-muted-foreground">Boulder anlegen und bearbeiten. Nächsten Sektor planen.</p>
          </div>
          {/* Segmented top control for Setter views */}
          {!(view==='status' && selectedCount>0) && (
            <div className="sticky top-[56px] md:top-[88px] z-30 px-3 md:px-4 mb-3">
              <nav className="bg-sidebar-bg rounded-2xl shadow-2xl border border-border">
                <div className="max-w-7xl mx-auto flex items-center justify-around px-2 py-2">
                  <button
                    className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all ${view==='create' ? 'text-success' : 'text-sidebar-icon'}`}
                    onClick={()=> setView('create')}
                  >
                    <PlusCircle className="w-5 h-5" />
                    <span className="text-xs">Hinzufügen</span>
                  </button>
                  <button
                    className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all ${view==='edit' ? 'text-success' : 'text-sidebar-icon'}`}
                    onClick={()=> setView('edit')}
                  >
                    <Edit3 className="w-5 h-5" />
                    <span className="text-xs">Bearbeiten</span>
                  </button>
                  <button
                    className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all ${view==='status' ? 'text-success' : 'text-sidebar-icon'}`}
                    onClick={()=> setView('status')}
                  >
                    <Wrench className="w-5 h-5" />
                    <span className="text-xs">Status</span>
                  </button>
                  <button
                    className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all ${view==='schedule' ? 'text-success' : 'text-sidebar-icon'}`}
                    onClick={()=> setView('schedule')}
                  >
                    <Calendar className="w-5 h-5" />
                    <span className="text-xs">Schraubtermin</span>
                  </button>
                </div>
              </nav>
            </div>
          )}
          <div className="grid grid-cols-1 md:gap-8 max-w-7xl mx-auto">
            <section className="w-full">
        {view === 'create' && (
            <Card>
              <CardHeader>
                <CardTitle>Neuen Boulder anlegen</CardTitle>
              </CardHeader>
              <CardContent>
                <form id="create-form" onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <div className="flex items-center gap-2">
                <Input id="name" value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})} required className="h-12 text-base flex-1" />
                <Button type="button" variant="outline" className="h-12" onClick={() => setForm({ ...form, name: generateBoulderName(form.color, form.difficulty) })}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Vorschlagen
                </Button>
              </div>
            </div>
            <div>
              <Label>Sektor *</Label>
                    <Select value={form.sector_id} onValueChange={(v)=>setForm({...form, sector_id: v})}>
                      <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Sektor wählen" />
                      </SelectTrigger>
                      <SelectContent>
                  {sectors?.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                      </SelectContent>
                    </Select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="spans-multiple-sectors"
                checked={form.spansMultipleSectors}
                onChange={(e) => setForm({...form, spansMultipleSectors: e.target.checked, sector_id_2: e.target.checked ? form.sector_id_2 : ''})}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="spans-multiple-sectors" className="cursor-pointer">
                Verläuft über mehrere Sektoren
              </Label>
            </div>
            {form.spansMultipleSectors && (
              <div>
                <Label>Endet in Sektor</Label>
                <Select 
                  value={form.sector_id_2} 
                  onValueChange={(v)=>setForm({...form, sector_id_2: v})}
                  disabled={!form.sector_id}
                >
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Sektor wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectors?.filter(s => s.id !== form.sector_id).map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Schwierigkeit *</Label>
                      <Select value={String(form.difficulty)} onValueChange={(v)=>setForm({...form, difficulty: parseInt(v)})}>
                        <SelectTrigger className="h-12 text-base">
                    <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                    {DIFFICULTIES.map(d => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
              </div>
              <div>
                <Label>Farbe *</Label>
                      <Select value={form.color} onValueChange={(v)=>setForm(prev => ({...prev, color: v, name: adjustNameForColor(prev.name, v)}))}>
                        <SelectTrigger className="h-12 text-base">
                    <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                    {COLORS.map(c => (
                      <SelectItem key={c} value={c}>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: COLOR_HEX[c] || '#9ca3af' }} />
                          <span>{c}</span>
                        </div>
                      </SelectItem>
                    ))}
                        </SelectContent>
                      </Select>
              </div>
            </div>
            <div>
              <Label>Beta-Video (optional)</Label>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1 h-12" onClick={()=>captureInputRef.current?.click()}>Video aufnehmen</Button>
                <Button type="button" variant="outline" className="flex-1 h-12" onClick={()=>galleryInputRef.current?.click()}>Aus Galerie</Button>
              </div>
              <input ref={captureInputRef} hidden type="file" accept="video/*" capture="environment" onChange={(e)=>setForm({...form, file: e.target.files?.[0]||null})} />
              <input ref={galleryInputRef} hidden type="file" accept="video/*" onChange={(e)=>setForm({...form, file: e.target.files?.[0]||null})} />
              {form.file && (
                <p className="text-xs text-muted-foreground mt-1 truncate">Ausgewählt: {form.file.name} ({Math.round(form.file.size/1024)} KB)</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">Upload startet beim Speichern.</p>
              {isUploading && <p className="text-xs text-muted-foreground mt-1">Lade hoch…</p>}
            </div>
            <div>
              <Label>Notizen</Label>
                    <Textarea value={form.note} onChange={(e)=>setForm({...form, note: e.target.value})} className="min-h-[100px]" />
            </div>
                </form>
              </CardContent>
              <div className="p-4 pt-0">
                <Button form="create-form" type="submit" className="w-full h-12" disabled={!canSubmit || isUploading}>
                  {isUploading ? 'Speichere…' : 'Speichern'}
                </Button>
              </div>
            </Card>
        )}

        {view === 'edit' && (
            <div className="space-y-4">
              <div className="flex gap-2 sticky top-[56px] z-10 bg-background py-2 overflow-x-auto">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Boulder suchen" className="pl-9 h-11" value={editSearch} onChange={(e)=>setEditSearch(e.target.value)} />
                </div>
                <div className="w-40">
                  <Select value={editSector} onValueChange={setEditSector}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Sektor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle</SelectItem>
                      {sectors?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-36">
                  <Select value={editDifficulty} onValueChange={setEditDifficulty}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Grad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle</SelectItem>
                      {DIFFICULTIES.map(d => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-40">
                  <Select value={editColor} onValueChange={setEditColor}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Farbe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle</SelectItem>
                      {COLORS.map(c => (
                        <SelectItem key={c} value={c}>
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: COLOR_HEX[c] || '#9ca3af' }} />
                            <span>{c}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Quick-Filter wie im Boulderbereich (Farben + Grade) */}
              <div className="flex items-center gap-3 overflow-x-auto py-2">
                <div className="flex items-center gap-2">
                  {COLORS.map(c => (
                    <button key={c} className={`w-7 h-7 rounded-full border ${editColor===c?'ring-2 ring-primary':''}`} style={{ backgroundColor: COLOR_HEX[c] || '#9ca3af' }}
                      onClick={()=>setEditColor(prev=> prev===c ? 'all' : c)}
                      aria-label={`Filter ${c}`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  {DIFFICULTIES.map(d => (
                    <button key={d} onClick={()=>setEditDifficulty(prev=> prev===String(d)?'all':String(d))}
                      className={`w-7 h-7 rounded-full border grid place-items-center text-[11px] font-semibold ${editDifficulty===String(d)?'bg-primary text-primary-foreground':'bg-muted text-foreground'}`}>{d}</button>
                  ))}
                </div>
              </div>

              {!editing ? (
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {filteredBoulders.map(b => (
                    <button key={b.id} className="text-left" onClick={()=>startEdit(b)}>
                      <Card className="hover:bg-muted/50">
                        <CardContent className="p-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className={`w-6 h-6 rounded-full border grid place-items-center text-[11px] font-semibold ${TEXT_ON_COLOR[b.color] || 'text-white'}`} style={{ backgroundColor: COLOR_HEX[b.color] || '#9ca3af' }}>
                              {b.difficulty}
                            </span>
                            <div>
                              <div className="font-medium text-base">{b.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {b.sector2 ? `${b.sector} → ${b.sector2}` : b.sector}
                              </div>
                            </div>
                          </div>
                          <span className="text-primary text-sm">Bearbeiten</span>
                        </CardContent>
                      </Card>
                    </button>
                  ))}
                </div>
              ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Boulder bearbeiten</CardTitle>
                </CardHeader>
                <CardContent>
                <form id="edit-form" onSubmit={submitEdit} className="space-y-4">
                    <div>
                      <Label>Name *</Label>
                      <div className="flex items-center gap-2">
                        <Input value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})} className="h-12 text-base flex-1" />
                        <Button type="button" variant="outline" className="h-12" onClick={() => setForm({ ...form, name: generateBoulderName(form.color, form.difficulty) })}>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Vorschlagen
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label>Sektor *</Label>
                      <Select value={form.sector_id} onValueChange={(v)=>setForm({...form, sector_id: v})}>
                        <SelectTrigger className="h-12 text-base">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {sectors?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="spans-multiple-sectors-edit"
                        checked={form.spansMultipleSectors}
                        onChange={(e) => setForm({...form, spansMultipleSectors: e.target.checked, sector_id_2: e.target.checked ? form.sector_id_2 : ''})}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="spans-multiple-sectors-edit" className="cursor-pointer">
                        Verläuft über mehrere Sektoren
                      </Label>
                    </div>
                    {form.spansMultipleSectors && (
                      <div>
                        <Label>Endet in Sektor</Label>
                        <Select 
                          value={form.sector_id_2} 
                          onValueChange={(v)=>setForm({...form, sector_id_2: v})}
                          disabled={!form.sector_id}
                        >
                          <SelectTrigger className="h-12 text-base">
                            <SelectValue placeholder="Sektor wählen" />
                          </SelectTrigger>
                          <SelectContent>
                            {sectors?.filter(s => s.id !== form.sector_id).map(s => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Schwierigkeit *</Label>
                        <Select value={String(form.difficulty)} onValueChange={(v)=>setForm({...form, difficulty: parseInt(v)})}>
                          <SelectTrigger className="h-12 text-base">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DIFFICULTIES.map(d => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Farbe *</Label>
                        <Select value={form.color} onValueChange={(v)=>setForm(prev => ({...prev, color: v, name: adjustNameForColor(prev.name, v)}))}>
                          <SelectTrigger className="h-12 text-base">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COLORS.map(c => (
                              <SelectItem key={c} value={c}>
                                <div className="flex items-center gap-2">
                                  <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: COLOR_HEX[c] || '#9ca3af' }} />
                                  <span>{c}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Beta-Video (optional)</Label>
                      <input className="block w-full text-sm" type="file" accept="video/*" capture onChange={(e)=>setForm({...form, file: e.target.files?.[0]||null})} />
                      {isUploading && <p className="text-xs text-muted-foreground mt-1">Lade hoch…</p>}
                    </div>
                    <div>
                      <Label>Notizen</Label>
                      <Textarea value={form.note} onChange={(e)=>setForm({...form, note: e.target.value})} className="min-h-[100px]" />
                    </div>
                    <div className="h-24" />
                  </form>
                </CardContent>
                <div className="p-4 pt-0 flex gap-2">
                  <Button form="edit-form" type="submit" className="h-12" disabled={!canSubmit || isUploading}>
                    {isUploading ? 'Speichere…' : 'Änderungen speichern'}
                  </Button>
                  <Button type="button" variant="outline" className="h-12 text-destructive"
                    onClick={() => {
                      if (!editing) return;
                      if (!confirm('Diesen Boulder wirklich löschen?')) return;
                      deleteBoulder.mutate(editing.id);
                      setEditing(null);
                    }}
                  >
                    Löschen
                  </Button>
                </div>
              </Card>
              )}
            </div>
        )}

        {view === 'status' && (
          <div className="space-y-4">
            <div className="flex gap-2 sticky top-[56px] z-10 bg-background py-2 overflow-x-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Boulder suchen" className="pl-9 h-11" value={editSearch} onChange={(e)=>setEditSearch(e.target.value)} />
              </div>
              <div className="w-40">
                <Select value={editSector} onValueChange={setEditSector}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Sektor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    {sectors?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-36">
                <Select value={editDifficulty} onValueChange={setEditDifficulty}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Grad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    {DIFFICULTIES.map(d => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <Select value={editColor} onValueChange={setEditColor}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Farbe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    {COLORS.map(c => (
                      <SelectItem key={c} value={c}>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: COLOR_HEX[c] || '#9ca3af' }} />
                          <span>{c}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-44">
                <Select value={statusFilter} onValueChange={(v:any)=>setStatusFilter(v)}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="haengt">Hängt</SelectItem>
                    <SelectItem value="abgeschraubt">Abgeschraubt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{filteredBoulders.length} Einträge</span>
              <div className="text-sm">
                <button className="underline" onClick={()=>selectAll(filteredBoulders.map(b=>b.id), true)}>Alle auswählen</button>
                <span className="mx-2">·</span>
                <button className="underline" onClick={()=>selectAll(filteredBoulders.map(b=>b.id), false)}>Auswahl aufheben</button>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {filteredBoulders.map(b => (
                <label key={b.id} className="block">
                  <Card className={`hover:bg-muted/50 ${selected[b.id] ? 'ring-2 ring-primary' : ''}`}>
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <input type="checkbox" className="w-5 h-5" checked={!!selected[b.id]} onChange={()=>toggleSelect(b.id)} />
                        <span className={`w-6 h-6 rounded-full border grid place-items-center text-[11px] font-semibold ${TEXT_ON_COLOR[b.color] || 'text-white'}`} style={{ backgroundColor: COLOR_HEX[b.color] || '#9ca3af' }}>
                          {b.difficulty}
                        </span>
                        <div>
                          <div className="font-medium text-base">{b.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {b.sector2 ? `${b.sector} → ${b.sector2}` : b.sector}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full border">
                        {b.status === 'abgeschraubt' ? 'Abgeschraubt' : 'Hängt'}
                      </span>
                    </CardContent>
                  </Card>
                </label>
              ))}
            </div>
          </div>
        )}
        {view === 'schedule' && (
          <div className="space-y-3" ref={scheduleRef}>
            <Card>
              <CardHeader>
                <CardTitle>Schrauberplan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label>Sektor</Label>
                    <Select value={scheduleSectorId} onValueChange={setScheduleSectorId}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Sektor wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {sectors?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Datum/Zeit</Label>
                    <Input type="datetime-local" value={scheduleDate} onChange={(e)=>setScheduleDate(e.target.value)} className="h-12" />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={scheduleNextSector} className="w-full h-12">Eintragen</Button>
                  </div>
                </div>

                <div className="space-y-6">
                  {weeks.map(({ weekStart, days }, wi) => (
                    <div key={wi} className="space-y-3">
                      <div className="text-sm font-medium text-muted-foreground">Woche ab {weekStart.toLocaleDateString()}</div>
                      <div className="grid grid-cols-1 gap-2">
                        {days.map((d, di) => {
                          const items = (schedule || []).filter(s => new Date(s.scheduled_at).toDateString() === d.toDateString());
                          return (
                            <div key={di} className="rounded-xl border bg-card p-3">
                              <div className="text-sm font-medium mb-2">{d.toLocaleDateString(undefined, { weekday: 'long', day: '2-digit', month: '2-digit' })}</div>
                              {items.length === 0 ? (
                                <div className="text-xs text-muted-foreground">Keine Einträge</div>
                              ) : (
                                <div className="space-y-2">
                                  {items.map(it => {
                                    const sectorName = sectors?.find(s => s.id === it.sector_id)?.name || 'Sektor';
                                    const time = new Date(it.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                    return (
                                      <div key={it.id} className="flex items-center justify-between text-sm">
                                        <div>{time} · {sectorName}</div>
                                        <Button type="button" size="sm" variant="outline" onClick={()=>deleteSchedule.mutate(it.id)}>Löschen</Button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
            </section>
          </div>
        </main>

      {/* Spacer for mobile only global nav */}
      <div className="h-24 md:h-0" />
      
      {/* Selection mode floating buttons without background bar */}
      {/* Desktop selection toolbar */}
      {view==='status' && selectedCount > 0 && (
        <div className="hidden md:flex sticky top-[88px] z-40 justify-end gap-3 px-4 py-2 bg-background/80 backdrop-blur border-b">
          <button
            aria-label="Auswahl abbrechen"
            className="h-9 px-3 rounded-md bg-destructive text-destructive-foreground text-sm shadow"
            onClick={() => setSelected({})}
          >
            Abbrechen
          </button>
          <button
            aria-label="Ausgewählte reinschrauben"
            className="h-9 px-3 rounded-md bg-success text-success-foreground text-sm shadow"
            onClick={() => {
              const ids = filteredBoulders.filter(b => selected[b.id]).map(b => b.id);
              if (ids.length === 0) return;
              bulkStatus.mutate({ ids, status: 'haengt' });
              setSelected({});
            }}
          >
            Reinschrauben
          </button>
          <button
            aria-label="Ausgewählte rausschrauben"
            className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm shadow"
            onClick={() => {
              const ids = filteredBoulders.filter(b => selected[b.id]).map(b => b.id);
              if (ids.length === 0) return;
              bulkStatus.mutate({ ids, status: 'abgeschraubt' });
              setSelected({});
            }}
          >
            Rausschrauben
          </button>
        </div>
      )}

      {/* Mobile floating buttons for selection */}
      {view==='status' && selectedCount > 0 && (
        <div className="md:hidden fixed z-[80] right-4 bottom-6 flex items-center gap-3">
          <button
            aria-label="Auswahl abbrechen"
            className="w-12 h-12 rounded-full bg-destructive text-destructive-foreground grid place-items-center shadow-xl"
            onClick={() => setSelected({})}
          >
            <X className="w-5 h-5" />
          </button>
          <button
            aria-label="Ausgewählte reinschrauben"
            className="w-12 h-12 rounded-full bg-success text-success-foreground grid place-items-center shadow-xl"
            onClick={() => {
              const ids = filteredBoulders.filter(b => selected[b.id]).map(b => b.id);
              if (ids.length === 0) return;
              bulkStatus.mutate({ ids, status: 'haengt' });
              setSelected({});
            }}
          >
            <Hammer className="w-5 h-5" />
          </button>
          <button
            aria-label="Ausgewählte rausschrauben"
            className="w-12 h-12 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-xl"
            onClick={() => {
              const ids = filteredBoulders.filter(b => selected[b.id]).map(b => b.id);
              if (ids.length === 0) return;
              bulkStatus.mutate({ ids, status: 'abgeschraubt' });
              setSelected({});
            }}
          >
            <Wrench className="w-5 h-5" />
          </button>
        </div>
      )}
      </div>
    </div>
  );
};

export default Setter;


