import { useLayoutEffect, useRef, type RefObject } from 'react';
import { Search, X } from 'lucide-react';
import { HallMapView } from '@/components/HallMapView';
import { Input } from '@/components/ui/input';
import type { BoulderSectorReference } from '@/lib/sectorAreas';
import type { Sector } from '@/types/boulder';

interface BoulderMapPanelProps {
  headerRef: RefObject<HTMLDivElement>;
  searchInputRef: RefObject<HTMLInputElement>;
  sectors: Sector[];
  countsBySectorId: Record<string, number>;
  boulderSectorReferences: readonly BoulderSectorReference[];
  selected: string[];
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (name: string) => void;
  onClear: () => void;
  onShowResults: () => void;
}

export function BoulderMapPanel({ headerRef, searchInputRef, sectors, countsBySectorId, boulderSectorReferences, selected, query, onQueryChange, onSelect, onClear, onShowResults }: BoulderMapPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const header = headerRef.current;
    if (!panel || !header) return;
    const measure = () => {
      panel.style.setProperty('--boulder-map-header-height', `${header.getBoundingClientRect().height}px`);
      // VisualViewport also responds to keyboards that overlay the layout viewport.
      panel.style.setProperty('--boulder-map-viewport-height', `${window.visualViewport?.height ?? window.innerHeight}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    window.visualViewport?.addEventListener('resize', measure);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.visualViewport?.removeEventListener('resize', measure);
      window.removeEventListener('resize', measure);
    };
  }, [headerRef]);

  return <section ref={panelRef} aria-label="Hallenkarten-Auswahl" data-swipe-ignore className="-mx-4 mb-4 flex h-[calc(var(--boulder-map-viewport-height,100dvh)-var(--boulder-map-header-height,80px)-var(--mobile-nav-floating-offset)-16px)] min-h-0 flex-col gap-3 px-3 py-3 md:-mx-8 md:h-[calc(var(--boulder-map-viewport-height,100dvh)-var(--boulder-map-header-height,96px)-24px)] md:px-8">
    <div className="relative shrink-0">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input ref={searchInputRef} aria-label="Boulder oder Bereich suchen" placeholder="Boulder oder Bereich suchen…" value={query} onChange={event => onQueryChange(event.target.value)} className="border-0 bg-secondary pl-10 pr-11 shadow-none" />
      {query && <button type="button" aria-label="Kartensuche zurücksetzen" onClick={() => onQueryChange('')} className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-kws-control text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X className="h-4 w-4" /></button>}
    </div>
    <HallMapView sectors={sectors} countsBySectorId={countsBySectorId} boulderSectorReferences={boulderSectorReferences} selectedSectorNames={selected} onSelectSector={onSelect} onClearSector={onClear} onClose={onShowResults} compact frameless fitContainer />
  </section>;
}
