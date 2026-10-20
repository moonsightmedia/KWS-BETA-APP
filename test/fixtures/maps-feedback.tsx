import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BoulderMapPanel } from '@/components/boulder/BoulderMapPanel';
import ResetSchedule from '@/pages/ResetSchedule';
import { SidebarProvider } from '@/components/SidebarContext';
import { transformSector } from '@/lib/dataTransformers';
import type { Sector as RawSector } from '@/hooks/useSectors';
import type { Boulder } from '@/types/boulder';
import snapshot from './hall-hierarchy-snapshot.json';
import '@/index.css';
const sectors = snapshot.sectors.map(sector => transformSector(sector as RawSector));
const boulder = (index: number, createdAt: string): Boulder => ({ id: `b${index}`, name: 'Beispielboulder', sector: sectors[index].name,
  sectorId: sectors[index].id, difficulty: 2, color: 'Grün', status: 'haengt', createdAt: new Date(createdAt) });
const boulders = [boulder(0, '2026-10-20T08:00:00Z'), boulder(1, '2026-10-20T10:00:00Z'), boulder(2, '2026-10-18T10:00:00Z')];
function BoulderMapFixture() {
  const headerRef = useRef<HTMLDivElement>(null); const searchRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<string[]>([]); const [query, setQuery] = useState('');
  return <div><header ref={headerRef} className="p-4"><h1 className="text-xl font-semibold">Boulderkarte · Beispieldaten</h1></header>
    <main className="mx-auto max-w-[1180px] px-4 md:px-8"><BoulderMapPanel headerRef={headerRef} searchInputRef={searchRef} sectors={sectors}
      boulders={new URLSearchParams(location.search).has('stale') ? [boulder(0, '2026-09-01T08:00:00Z')] : boulders}
      boulderSectorReferences={boulders} countsBySectorId={{}} selected={selected} query={query} onQueryChange={setQuery}
      onSelect={name => setSelected(current => current.includes(name) ? current.filter(item => item !== name) : [...current, name])}
      onClear={() => setSelected([])} onShowResults={() => {}} /></main></div>;
}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
  <MemoryRouter initialEntries={[new URLSearchParams(location.search).get('view') === 'boulders' ? '/map' : '/schedule']}><SidebarProvider>
    <p className="px-4 py-2 text-xs text-muted-foreground">Prüfansicht · Beispieldaten</p><Routes><Route path="/schedule" element={<ResetSchedule />} /><Route path="/map" element={<BoulderMapFixture />} />
      <Route path="/boulders" element={<p>Aktuelle Boulder im gewählten Bereich</p>} /></Routes>
  </SidebarProvider></MemoryRouter>
</QueryClientProvider>);
