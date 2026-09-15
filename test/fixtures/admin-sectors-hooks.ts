import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import snapshot from './hall-hierarchy-snapshot.json';
import { resolveSectorArea } from '@/lib/sectorAreas';
import type { SectorArea } from '@/hooks/useSectors';
import type { CreateSectorArea } from '@/hooks/useSectorAreas';

export type FixtureSector = {
  id: string;
  name: string;
  description: string | null;
  boulder_count: number;
  active_boulder_ids?: string[];
  next_schraubtermin: string | null;
  last_schraubtermin: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  area_id?: string | null;
  subarea_code?: string | null;
  area?: SectorArea | null;
};

const initialSectors: FixtureSector[] = [
  { id: 'sector-bug', name: 'Testwand', description: 'Der kompakte Einstiegsbereich.', boulder_count: 7, next_schraubtermin: null, last_schraubtermin: null, image_url: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', created_at: '2026-09-01T10:00:00Z', updated_at: '2026-09-01T10:00:00Z' },
  { id: 'sector-grotte', name: 'Grotte', description: null, boulder_count: 3, next_schraubtermin: null, last_schraubtermin: null, image_url: null, created_at: '2026-09-01T10:00:00Z', updated_at: '2026-09-01T10:00:00Z' },
];

const wait = () => new Promise<void>((resolve) => setTimeout(resolve, window.sectorQA.delay));
const failIf = (operation: string) => {
  if (window.sectorQA.failures.includes(operation)) throw new Error(`Fixturefehler: ${operation}`);
};
const throwLostAck = (operation: string) => {
  if (window.sectorQA.lostAcknowledgements.includes(operation)) throw new Error(`Fixture-Lost-Ack: ${operation}`);
};
const refresh = (queryClient: ReturnType<typeof useQueryClient>) => queryClient.invalidateQueries({ queryKey: ['sectors'] });

export const useSectors = () => useQuery({
  queryKey: ['sectors'],
  queryFn: async () => {
    await wait();
    failIf('load');
    return window.sectorQA.sectors.map(sector => sector.area_id ? { ...sector, area: window.sectorQA.areas.find(area => area.id === sector.area_id) ?? sector.area } : sector);
  },
  retry: false,
});

export const useCreateSector = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<FixtureSector>) => {
      window.sectorQA.writes.push({ operation: 'create', payload });
      await wait();
      failIf('create');
      const sector: FixtureSector = { ...payload, id: `sector-${window.sectorQA.nextId++}`, name: payload.name ?? '', description: payload.description ?? null, boulder_count: 0, next_schraubtermin: null, last_schraubtermin: null, image_url: payload.image_url ?? null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      window.sectorQA.sectors = [...window.sectorQA.sectors, sector];
      throwLostAck('create');
      return sector;
    },
    onSuccess: () => refresh(queryClient),
  });
};

export const useUpdateSector = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<FixtureSector> & { id: string }) => {
      window.sectorQA.writes.push({ operation: 'update', id, payload });
      await wait();
      failIf('update');
      const current = window.sectorQA.sectors.find((sector) => sector.id === id);
      if (!current) throw new Error('Fixturesektor nicht gefunden');
      window.sectorQA.sectors = window.sectorQA.sectors.map((sector) => sector.id === id ? { ...sector, ...payload } : sector);
      throwLostAck('update');
      return { ...current, ...payload };
    },
    onSuccess: () => refresh(queryClient),
  });
};

export const useDeleteSector = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      window.sectorQA.writes.push({ operation: 'delete', id });
      try {
        await wait();
        failIf('delete');
        window.sectorQA.sectors = window.sectorQA.sectors.filter((sector) => sector.id !== id);
      } finally {
        window.sectorQA.settled.push({ operation: 'delete', id });
      }
    },
    onSuccess: () => refresh(queryClient),
  });
};

export const useSectorSchedule = () => useQuery({
  queryKey: ['sector_schedule'],
  queryFn: async () => [],
  retry: false,
});

declare global {
  interface Window {
    sectorQA: {
      sectors: FixtureSector[];
      areas: SectorArea[];
      writes: Array<Record<string, unknown>>;
      failures: string[];
      lostAcknowledgements: string[];
      settled: Array<Record<string, unknown>>;
      delay: number;
      nextId: number;
    };
  }
}

export const resetSectorFixture = () => {
  window.sectorQA = { sectors: structuredClone(initialSectors), areas: [], writes: [], failures: [], lostAcknowledgements: [], settled: [], delay: 0, nextId: 1 };
  const state = new URLSearchParams(location.search).get('state');
  if (state === 'hierarchy' || state === 'structured') window.sectorQA.sectors = snapshot.sectors.map(sector => {
    if (state !== 'structured') return sector;
    const resolved = resolveSectorArea(sector);
    const area = { ...resolved.area!, id: `fixture-${resolved.area!.slug}`, sort_order: resolved.area!.sortOrder, is_active: true, description: null };
    return { ...sector, area, area_id: area.id, subarea_code: resolved.subareaCode, sort_order: resolved.sortOrder, is_active: true };
  });
  window.sectorQA.areas = [...new Map(window.sectorQA.sectors.flatMap(sector => sector.area ? [[sector.area.id, sector.area] as const] : [])).values()];
};

export const useSectorAreas = () => useQuery({
  queryKey: ['sector-areas'], retry: false,
  queryFn: async () => { await wait(); failIf('areas'); return window.sectorQA.areas; },
});

export const useCreateSectorArea = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateSectorArea) => {
      window.sectorQA.writes.push({ operation: 'create-area', payload });
      await wait(); failIf('create-area');
      const existing = window.sectorQA.areas.find(area => area.id === payload.id);
      const area = existing ?? { ...payload, is_active: true, description: null };
      if (!existing) window.sectorQA.areas = [...window.sectorQA.areas, area];
      throwLostAck('create-area');
      return area;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sector-areas'] }),
  });
};
