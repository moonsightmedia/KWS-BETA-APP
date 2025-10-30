import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useColors, useCreateColor, useUpdateColor, useDeleteColor } from '@/hooks/useColors';
import { supabase } from '@/integrations/supabase/client';
import { useMemo, useState } from 'react';
import { GripVertical, Plus, Trash2 } from 'lucide-react';

export const ColorManagement = () => {
  const { data: colors } = useColors();
  const createColor = useCreateColor();
  const updateColor = useUpdateColor();
  const deleteColor = useDeleteColor();

  const [form, setForm] = useState({ name: '', hex: '#22c55e', sort_order: 0 });
  const [query, setQuery] = useState('');
  const seedDefaults = async () => {
    await supabase.from('colors').upsert([
      { name: 'Grün', hex: '#22c55e', sort_order: 1 },
      { name: 'Gelb', hex: '#facc15', sort_order: 2 },
      { name: 'Blau', hex: '#3b82f6', sort_order: 3 },
      { name: 'Orange', hex: '#f97316', sort_order: 4 },
      { name: 'Rot', hex: '#ef4444', sort_order: 5 },
      { name: 'Schwarz', hex: '#111827', sort_order: 6 },
      { name: 'Weiß', hex: '#ffffff', sort_order: 7 },
      { name: 'Lila', hex: '#a855f7', sort_order: 8 },
    ], { onConflict: 'name', ignoreDuplicates: false });
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.hex) return;
    await createColor.mutateAsync({ name: form.name, hex: form.hex, sort_order: form.sort_order });
    setForm({ name: '', hex: '#22c55e', sort_order: 0 });
  };

  const filtered = useMemo(() => {
    const list = colors || [];
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter(c => c.name.toLowerCase().includes(q) || c.hex.toLowerCase().includes(q));
  }, [colors, query]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Farben verwalten</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toolbar: Create inline + Suche + Defaults */}
        <form onSubmit={onCreate} className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="w-10 h-10 rounded-full border" style={{ backgroundColor: form.hex }} />
            <Input placeholder="Name" value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})} className="md:w-56" required />
            <Input placeholder="#HEX" value={form.hex} onChange={(e)=>setForm({...form, hex: e.target.value})} className="w-28" />
            <Input type="number" placeholder="Sort" value={form.sort_order} onChange={(e)=>setForm({...form, sort_order: parseInt(e.target.value || '0')})} className="w-20" />
            <Button type="submit"><Plus className="w-4 h-4 mr-2" />Anlegen</Button>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Input placeholder="Suchen…" value={query} onChange={(e)=>setQuery(e.target.value)} className="md:w-60" />
            <Button type="button" variant="outline" onClick={seedDefaults}>Standardfarben</Button>
          </div>
        </form>

        {/* Liste */}
        {(!filtered || filtered.length === 0) ? (
          <div className="text-sm text-muted-foreground">Keine Einträge gefunden.</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((c) => (
              <div key={c.id} className="grid grid-cols-1 md:grid-cols-[24px,40px,1fr,120px,90px,90px,auto] items-center gap-3 border rounded-2xl p-3 bg-card/60">
                <GripVertical className="w-4 h-4 text-muted-foreground hidden md:block" />
                <div className="w-8 h-8 rounded-full border" style={{ backgroundColor: c.hex }} />
                <Input defaultValue={c.name} onBlur={(e)=>updateColor.mutate({ id: c.id, name: e.target.value })} />
                <Input defaultValue={c.hex} onBlur={(e)=>updateColor.mutate({ id: c.id, hex: e.target.value })} />
                <Input type="number" defaultValue={c.sort_order} onBlur={(e)=>updateColor.mutate({ id: c.id, sort_order: parseInt(e.target.value || '0') })} />
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Aktiv</Label>
                  <Switch defaultChecked={c.is_active} onCheckedChange={(v)=>updateColor.mutate({ id: c.id, is_active: v })} />
                </div>
                <Button type="button" variant="outline" className="text-destructive justify-self-end" onClick={()=>deleteColor.mutate(c.id)}>
                  <Trash2 className="w-4 h-4 mr-2" />Löschen
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};


