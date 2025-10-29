import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useHasRole } from '@/hooks/useHasRole';
import { useNavigate } from 'react-router-dom';
import { useSectorsTransformed, useUpdateSector } from '@/hooks/useSectors';
import { useBouldersWithSectors, useCreateBoulder, useUpdateBoulder } from '@/hooks/useBoulders';
import { uploadBetaVideo } from '@/integrations/supabase/storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Search, PlusCircle, Edit3, Calendar } from 'lucide-react';
import { useMemo as useMemoReact, useRef } from 'react';
import { useSectorSchedule, useCreateSectorSchedule, useDeleteSectorSchedule } from '@/hooks/useSectorSchedule';

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

const Setter = () => {
  const { session } = useAuth();
  const { hasRole: isSetter } = useHasRole('setter');
  const { hasRole: isAdmin } = useHasRole('admin');
  const navigate = useNavigate();
  const { data: sectors } = useSectorsTransformed();
  const { data: boulders } = useBouldersWithSectors();
  const createBoulder = useCreateBoulder();
  const updateBoulder = useUpdateBoulder();
  const updateSector = useUpdateSector();

  useEffect(() => {
    if (!session) navigate('/auth');
  }, [session, navigate]);

  const canAccess = isSetter || isAdmin;

  const [form, setForm] = useState({
    name: '',
    sector_id: '',
    difficulty: 1,
    color: 'Grün',
    note: '',
    file: null as File | null,
  });
  const [isUploading, setIsUploading] = useState(false);
  const [view, setView] = useState<'create' | 'edit' | 'schedule'>('create');
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

  const canSubmit = useMemo(() => {
    return !!form.name && !!form.sector_id && form.difficulty >= 1 && form.difficulty <= 8;
  }, [form]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !canAccess) return;
    try {
      setIsUploading(true);
      let betaUrl: string | null = null;
      if (form.file) {
        betaUrl = await uploadBetaVideo(form.file);
      }
      await createBoulder.mutateAsync({
        name: form.name,
        sector_id: form.sector_id,
        difficulty: form.difficulty,
        color: form.color,
        beta_video_url: betaUrl,
        note: form.note,
      } as any);
      setForm({ name: '', sector_id: '', difficulty: 1, color: 'Grün', note: '', file: null });
      navigate('/boulders');
    } finally {
      setIsUploading(false);
    }
  };

  const filteredBoulders = useMemo(() => {
    let list = boulders || [];
    if (editSector !== 'all') {
      list = list.filter(b => sectors?.find(s => s.id === editSector)?.name === b.sector);
    }
    if (editDifficulty !== 'all') {
      list = list.filter(b => String(b.difficulty) === editDifficulty);
    }
    if (editColor !== 'all') {
      list = list.filter(b => b.color === editColor);
    }
    if (editSearch.trim()) {
      const q = editSearch.toLowerCase();
      list = list.filter(b => b.name.toLowerCase().includes(q) || b.sector.toLowerCase().includes(q));
    }
    return list.slice(0, 100);
  }, [boulders, editSector, editDifficulty, editColor, editSearch, sectors]);

  const startEdit = (b: any) => {
    setEditing(b);
    setView('edit');
    // map into form-like state
    setForm({
      name: b.name,
      sector_id: sectors?.find(s => s.name === b.sector)?.id || '',
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
      let betaUrl = editing.betaVideoUrl || null;
      if (form.file) {
        betaUrl = await uploadBetaVideo(form.file);
      }
      await updateBoulder.mutateAsync({
        id: editing.id,
        name: form.name,
        sector_id: form.sector_id,
        difficulty: form.difficulty,
        color: form.color,
        beta_video_url: betaUrl,
        note: form.note,
      } as any);
      setEditing(null);
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
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-4 pb-2 sticky top-0 z-20 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-teko tracking-wide leading-none">Setter</h1>
          <p className="text-xs text-muted-foreground mt-1">Boulder anlegen und bearbeiten. Nächsten Sektor planen.</p>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-3xl mx-auto w-full">
        {view === 'create' && (
            <Card>
              <CardHeader>
                <CardTitle>Neuen Boulder anlegen</CardTitle>
              </CardHeader>
              <CardContent>
                <form id="create-form" onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
                    <Input id="name" value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})} required className="h-12 text-base" />
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
                      <Select value={form.color} onValueChange={(v)=>setForm({...form, color: v})}>
                        <SelectTrigger className="h-12 text-base">
                    <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                    {COLORS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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

              {!editing ? (
                <div className="grid gap-2">
                  {filteredBoulders.map(b => (
                    <button key={b.id} className="text-left" onClick={()=>startEdit(b)}>
                      <Card className="hover:bg-muted/50">
                        <CardContent className="p-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full border" title={b.color} style={{ backgroundColor: COLOR_HEX[b.color] || '#9ca3af' }} />
                            <div>
                              <div className="font-medium text-base">{b.name}</div>
                              <div className="text-xs text-muted-foreground">{b.sector} · Schwierigkeit {b.difficulty}</div>
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
                      <Input value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})} className="h-12 text-base" />
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
                        <Select value={form.color} onValueChange={(v)=>setForm({...form, color: v})}>
                          <SelectTrigger className="h-12 text-base">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COLORS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
              </Card>
              )}
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
      </main>

      {/* Mobile Bottom Navbar */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 z-40 bg-sidebar-bg rounded-2xl shadow-2xl border border-border">
        <div className="max-w-3xl mx-auto flex items-center justify-around px-2 py-2">
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
            className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all ${view==='schedule' ? 'text-success' : 'text-sidebar-icon'}`}
            onClick={()=> setView('schedule')}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-xs">Schraubtermin</span>
          </button>
        </div>
      </nav>
      <div className="h-24 md:h-0" />
    </div>
  );
};

export default Setter;


