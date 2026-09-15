import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import type { SectorArea } from '@/hooks/useSectors';
import { readAdminRows } from '@/lib/adminRead';

/** Independent catalog: empty areas must also be selectable. RLS remains authoritative. */
export function useSectorAreas() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['sector-areas', session?.user.id],
    enabled: Boolean(session?.access_token),
    retry: false,
    queryFn: ({ signal }) => readAdminRows<SectorArea>(
      'sector_areas?select=id,name,slug,sort_order,description,is_active&order=sort_order.asc,name.asc',
      session!.access_token, signal,
    ),
  });
}

export type CreateSectorArea = { id: string; name: string; slug: string; sort_order: number };

export function useCreateSectorArea() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (area: CreateSectorArea): Promise<SectorArea> => {
      const token = session?.access_token;
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      if (!token || !url || !key) throw new Error('Bitte melde dich erneut an.');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      try {
        // Stable client ID + DO NOTHING allows a safe retry after a lost response.
        // Never use merge-duplicates: a retry must not overwrite an existing area.
        const response = await fetch(`${url}/rest/v1/sector_areas?on_conflict=id`, {
          method: 'POST', signal: controller.signal,
          headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=representation' },
          body: JSON.stringify({ ...area, description: null, is_active: true }),
        });
        if (!response.ok) {
          if (response.status === 409) { const error = new Error('Dieser Hauptbereich existiert bereits. Wähle einen anderen Namen.'); error.name = 'AreaConflictError'; throw error; }
          if (response.status === 401 || response.status === 403) throw new Error('Keine Berechtigung. Bitte melde dich erneut an.');
          throw new Error(`Bereich konnte nicht angelegt werden (${response.status}).`);
        }
        const rows = await readAdminRows<SectorArea>(`sector_areas?id=eq.${encodeURIComponent(area.id)}&select=*`, token, controller.signal);
        if (rows.length !== 1 || rows[0].id !== area.id || rows[0].name !== area.name || rows[0].slug !== area.slug) {
          throw new Error('Anlegen wurde nicht bestätigt. Bitte erneut versuchen.');
        }
        return rows[0];
      } finally { clearTimeout(timeout); }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sector-areas'] }),
        queryClient.invalidateQueries({ queryKey: ['sectors'] }),
      ]);
    },
  });
}
