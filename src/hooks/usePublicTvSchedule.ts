import { useQuery } from '@tanstack/react-query';

import { transformSector } from '@/lib/dataTransformers';
import type { Sector as FrontendSector } from '@/types/boulder';
import type { HallMap, MapPoint, SectorMapRegion } from '@/types/hallMap';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const TV_REFETCH_INTERVAL = 60_000;

export interface PublicSectorSchedule {
  id: string;
  sector_id: string;
  scheduled_at: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

interface PublicSectorRow {
  id: string;
  name: string;
  description: string | null;
  boulder_count: number;
  next_schraubtermin: string | null;
  last_schraubtermin: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

function requirePublicEnv() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Supabase-Konfiguration fehlt.');
  }
}

async function publicRestRequest<T>(path: string): Promise<T> {
  requirePublicEnv();

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      signal: controller.signal,
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY!,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}`);
    }

    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Zeitüberschreitung beim Laden der TV-Daten.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizePointsJson(value: unknown): MapPoint[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((point) => {
      if (!point || typeof point !== 'object') return null;
      const x = Number((point as { x?: unknown }).x);
      const y = Number((point as { y?: unknown }).y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      return { x, y };
    })
    .filter((point): point is MapPoint => point !== null);
}

function normalizeRegion(row: any): SectorMapRegion {
  return {
    id: row.id,
    hall_map_id: row.hall_map_id,
    sector_id: row.sector_id,
    shape_type: 'polygon',
    points_json: normalizePointsJson(row.points_json),
    label_x: row.label_x === null ? null : Number(row.label_x),
    label_y: row.label_y === null ? null : Number(row.label_y),
    z_index: Number(row.z_index ?? 0),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const usePublicTvSchedule = () =>
  useQuery({
    queryKey: ['tv', 'sector_schedule'],
    refetchInterval: TV_REFETCH_INTERVAL,
    retry: 2,
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      return publicRestRequest<PublicSectorSchedule[]>(
        `sector_schedule?select=*&scheduled_at=gte.${encodeURIComponent(nowIso)}&order=scheduled_at.asc`,
      );
    },
  });

export const usePublicTvSectors = () =>
  useQuery({
    queryKey: ['tv', 'sectors'],
    refetchInterval: TV_REFETCH_INTERVAL,
    retry: 2,
    queryFn: async () => {
      const rows = await publicRestRequest<PublicSectorRow[]>('sectors?select=*&order=name.asc');
      return rows.map(transformSector) as FrontendSector[];
    },
  });

export const usePublicActiveHallMap = () =>
  useQuery({
    queryKey: ['tv', 'hall_maps', 'active'],
    refetchInterval: TV_REFETCH_INTERVAL,
    retry: 2,
    queryFn: async () => {
      const rows = await publicRestRequest<HallMap[]>('hall_maps?select=*&is_active=eq.true&limit=1');
      return rows[0] ?? null;
    },
  });

export const usePublicSectorMapRegions = (hallMapId?: string | null) =>
  useQuery({
    queryKey: ['tv', 'sector_map_regions', hallMapId],
    enabled: !!hallMapId,
    refetchInterval: TV_REFETCH_INTERVAL,
    retry: 2,
    queryFn: async () => {
      const rows = await publicRestRequest<any[]>(
        `sector_map_regions?select=*&hall_map_id=eq.${hallMapId}&order=z_index.asc,created_at.asc`,
      );
      return rows.map(normalizeRegion);
    },
  });
