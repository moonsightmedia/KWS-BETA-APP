import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function AdminSearchField({ value, onChange, label, placeholder, disabled = false }: {
  value: string; onChange: (value: string) => void; label: string; placeholder: string; disabled?: boolean;
}) {
  return <div className="relative min-w-0 flex-1">
    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
    <Input value={value} onChange={event => onChange(event.target.value)} aria-label={label} placeholder={placeholder} disabled={disabled} className="h-12 border-0 bg-card pl-10 pr-12 shadow-soft" />
    {value && <Button type="button" variant="ghost" size="icon" className="absolute right-0.5 top-0.5 h-11 w-11" aria-label="Suche löschen" disabled={disabled} onClick={() => onChange('')}><X className="h-4 w-4" aria-hidden="true" /></Button>}
  </div>;
}
