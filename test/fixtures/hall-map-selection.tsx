import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HallMapView } from '@/components/HallMapView';
import { resolveSectorArea } from '@/lib/sectorAreas';
import { fixtureSectors } from './admin-hallmap-hooks';
import '@/index.css';

const query = new URLSearchParams(location.search);
const boundaries = query.has('boundaries');
const sectors = boundaries
  ? [
      { id: 'a', name: 'Bug A', area: { name: 'Bug', slug: 'bug', sortOrder: 1 }, subareaCode: 'A', boulderCount: 0 },
      { id: 'b', name: 'Bug B', area: { name: 'Bug', slug: 'bug', sortOrder: 1 }, subareaCode: 'B', boulderCount: 0 },
    ]
  : fixtureSectors.map(sector => {
      const resolved = resolveSectorArea(sector);
      return { ...sector, name: resolved.publicName, legacyName: sector.name, area: resolved.area, subareaCode: resolved.subareaCode, boulderCount: sector.boulder_count };
    });

function Fixture() {
  const [selected, setSelected] = useState<string[]>(query.has('initialB') ? ['Bug B'] : []);
  const mode = query.get('mode') || 'names';
  const byId = mode === 'ids';
  return <main className="mx-auto max-w-[1180px] p-4 md:p-8">
    <h1 className="mb-4 text-xl font-semibold">Hallenkarte</h1>
    <HallMapView
      sectors={sectors}
      countsBySectorId={Object.fromEntries(sectors.map(sector => [sector.id, sector.boulderCount]))}
      selectedSectorName={query.has('staleSingle') ? 'Bug A' : undefined}
      selectedSectorNames={query.has('staleNames') ? ['Bug A'] : byId ? undefined : selected}
      selectedSectorId={query.has('staleSingle') ? sectors.find(sector => sector.name === 'Bug A')!.id : undefined}
      selectedSectorIds={byId || mode === 'both' ? selected.map(name => sectors.find(sector => sector.name === name)!.id) : undefined}
      onSelectSector={byId ? undefined : name => setSelected(values => values.includes(name) ? values.filter(value => value !== name) : [...values, name])}
      onSelectSectorId={byId ? id => {
        const name = sectors.find(sector => sector.id === id)!.name;
        setSelected(values => values.includes(name) ? values.filter(value => value !== name) : [...values, name]);
      } : undefined}
      onClearSector={() => setSelected([])}
      frameless={!query.has('framed')}
      compact={!query.has('framed')}
      disablePanZoom={query.has('static')}
      lockAspectRatio={!query.has('fixed')}
      viewportClassName={query.has('fixed') ? 'h-[240px] min-h-0' : undefined}
    />
    <span data-testid="selection" className="sr-only">{JSON.stringify(selected)}</span>
  </main>;
}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><Fixture /></QueryClientProvider>);
