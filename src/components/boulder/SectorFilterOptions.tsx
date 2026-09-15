import { resolveSectorArea, type SectorAreaSource } from '@/lib/sectorAreas';
import { Map as MapIcon } from 'lucide-react';
import { FilterOption, FilterSection } from './BoulderFilterControls';

/** Public labels are shared with the map. Duplicate physical rows stay one filter. */
export function SectorFilterOptions({ sectors, selected, onChange, single = false }: {
  sectors: readonly SectorAreaSource[];
  selected: string[];
  onChange: (names: string[]) => void;
  single?: boolean;
}) {
  const groups = new Map<string, { title: string; order: number; names: Map<string, string> }>();
  for (const sector of sectors) {
    const resolved = resolveSectorArea(sector);
    const key = resolved.area?.slug ?? 'other';
    if (!groups.has(key)) groups.set(key, { title: resolved.area?.name ?? 'Weitere Sektoren', order: resolved.area?.sortOrder ?? 999, names: new Map() });
    groups.get(key)!.names.set(sector.name, resolved.subareaCode ?? sector.name);
  }
  const toggle = (name: string) => onChange(selected.includes(name) ? selected.filter(value => value !== name) : single ? [name] : [...selected, name]);
  return <FilterSection title="Hallenbereiche" icon={MapIcon} active={selected.length > 0} onReset={() => onChange([])} summary={selected.length ? selected.join(' · ') : single ? 'Ganze Halle · Ein Teilbereich wählbar' : 'Ganze Halle · Mehrfachauswahl'}>
    <div className="grid items-start gap-4 md:grid-cols-2">
      {[...groups.entries()].sort(([, a], [, b]) => a.order - b.order || a.title.localeCompare(b.title, 'de')).map(([key, group]) => {
        const names = [...group.names.keys()];
        const all = names.every(name => selected.includes(name));
        return <div key={key} className="space-y-2">
          <div className="flex min-h-6 items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">{group.title}</span>
            {!single && <button type="button" aria-label={`${group.title}: alle Teilbereiche`} aria-pressed={all}
              onClick={() => onChange(all ? selected.filter(name => !names.includes(name)) : [...new Set([...selected, ...names])])}
              className="min-h-11 rounded-kws-control px-2 text-xs font-semibold text-primary-ink hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {all ? 'Abwählen' : 'Alle wählen'}
            </button>}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[...group.names].sort(([, a], [, b]) => a.localeCompare(b, 'de', { numeric: true })).map(([name, label]) => <FilterOption key={name} selected={selected.includes(name)} indicator="corner" aria-label={`Sektor ${name}`} onClick={() => toggle(name)} className={`relative justify-center text-center ${label.length > 3 ? 'col-span-2' : ''}`}><span>{label}</span></FilterOption>)}
          </div>
        </div>;
      })}
      {!groups.size && <p className="text-xs text-muted-foreground">Noch keine Sektoren verfügbar.</p>}
    </div>
  </FilterSection>;
}
