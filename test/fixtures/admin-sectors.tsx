// Isolated SectorManagement QA. All query, mutation, storage and QR calls are local fixture calls.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SectorManagement } from '@/components/admin/SectorManagement';
import { resetSectorFixture } from './admin-sectors-hooks';
import '@/index.css';

resetSectorFixture();
const params = new URLSearchParams(location.search);
// Read-only captured production rows; mutations remain isolated fixture calls.
if (params.get('state') === 'live') {
  const response = await fetch('/test-results/sector-map-parity-20260914/live-sectors.json');
  if (!response.ok) throw new Error('Live snapshot missing; run the read-only parity audit first');
  window.sectorQA.sectors = await response.json();
  window.sectorQA.areas = [...new Map(window.sectorQA.sectors.flatMap(sector => sector.area ? [[sector.area.id, sector.area] as const] : [])).values()];
  if (!window.sectorQA.areas.length) window.sectorQA.failures = ['areas'];
}
if (params.get('state') === 'load-error') window.sectorQA.failures = ['load'];
if (params.get('state') === 'delete-error') window.sectorQA.failures = ['delete'];
if (params.get('state') === 'update-error') window.sectorQA.failures = ['update'];
if (params.get('state') === 'lost-ack') window.sectorQA.lostAcknowledgements = ['update'];
if (params.get('state') === 'slow') window.sectorQA.delay = 250;

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={queryClient}><main className="min-h-screen bg-canvas p-4 pb-28 md:p-8"><div className="mx-auto max-w-[1180px]"><SectorManagement /></div></main></QueryClientProvider>);
