import { useMemo, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronRight, Pencil, Plus, QrCode } from 'lucide-react';
import type { Sector, SectorArea } from '@/hooks/useSectors';
import { getSectorAreaPalette, groupAdminSectors, groupAdminSubareas, type AdminSubarea } from '@/lib/sectorAreas';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { kwsSurfaceClassName } from '@/components/ui/kws-surface';

export function SectorGroupList({ sectors, areas, query, hierarchyEditable, onCreate, onDetails, onEdit, onQR, nextDate }: {
  sectors: Sector[]; areas: SectorArea[]; query: string; hierarchyEditable: boolean;
  onCreate: (trigger: HTMLElement, areaId?: string, code?: string) => void;
  onDetails: (group: AdminSubarea<Sector>, trigger: HTMLElement) => void;
  onEdit: (sector: Sector, trigger: HTMLElement) => void;
  onQR: (name: string, trigger: HTMLElement) => void;
  nextDate: (sector: Sector) => string | null;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const allSubareas = useMemo(() => groupAdminSubareas(sectors), [sectors]);
  const visibleSubareas = useMemo(() => groupAdminSubareas(sectors, query), [sectors, query]);
  const groups = useMemo(() => {
    const result = groupAdminSectors(visibleSubareas.flatMap(group => group.sectors));
    for (const area of areas) {
      if (!result.some(group => group.slug === area.slug) && (!query.trim() || area.name.toLocaleLowerCase('de').includes(query.trim().toLocaleLowerCase('de')))) {
        result.push({ slug: area.slug, name: area.name, order: area.sort_order, sectors: [] });
      }
    }
    return result.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'de'));
  }, [visibleSubareas, areas, query]);
  const isOpen = (key: string) => Boolean(query.trim()) || !collapsed.has(key);
  const toggle = (key: string) => setCollapsed(previous => { const next = new Set(previous); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  const allClosed = groups.length > 0 && groups.every(group => collapsed.has(group.slug));

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-muted-foreground" aria-live="polite">{visibleSubareas.length} von {allSubareas.length} Teilbereichen</p>
      {groups.length > 0 && <Button type="button" variant="ghost" disabled={Boolean(query.trim())} className="h-11 px-2 text-xs" onClick={() => setCollapsed(allClosed ? new Set() : new Set(groups.map(group => group.slug)))}>{allClosed ? 'Alle ausklappen' : 'Alle einklappen'}</Button>}
    </div>
    {groups.map(group => {
      const area = areas.find(candidate => candidate.slug === group.slug);
      const subareas = visibleSubareas.filter(subarea => (subarea.areaSlug ?? 'unassigned') === group.slug);
      const opened = isOpen(group.slug);
      const contentId = `sector-group-${group.slug}`;
      return <section key={group.slug} aria-label={group.name} className="min-w-0">
        <div className="mb-3 flex min-w-0 items-center gap-2">
          <h3 className="min-w-0 flex-1"><button type="button" className="flex min-h-11 w-full items-center gap-2 rounded-kws-control text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-expanded={opened} aria-controls={contentId} onClick={() => toggle(group.slug)} disabled={Boolean(query.trim())}>
            <ChevronDown aria-hidden="true" className={cn('h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none', !opened && '-rotate-90')} />
            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: getSectorAreaPalette(group.slug).regionFill }} />
            <span className="break-words text-base font-semibold">{group.name}</span><span className="text-xs font-normal text-muted-foreground">{subareas.length}</span>
            <span aria-hidden="true" className="mx-1 h-px flex-1 bg-border/60" />
          </button></h3>
          {area && hierarchyEditable && <Button type="button" variant="ghost" className="h-11 shrink-0 gap-1.5 px-2 text-xs" onClick={event => onCreate(event.currentTarget, area.id)} aria-label={`Teilbereich in ${group.name} anlegen`}><Plus className="h-4 w-4" aria-hidden="true" />Teilbereich</Button>}
        </div>
        <div id={contentId} hidden={!opened}>
          {subareas.length === 0 && <div className="flex flex-wrap items-center justify-between gap-3 rounded-kws-card bg-secondary/70 p-4"><p className="text-sm text-muted-foreground">Noch keine Teilbereiche</p>{hierarchyEditable && area && <Button type="button" variant="secondary" onClick={event => onCreate(event.currentTarget, area.id)}>Ersten Teilbereich anlegen</Button>}</div>}
          <ul aria-label={`Teilbereiche ${group.name}`} className="grid min-w-0 gap-3 md:grid-cols-2 min-[1280px]:grid-cols-3">
            {subareas.map(subarea => {
              const image = subarea.sectors.find(sector => sector.image_url)?.image_url;
              const dates = subarea.sectors.map(nextDate).filter((date): date is string => Boolean(date));
              const date = dates.sort((a, b) => a.split('.').reverse().join('').localeCompare(b.split('.').reverse().join('')))[0];
              const inactive = subarea.sectors.every(sector => sector.is_active === false);
              return <li key={subarea.key} className={cn(kwsSurfaceClassName, 'min-w-0 overflow-hidden')}>
                <button type="button" className="flex w-full min-w-0 items-center gap-3 p-4 text-left transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" aria-label={`${subarea.name} Details öffnen`} onClick={event => onDetails(subarea, event.currentTarget)}>
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-kws-control bg-secondary">{image ? <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" /> : <span className="text-xl font-semibold text-foreground">{subarea.code || '–'}</span>}</span>
                  <span className="min-w-0 flex-1"><span className="block break-words font-sans text-sm font-semibold">{subarea.name}</span><span className="mt-1 block text-xs text-muted-foreground">{subarea.boulderCount === null ? 'Boulderzahl nicht verfügbar' : `${subarea.boulderCount} Boulder`}{inactive ? ' · Inaktiv' : subarea.sectors.length > 1 ? ` · ${subarea.sectors.length} Flächen` : ''}</span></span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
                <div className="flex items-center justify-end gap-1 px-3 pb-2">{date && <span className="mr-auto inline-flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />{date}</span>}
                  <Button type="button" variant="ghost" size="icon" className="h-11 w-11" aria-label={`${subarea.name} QR-Code anzeigen`} onClick={event => onQR(subarea.name, event.currentTarget)}><QrCode className="h-4 w-4" /></Button>
                  <Button type="button" variant="ghost" className="h-11 gap-1.5 px-2 text-xs" aria-label={`${subarea.name} bearbeiten`} onClick={event => subarea.sectors.length === 1 ? onEdit(subarea.sectors[0], event.currentTarget) : onDetails(subarea, event.currentTarget)}><Pencil className="h-4 w-4" />Bearbeiten</Button>
                </div>
              </li>;
            })}
          </ul>
        </div>
      </section>;
    })}
  </div>;
}
