import { useId, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { normalizeHex } from './colorForm';

const samples = [
  ['Grün', '#22C55E'], ['Gelb', '#FACC15'], ['Blau', '#3B82F6'], ['Orange', '#F97316'],
  ['Rot', '#EF4444'], ['Schwarz', '#111827'], ['Weiß', '#FFFFFF'], ['Lila', '#A855F7'],
  ['Pink', '#FF0099'], ['Mint', '#ACF6CA'], ['Türkis', '#14B8A6'], ['Grau', '#94A3B8'],
] as const;

export function ColorSwatch({ hex, secondaryHex, className }: { hex: string; secondaryHex?: string | null; className?: string }) {
  const first = normalizeHex(hex);
  const second = secondaryHex ? normalizeHex(secondaryHex) : null;
  return <span aria-hidden="true" className={cn('block shrink-0 rounded-kws-control bg-secondary shadow-[inset_0_0_0_1px_rgba(25,36,54,0.15)]', className)} style={first ? { background: second ? `linear-gradient(135deg, ${first} 50%, ${second} 50%)` : first } : undefined} />;
}

export function ColorValueField({ label, value, onChange, error, disabled }: {
  label: string; value: string; onChange: (value: string) => void; error?: string; disabled?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return <div className="min-w-0 space-y-2">
    <Label htmlFor={id} className="text-sm">{label}</Label>
    <div className="flex min-w-0 gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" disabled={disabled} aria-label={`${label} auswählen`} className="h-11 shrink-0 gap-1 px-2">
            <ColorSwatch hex={value} className="h-7 w-7 rounded-kws-badge" /><ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="z-[130] w-[min(19rem,calc(100vw-2rem))] rounded-kws-card border-0 bg-card p-3 shadow-medium">
          <p className="mb-3 text-sm font-semibold">{label} auswählen</p>
          <div className="grid grid-cols-4 gap-2">
            {samples.map(([name, hex]) => <button key={hex} type="button" aria-label={`${name} (${hex})`} aria-pressed={normalizeHex(value) === hex} onClick={() => { onChange(hex); setOpen(false); }} className="relative grid h-11 place-items-center rounded-kws-control bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:shadow-sm">
              <ColorSwatch hex={hex} className="h-8 w-8 rounded-kws-badge" />
              {normalizeHex(value) === hex && <Check className="absolute h-5 w-5 rounded-kws-badge bg-card p-0.5 text-foreground" />}
            </button>)}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Andere Farbe? Trage ihren HEX-Code ins Feld ein.</p>
        </PopoverContent>
      </Popover>
      <Input id={id} value={value} disabled={disabled} onChange={e => onChange(e.target.value)} onBlur={() => { const hex = normalizeHex(value); if (hex) onChange(hex); }} placeholder="#22C55E" spellCheck={false} autoComplete="off" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className="min-w-0 flex-1 font-mono text-sm uppercase" />
    </div>
    {error && <p id={`${id}-error`} className="text-xs text-destructive">{error}</p>}
  </div>;
}
