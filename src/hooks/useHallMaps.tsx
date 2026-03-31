import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { HallMap, MapPoint, SectorMapRegion } from '@/types/hallMap';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function requireEnv() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Supabase-Konfiguration fehlt');
  }
}

function getHeaders(accessToken?: string | null) {
  requireEnv();

  if (!accessToken) {
    throw new Error('Keine aktive Session');
  }

  return {
    apikey: SUPABASE_PUBLISHABLE_KEY!,
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
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

async function apiRequest<T>(path: string, accessToken?: string | null, init?: RequestInit): Promise<T> {
  const headers = getHeaders(accessToken);
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        ...headers,
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const parsed = JSON.parse(errorText);
        throw new Error(parsed.message || parsed.error || errorText || `HTTP ${response.status}`);
      } catch {
        throw new Error(errorText || `HTTP ${response.status}`);
      }
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Zeitüberschreitung beim Laden der Hallenkarten');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const useHallMaps = (accessToken?: string | null, enabled: boolean = true) =>
  useQuery({
    queryKey: ['hall_maps'],
    enabled,
    retry: 1,
    queryFn: async () => apiRequest<HallMap[]>('hall_maps?select=*&order=is_active.desc,created_at.desc', accessToken),
  });

export const useActiveHallMap = (accessToken?: string | null, enabled: boolean = true) =>
  useQuery({
    queryKey: ['hall_maps', 'active'],
    enabled,
    retry: 1,
    queryFn: async () => {
      const results = await apiRequest<HallMap[]>('hall_maps?select=*&is_active=eq.true&limit=1', accessToken);
      return results[0] ?? null;
    },
  });

export const useSectorMapRegions = (hallMapId?: string | null, accessToken?: string | null, enabled: boolean = true) =>
  useQuery({
    queryKey: ['sector_map_regions', hallMapId],
    enabled: enabled && !!hallMapId,
    retry: 1,
    queryFn: async () => {
      const rows = await apiRequest<any[]>(
        `sector_map_regions?select=*&hall_map_id=eq.${hallMapId}&order=z_index.asc,created_at.asc`,
        accessToken,
      );
      return rows.map(normalizeRegion);
    },
  });

type HallMapInput = Pick<HallMap, 'name' | 'image_url' | 'width' | 'height' | 'is_active'> & {
  id?: string;
};

export const useCreateHallMap = (accessToken?: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: HallMapInput) => {
      if (input.is_active) {
        await apiRequest<unknown>('hall_maps?is_active=eq.true', accessToken, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            is_active: false,
            updated_at: new Date().toISOString(),
          }),
        });
      }

      const rows = await apiRequest<HallMap[]>('hall_maps', accessToken, {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          ...input,
          updated_at: new Date().toISOString(),
        }),
      });

      return rows[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hall_maps'] });
      queryClient.invalidateQueries({ queryKey: ['hall_maps', 'active'] });
      toast.success('Hallenkarte gespeichert');
    },
    onError: (error: Error) => {
      toast.error(`Hallenkarte konnte nicht gespeichert werden: ${error.message}`);
    },
  });
};

export const useUpdateHallMap = (accessToken?: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<HallMap> & { id: string }) => {
      if (updates.is_active) {
        await apiRequest<unknown>(`hall_maps?is_active=eq.true&id=neq.${id}`, accessToken, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            is_active: false,
            updated_at: new Date().toISOString(),
          }),
        });
      }

      const rows = await apiRequest<HallMap[]>(`hall_maps?id=eq.${id}`, accessToken, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          ...updates,
          updated_at: new Date().toISOString(),
        }),
      });

      return rows[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hall_maps'] });
      queryClient.invalidateQueries({ queryKey: ['hall_maps', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['sector_map_regions'] });
      toast.success('Hallenkarte aktualisiert');
    },
    onError: (error: Error) => {
      toast.error(`Hallenkarte konnte nicht aktualisiert werden: ${error.message}`);
    },
  });
};

export const useDeleteHallMap = (accessToken?: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest<unknown>(`hall_maps?id=eq.${id}`, accessToken, {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hall_maps'] });
      queryClient.invalidateQueries({ queryKey: ['hall_maps', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['sector_map_regions'] });
      toast.success('Hallenkarte gelöscht');
    },
    onError: (error: Error) => {
      toast.error(`Hallenkarte konnte nicht gelöscht werden: ${error.message}`);
    },
  });
};

type RegionInput = Pick<SectorMapRegion, 'hall_map_id' | 'sector_id' | 'shape_type' | 'points_json' | 'label_x' | 'label_y' | 'z_index'>;

export const useCreateSectorMapRegion = (accessToken?: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RegionInput) => {
      const rows = await apiRequest<any[]>('sector_map_regions', accessToken, {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          ...input,
          updated_at: new Date().toISOString(),
        }),
      });
      return normalizeRegion(rows[0]);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['hall_maps'] });
      queryClient.invalidateQueries({ queryKey: ['hall_maps', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['sector_map_regions', variables.hall_map_id] });
      toast.success('Sektorfläche gespeichert');
    },
    onError: (error: Error) => {
      toast.error(`Sektorfläche konnte nicht gespeichert werden: ${error.message}`);
    },
  });
};

export const useUpdateSectorMapRegion = (accessToken?: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SectorMapRegion> & { id: string }) => {
      const rows = await apiRequest<any[]>(`sector_map_regions?id=eq.${id}`, accessToken, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          ...updates,
          updated_at: new Date().toISOString(),
        }),
      });
      return normalizeRegion(rows[0]);
    },
    onSuccess: (region) => {
      queryClient.invalidateQueries({ queryKey: ['hall_maps'] });
      queryClient.invalidateQueries({ queryKey: ['hall_maps', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['sector_map_regions', region.hall_map_id] });
      toast.success('Sektorfläche aktualisiert');
    },
    onError: (error: Error) => {
      toast.error(`Sektorfläche konnte nicht aktualisiert werden: ${error.message}`);
    },
  });
};

export const useDeleteSectorMapRegion = (accessToken?: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, hallMapId }: { id: string; hallMapId: string }) => {
      await apiRequest<unknown>(`sector_map_regions?id=eq.${id}`, accessToken, {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      });
      return hallMapId;
    },
    onSuccess: (hallMapId) => {
      queryClient.invalidateQueries({ queryKey: ['hall_maps'] });
      queryClient.invalidateQueries({ queryKey: ['hall_maps', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['sector_map_regions', hallMapId] });
      toast.success('Sektorfläche gelöscht');
    },
    onError: (error: Error) => {
      toast.error(`Sektorfläche konnte nicht gelöscht werden: ${error.message}`);
    },
  });
};
