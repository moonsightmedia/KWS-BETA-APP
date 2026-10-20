import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { HallMapView } from '@/components/HallMapView';
import { KwsSurface } from '@/components/ui/kws-surface';
import { buildResetSequence } from '@/lib/hallMapStatus';
import { formatHallDate, type ResetAppointment } from '@/lib/resetSchedule';
import { cn } from '@/lib/utils';
import type { Sector } from '@/types/boulder';

export function ResetSequenceMap({ appointments, sectors }: { appointments: readonly ResetAppointment[]; sectors: Sector[] }) {
  const entries = useMemo(() => buildResetSequence(appointments), [appointments]);
  const [selected, setSelected] = useState<string[]>([]);
  const links = useRef(new Map<number, HTMLAnchorElement>());
  const annotations = useMemo(() => Object.fromEntries(entries.flatMap(entry => entry.ids.map(id => [id, {
    label: String(entry.number),
    description: `Nummer ${entry.number}, ${formatHallDate(entry.when, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })} Uhr`,
  }]))), [entries]);
  const select = (id: string) => {
    const entry = entries.find(item => item.ids.includes(id));
    if (!entry) return;
    setSelected(entry.ids);
    const link = links.current.get(entry.number);
    link?.focus({ preventScroll: true });
    link?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  };
  return <section aria-label="Reihenfolge der Umschraubungen" className="space-y-4" data-reset-sequence>
    <div><h2 className="text-base font-semibold">Als Nächstes an der Wand</h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">Die Nummern zeigen den nächsten Termin je Teilbereich. Gleiche Uhrzeit bedeutet gleichzeitig.</p></div>
    <div data-swipe-ignore><HallMapView sectors={sectors} countsBySectorId={{}} sectorAnnotations={annotations}
      selectedSectorIds={selected} onSelectSectorId={select} onClearSector={() => setSelected([])}
      markerActionLabel="Termin anzeigen" annotationsOnlyInteractive showSelectionActions={false} showCounts={false} compact frameless
      viewportClassName="!min-h-0 h-[520px] sm:h-[440px]" lockAspectRatio /></div>
    <KwsSurface className="p-4">
      <ol className="divide-y divide-border/60" aria-label="Nummerierte Schraubtermine">
        {entries.map(entry => {
          const active = entry.ids.some(id => selected.includes(id));
          const previous = entries[entry.number - 2];
          return <li key={`${entry.when.toISOString()}-${entry.name}`} className="first:pt-0 last:pb-0" data-reset-sequence-number={entry.number}>
            <div className={cn('flex items-start gap-3 rounded-kws-control px-1 py-3', active && 'bg-primary/10')}>
              <span aria-hidden="true" className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-kws-badge bg-primary font-semibold text-primary-foreground">{entry.number}</span>
              <div className="min-w-0 flex-1">
                {entry.ids.length ? <Link ref={node => { if (node) links.current.set(entry.number, node); else links.current.delete(entry.number); }}
                  to={`/boulders?sector=${encodeURIComponent(entry.name)}`} aria-label={`Aktuelle Boulder in ${entry.name}`}
                  className="inline-flex min-h-11 items-center rounded-kws-control text-sm font-semibold hover:text-primary-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{entry.name}</Link>
                  : <p className="py-3 text-sm font-semibold">{entry.name}</p>}
                <p className="text-xs leading-5 text-muted-foreground"><time dateTime={entry.when.toISOString()}>{formatHallDate(entry.when, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} Uhr</time>
                  {previous?.when.getTime() === entry.when.getTime() && <span className="ml-2">· gleichzeitig mit Nr. {previous.number}</span>}</p>
              </div>
            </div>
          </li>;
        })}
      </ol>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">Alle Termine und Hinweise findest du auch im Kalender.</p>
    </KwsSurface>
  </section>;
}
