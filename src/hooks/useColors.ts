import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { supabaseRestRequest } from '@/lib/supabaseRest';
import { persistColorOrder, type ColorPosition } from '@/lib/colorOrder';

export interface ColorRow {
  id: string;
  name: string;
  hex: string;
  secondary_hex?: string | null; // Optional second color for two-color grips
  is_active: boolean;
  sort_order: number;
}

export function useColors() {
  return useQuery<ColorRow[]>({
    queryKey: ['colors'],
    // Public catalog (RLS SELECT USING true): never attach an expiring user JWT.
    // Admin mutations below still use the authenticated client and its RLS policies.
    queryFn: () => supabaseRestRequest<ColorRow[]>(
      '/rest/v1/colors?select=*&order=sort_order.asc&is_active=eq.true',
    ),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnMount: true,
  });
}

// The public picker stays active-only. Administrators must also be able to
// find and reactivate a disabled color without changing the public catalog.
export function useAdminColors() {
  return useQuery<ColorRow[]>({
    queryKey: ['colors', 'admin'],
    // Same public read policy/transport as useColors; only the admin view
    // includes inactive rows. Writes still require authenticated admin RLS.
    queryFn: () => supabaseRestRequest<ColorRow[]>(
      '/rest/v1/colors?select=*&order=sort_order.asc,name.asc',
    ),
  });
}

export function useAddDefaultColors() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('colors').upsert([
        { name: 'Grün', hex: '#22c55e', sort_order: 1 },
        { name: 'Gelb', hex: '#facc15', sort_order: 2 },
        { name: 'Blau', hex: '#3b82f6', sort_order: 3 },
        { name: 'Orange', hex: '#f97316', sort_order: 4 },
        { name: 'Rot', hex: '#ef4444', sort_order: 5 },
        { name: 'Schwarz', hex: '#111827', sort_order: 6 },
        { name: 'Weiß', hex: '#ffffff', sort_order: 7 },
        { name: 'Lila', hex: '#a855f7', sort_order: 8 },
      ], { onConflict: 'name', ignoreDuplicates: true });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['colors'] });
      toast.success('Fehlende Standardfarben ergänzt');
    },
  });
}

export function useReorderColors() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ expected, ids }: { expected: ColorPosition[]; ids: string[] }) => {
      const read = async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15_000);
        try {
          const { data, error } = await supabase.from('colors').select('id, sort_order').abortSignal(controller.signal);
          if (error) throw error;
          return data;
        } finally { clearTimeout(timer); }
      };
      return persistColorOrder(expected, ids, {
        read,
        update: async (id, from, to) => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 15_000);
          try {
            const { data, error } = await supabase.from('colors')
              .update({ sort_order: to }).eq('id', id).eq('sort_order', from).select('id').abortSignal(controller.signal);
            if (error) throw error;
            if (data?.length !== 1) throw new Error('Farbe geändert oder keine Schreibberechtigung.');
          } finally { clearTimeout(timer); }
        },
      });
    },
    // Both public pickers and the admin list must refresh, including after a
    // partially failed write. No optimistic success can hide a server error.
    onSettled: () => qc.invalidateQueries({ queryKey: ['colors'] }),
    onSuccess: () => toast.success('Reihenfolge gespeichert'),
  });
}

export function useCreateColor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; hex: string; secondary_hex?: string | null; sort_order?: number; is_active?: boolean }) => {
      const { error } = await supabase.from('colors').insert({
        name: payload.name,
        hex: payload.hex,
        secondary_hex: payload.secondary_hex || null,
        sort_order: payload.sort_order ?? 0,
        is_active: payload.is_active ?? true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['colors'] });
      toast.success('Farbe erfolgreich erstellt!');
    },
    onError: (error: any) => {
      toast.error('Fehler beim Erstellen: ' + (error.message || 'Unbekannter Fehler'));
    },
  });
}

export function useUpdateColor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<ColorRow> & { id: string }) => {
      console.log('[useUpdateColor] mutationFn called with payload:', payload);
      
      // Check admin status first
      const { data: currentUser } = await supabase.auth.getUser();
      if (currentUser?.user?.id) {
        const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
          _user_id: currentUser.user.id,
          _role: 'admin'
        });
        console.log('[useUpdateColor] Admin check:', { userId: currentUser.user.id, isAdmin, roleError });
        if (!isAdmin) {
          throw new Error('Nur Admins können Farben bearbeiten. Bitte melde dich als Admin an.');
        }
      } else {
        console.error('[useUpdateColor] No current user found!');
        throw new Error('Nicht eingeloggt. Bitte melde dich an.');
      }
      
      const { id, ...rest } = payload;
      // Only update fields that are actually provided
      const updateData: Partial<ColorRow> = {};
      if (rest.name !== undefined) updateData.name = rest.name;
      if (rest.hex !== undefined) updateData.hex = rest.hex;
      if (rest.secondary_hex !== undefined) updateData.secondary_hex = rest.secondary_hex || null;
      if (rest.is_active !== undefined) updateData.is_active = rest.is_active;
      if (rest.sort_order !== undefined) updateData.sort_order = rest.sort_order;
      
      console.log('[useUpdateColor] Prepared updateData:', updateData);
      console.log('[useUpdateColor] Updating color with id:', id);
      
      const { data, error } = await supabase.from('colors').update(updateData).eq('id', id).select();
      
      console.log('[useUpdateColor] Supabase response:', { data, error });
      
      if (error) {
        console.error('[useUpdateColor] Supabase error:', error);
        throw error;
      }
      
      // Check if anything was actually updated (RLS might block silently)
      if (!data || data.length === 0) {
        console.error('[useUpdateColor] No rows updated! This might be due to RLS policies.');
        // Try to fetch the color again to confirm it still exists
        const { data: stillExists, error: fetchError } = await supabase
          .from('colors')
          .select('id, name')
          .eq('id', id)
          .maybeSingle();
        
        console.log('[useUpdateColor] Verification fetch:', { stillExists, fetchError });
        
        if (stillExists) {
          throw new Error('Farbe konnte nicht aktualisiert werden. Möglicherweise fehlen die Berechtigungen (RLS Policy). Bist du als Admin eingeloggt?');
        } else {
          throw new Error('Farbe wurde nicht gefunden.');
        }
      }
      
      console.log('[useUpdateColor] Update successful, returned data:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('[useUpdateColor] onSuccess called, invalidating queries');
      qc.invalidateQueries({ queryKey: ['colors'] });
      toast.success('Farbe erfolgreich aktualisiert!');
    },
    onError: (error: any) => {
      console.error('[useUpdateColor] onError called:', error);
      toast.error('Fehler beim Aktualisieren: ' + (error.message || 'Unbekannter Fehler'));
    },
  });
}

export function useDeleteColor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from('colors').delete().eq('id', id).select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('Farbe konnte nicht gelöscht werden. Prüfe deine Berechtigung und lade die Liste neu.');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['colors'] });
      toast.success('Farbe erfolgreich gelöscht!');
    },
    onError: (error: any) => {
      toast.error('Fehler beim Löschen: ' + (error.message || 'Unbekannter Fehler'));
    },
  });
}


