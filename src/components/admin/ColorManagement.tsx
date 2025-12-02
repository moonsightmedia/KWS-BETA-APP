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

  const [form, setForm] = useState({ name: '', hex: '#22c55e', secondary_hex: '', sort_order: 0 });
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
    await createColor.mutateAsync({ 
      name: form.name, 
      hex: form.hex, 
      secondary_hex: form.secondary_hex || null,
      sort_order: form.sort_order 
    });
    setForm({ name: '', hex: '#22c55e', secondary_hex: '', sort_order: 0 });
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
        {/* Search and Defaults */}
        <div className="flex flex-col sm:flex-row gap-2 w-full min-w-0">
          <Input 
            placeholder="Suchen…" 
            value={query} 
            onChange={(e)=>setQuery(e.target.value)} 
            className="flex-1 min-w-0 h-11" 
          />
          <Button 
            type="button" 
            variant="outline" 
            onClick={seedDefaults} 
            className="flex-shrink-0 h-11 whitespace-nowrap"
          >
            Standardfarben
          </Button>
        </div>

        {/* Create Form - Mobile optimized */}
        <form onSubmit={onCreate} className="space-y-3 w-full min-w-0">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-full border-2 flex-shrink-0" 
              style={{ 
                background: form.secondary_hex 
                  ? `linear-gradient(135deg, ${form.hex} 0%, ${form.hex} 50%, ${form.secondary_hex} 50%, ${form.secondary_hex} 100%)`
                  : form.hex 
              }} 
            />
            <div className="flex-1 min-w-0">
              <Label htmlFor="color-name" className="text-xs text-muted-foreground mb-1 block">Name</Label>
              <Input 
                id="color-name"
                placeholder="z.B. Grün-Gelb" 
                value={form.name} 
                onChange={(e)=>setForm({...form, name: e.target.value})} 
                className="w-full h-11" 
                required 
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="color-hex" className="text-xs text-muted-foreground mb-1 block">HEX 1</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={form.hex}
                  onChange={(e)=>setForm({...form, hex: e.target.value})}
                  className="w-16 h-11 p-1 cursor-pointer border rounded-md flex-shrink-0"
                  title="Farbe wählen"
                />
                <Input 
                  id="color-hex"
                  placeholder="#22c55e" 
                  value={form.hex} 
                  onChange={(e)=>setForm({...form, hex: e.target.value})} 
                  className="flex-1 h-11 font-mono text-sm" 
                />
              </div>
            </div>
            <div>
              <Label htmlFor="color-hex2" className="text-xs text-muted-foreground mb-1 block">HEX 2 (optional)</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={form.secondary_hex || '#ffffff'}
                  onChange={(e)=>setForm({...form, secondary_hex: e.target.value})}
                  className="w-16 h-11 p-1 cursor-pointer border rounded-md flex-shrink-0"
                  title="Farbe wählen"
                />
                <Input 
                  id="color-hex2"
                  placeholder="#facc15" 
                  value={form.secondary_hex} 
                  onChange={(e)=>setForm({...form, secondary_hex: e.target.value})} 
                  className="flex-1 h-11 font-mono text-sm" 
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Label htmlFor="color-sort" className="text-xs text-muted-foreground mb-1 block">Sortierung</Label>
              <Input 
                id="color-sort"
                type="number" 
                placeholder="0" 
                value={form.sort_order} 
                onChange={(e)=>setForm({...form, sort_order: parseInt(e.target.value || '0')})} 
                className="w-full h-11" 
              />
            </div>
            <Button 
              type="submit" 
              className="h-11 px-6 flex-shrink-0 self-end"
              disabled={createColor.isPending}
            >
              <Plus className="w-5 h-5 mr-2" />
              Anlegen
            </Button>
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
  const [secondaryHex, setSecondaryHex] = useState(color.secondary_hex || '');
  const [sortOrder, setSortOrder] = useState(color.sort_order);

  // Update local state when color prop changes (after successful update)
  useEffect(() => {
    setName(color.name);
    setHex(color.hex);
    setSecondaryHex(color.secondary_hex || '');
    setSortOrder(color.sort_order);
  }, [color.name, color.hex, color.secondary_hex, color.sort_order]);

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

  const handleSecondaryHexBlur = () => {
    const newValue = secondaryHex.trim() || null;
    if (newValue !== (color.secondary_hex || null)) {
      updateColor.mutate({ id: color.id, secondary_hex: newValue });
    } else {
      // Reset to original if empty
      setSecondaryHex(color.secondary_hex || '');
    }
  };

  const handleSortOrderBlur = () => {
    const newValue = parseInt(sortOrder.toString() || '0');
    if (newValue !== color.sort_order) {
      updateColor.mutate({ id: color.id, sort_order: newValue });
    }
  };

  return (
    <Card className="w-full min-w-0">
      <CardContent className="p-4 space-y-4">
        {/* Mobile Layout */}
        <div className="md:hidden space-y-4">
          <div className="flex items-center gap-3">
            <GripVertical className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <div 
              className="w-12 h-12 rounded-full border-2 flex-shrink-0" 
              style={{ 
                background: secondaryHex 
                  ? `linear-gradient(135deg, ${hex} 0%, ${hex} 50%, ${secondaryHex} 50%, ${secondaryHex} 100%)`
                  : hex 
              }} 
            />
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-muted-foreground mb-1 block">Name</Label>
              <Input 
                value={name} 
                onChange={(e) => {
                  console.log('[ColorRow] Name onChange:', { colorId: color.id, oldValue: name, newValue: e.target.value });
                  setName(e.target.value);
                }}
                onBlur={handleNameBlur}
                onFocus={() => console.log('[ColorRow] Name onFocus:', { colorId: color.id, currentValue: name })}
                className="w-full h-11" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">HEX 1</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={hex}
                  onChange={(e) => setHex(e.target.value)}
                  onBlur={handleHexBlur}
                  className="w-16 h-11 p-1 cursor-pointer border rounded-md flex-shrink-0"
                  title="Farbe wählen"
                />
                <Input 
                  value={hex} 
                  onChange={(e) => setHex(e.target.value)}
                  onBlur={handleHexBlur}
                  placeholder="#HEX 1"
                  className="flex-1 h-11 font-mono text-sm" 
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">HEX 2</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={secondaryHex || '#ffffff'}
                  onChange={(e) => setSecondaryHex(e.target.value)}
                  onBlur={handleSecondaryHexBlur}
                  className="w-16 h-11 p-1 cursor-pointer border rounded-md flex-shrink-0"
                  title="Farbe wählen"
                />
                <Input 
                  value={secondaryHex} 
                  onChange={(e) => setSecondaryHex(e.target.value)}
                  onBlur={handleSecondaryHexBlur}
                  placeholder="#HEX 2 (optional)"
                  className="flex-1 h-11 font-mono text-sm" 
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1 block">Sortierung</Label>
              <Input 
                type="number" 
                value={sortOrder} 
                onChange={(e) => setSortOrder(parseInt(e.target.value || '0'))}
                onBlur={handleSortOrderBlur}
                className="w-full h-11" 
              />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">Aktiv</Label>
                <Switch checked={color.is_active} onCheckedChange={(v)=>updateColor.mutate({ id: color.id, is_active: v })} />
              </div>
              <Button 
                type="button" 
                variant="outline" 
                size="icon"
                className="text-destructive h-11 w-11 flex-shrink-0" 
                onClick={()=>deleteColor.mutate(color.id)}
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:grid md:grid-cols-[24px,40px,1fr,120px,120px,90px,90px,auto] items-center gap-3">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
          <div 
            className="w-8 h-8 rounded-full border flex-shrink-0" 
            style={{ 
              background: secondaryHex 
                ? `linear-gradient(135deg, ${hex} 0%, ${hex} 50%, ${secondaryHex} 50%, ${secondaryHex} 100%)`
                : hex 
            }} 
          />
          <Input 
            value={name} 
            onChange={(e) => {
              console.log('[ColorRow] Name onChange:', { colorId: color.id, oldValue: name, newValue: e.target.value });
              setName(e.target.value);
            }}
            onBlur={handleNameBlur}
            onFocus={() => console.log('[ColorRow] Name onFocus:', { colorId: color.id, currentValue: name })}
            className="w-full min-w-0 h-10" 
          />
          <div className="flex gap-2">
            <Input
              type="color"
              value={hex}
              onChange={(e) => setHex(e.target.value)}
              onBlur={handleHexBlur}
              className="w-12 h-10 p-1 cursor-pointer border rounded-md flex-shrink-0"
              title="Farbe wählen"
            />
            <Input 
              value={hex} 
              onChange={(e) => setHex(e.target.value)}
              onBlur={handleHexBlur}
              placeholder="#HEX 1"
              className="flex-1 min-w-0 h-10 font-mono text-sm" 
            />
          </div>
          <div className="flex gap-2">
            <Input
              type="color"
              value={secondaryHex || '#ffffff'}
              onChange={(e) => setSecondaryHex(e.target.value)}
              onBlur={handleSecondaryHexBlur}
              className="w-12 h-10 p-1 cursor-pointer border rounded-md flex-shrink-0"
              title="Farbe wählen"
            />
            <Input 
              value={secondaryHex} 
              onChange={(e) => setSecondaryHex(e.target.value)}
              onBlur={handleSecondaryHexBlur}
              placeholder="#HEX 2 (optional)"
              className="flex-1 min-w-0 h-10 font-mono text-sm" 
            />
          </div>
          <Input 
            type="number" 
            value={sortOrder} 
            onChange={(e) => setSortOrder(parseInt(e.target.value || '0'))}
            onBlur={handleSortOrderBlur}
            className="w-full min-w-0 h-10" 
          />
          <div className="flex items-center gap-2 flex-shrink-0">
            <Label className="text-sm whitespace-nowrap">Aktiv</Label>
            <Switch checked={color.is_active} onCheckedChange={(v)=>updateColor.mutate({ id: color.id, is_active: v })} />
          </div>
          <Button type="button" variant="outline" className="text-destructive justify-self-end flex-shrink-0 h-10" onClick={()=>deleteColor.mutate(color.id)}>
            <Trash2 className="w-4 h-4 mr-2" />
            Löschen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

