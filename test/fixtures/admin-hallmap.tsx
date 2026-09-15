// Isolated HallMap QA: local query data and mutations only; no Supabase or storage access.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HallMapManagement } from '@/components/admin/HallMapManagement';
import { HallMapView } from '@/components/HallMapView';
import { resolveSectorArea } from '@/lib/sectorAreas';
import snapshot from './hall-hierarchy-snapshot.json';
import '@/index.css';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
const publicView = new URLSearchParams(location.search).has('view');
const sectors = snapshot.sectors.map((sector, index) => {
  const source = index === 0 && new URLSearchParams(location.search).has('extended')
    ? { ...sector, area: { id: 'training', name: 'Training', slug: 'training', sort_order: 6 }, subarea_code: 'A12' } : sector;
  const resolved = resolveSectorArea(source);
  return { id: sector.id, name: resolved.publicName, legacyName: sector.name, area: resolved.area, subareaCode: resolved.subareaCode, boulderCount: sector.boulder_count };
});
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={queryClient}><main className="mx-auto min-h-screen max-w-[1600px] bg-canvas p-4 md:p-8">{publicView ? <HallMapView sectors={sectors} countsBySectorId={{}} frameless={new URLSearchParams(location.search).get('view') === 'public'} /> : <HallMapManagement />}</main></QueryClientProvider>);
