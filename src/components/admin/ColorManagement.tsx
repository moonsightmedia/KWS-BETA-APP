import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useColors, useCreateColor, useUpdateColor, useDeleteColor, type ColorRow } from '@/hooks/useColors';
import { supabase } from '@/integrations/supabase/client';
import { useMemo, useState, useEffect } from 'react';
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
    <Card className="w-full min-w-0">
      <CardHeader>
        <CardTitle>Farben verwalten</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 w-full min-w-0">
        {/* Toolbar: Create inline + Suche + Defaults */}
        <form onSubmit={onCreate} className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between w-full min-w-0">
          <div className="flex items-center gap-2 w-full md:w-auto min-w-0">
            <div className="w-10 h-10 rounded-full border flex-shrink-0" style={{ backgroundColor: form.hex }} />
            <Input placeholder="Name" value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})} className="md:w-56 flex-1 min-w-0" required />
            <Input placeholder="#HEX" value={form.hex} onChange={(e)=>setForm({...form, hex: e.target.value})} className="w-24 sm:w-28 flex-shrink-0" />
            <Input type="number" placeholder="Sort" value={form.sort_order} onChange={(e)=>setForm({...form, sort_order: parseInt(e.target.value || '0')})} className="w-16 sm:w-20 flex-shrink-0" />
            <Button type="submit" className="flex-shrink-0 text-xs sm:text-sm"><Plus className="w-4 h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">Anlegen</span></Button>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto min-w-0">
            <Input placeholder="Suchen…" value={query} onChange={(e)=>setQuery(e.target.value)} className="md:w-60 flex-1 min-w-0" />
            <Button type="button" variant="outline" onClick={seedDefaults} className="flex-shrink-0 text-xs sm:text-sm whitespace-nowrap">Standardfarben</Button>
          </div>
        </form>

        {/* Liste */}
        {(!filtered || filtered.length === 0) ? (
          <div className="text-sm text-muted-foreground">Keine Einträge gefunden.</div>
        ) : (
          <div className="space-y-2 w-full min-w-0">
            {filtered.map((c) => (
              <ColorRow 
                key={c.id} 
                color={c} 
                updateColor={updateColor} 
                deleteColor={deleteColor} 
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Separate component for each color row to manage local state
const ColorRow = ({ 
  color, 
  updateColor, 
  deleteColor 
}: { 
  color: ColorRow; 
  updateColor: ReturnType<typeof useUpdateColor>; 
  deleteColor: ReturnType<typeof useDeleteColor>; 
}) => {
  const [name, setName] = useState(color.name);
  const [hex, setHex] = useState(color.hex);
  const [sortOrder, setSortOrder] = useState(color.sort_order);

  // Update local state when color prop changes (after successful update)
  useEffect(() => {
    setName(color.name);
    setHex(color.hex);
    setSortOrder(color.sort_order);
  }, [color.name, color.hex, color.sort_order]);

  const handleNameBlur = () => {
    const newValue = name.trim();
    console.log('[ColorRow] handleNameBlur called:', {
      colorId: color.id,
      currentName: name,
      trimmedValue: newValue,
      originalName: color.name,
      willUpdate: newValue !== color.name && newValue,
    });
    if (newValue !== color.name && newValue) {
      console.log('[ColorRow] Calling updateColor.mutate with:', { id: color.id, name: newValue });
      updateColor.mutate({ id: color.id, name: newValue });
    } else if (!newValue) {
      // Reset to original if empty
      console.log('[ColorRow] Empty value, resetting to original:', color.name);
      setName(color.name);
    } else {
      console.log('[ColorRow] No change detected, skipping update');
    }
  };

  const handleHexBlur = () => {
    const newValue = hex.trim();
    if (newValue !== color.hex && newValue) {
      updateColor.mutate({ id: color.id, hex: newValue });
    } else if (!newValue) {
      // Reset to original if empty
      setHex(color.hex);
    }
  };

  const handleSortOrderBlur = () => {
    const newValue = parseInt(sortOrder.toString() || '0');
    if (newValue !== color.sort_order) {
      updateColor.mutate({ id: color.id, sort_order: newValue });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[24px,40px,1fr,120px,90px,90px,auto] items-center gap-3 border rounded-2xl p-3 bg-card/60 w-full min-w-0">
      <GripVertical className="w-4 h-4 text-muted-foreground hidden md:block" />
      <div className="w-8 h-8 rounded-full border flex-shrink-0" style={{ backgroundColor: hex }} />
      <Input 
        value={name} 
        onChange={(e) => {
          console.log('[ColorRow] Name onChange:', { colorId: color.id, oldValue: name, newValue: e.target.value });
          setName(e.target.value);
        }}
        onBlur={handleNameBlur}
        onFocus={() => console.log('[ColorRow] Name onFocus:', { colorId: color.id, currentValue: name })}
        className="w-full min-w-0" 
      />
      <Input 
        value={hex} 
        onChange={(e) => setHex(e.target.value)}
        onBlur={handleHexBlur}
        className="w-full min-w-0" 
      />
      <Input 
        type="number" 
        value={sortOrder} 
        onChange={(e) => setSortOrder(parseInt(e.target.value || '0'))}
        onBlur={handleSortOrderBlur}
        className="w-full min-w-0" 
      />
      <div className="flex items-center gap-2 flex-shrink-0">
        <Label className="text-sm whitespace-nowrap">Aktiv</Label>
        <Switch checked={color.is_active} onCheckedChange={(v)=>updateColor.mutate({ id: color.id, is_active: v })} />
      </div>
      <Button type="button" variant="outline" className="text-destructive justify-self-end flex-shrink-0 text-xs sm:text-sm" onClick={()=>deleteColor.mutate(color.id)}>
        <Trash2 className="w-4 h-4 mr-1 sm:mr-2" />
        <span className="hidden sm:inline">Löschen</span>
      </Button>
    </div>
  );
};

