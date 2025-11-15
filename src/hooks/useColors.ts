import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ColorRow {
  id: string;
  name: string;
  hex: string;
  is_active: boolean;
  sort_order: number;
}

export function useColors() {
  return useQuery<ColorRow[]>({
    queryKey: ['colors'],
    queryFn: async () => {
      const { data, error } = await supabase.from('colors').select('*').order('sort_order', { ascending: true });
      if (error) throw error;
      return data as ColorRow[];
    },
  });
}

export function useCreateColor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; hex: string; sort_order?: number; is_active?: boolean }) => {
      const { error } = await supabase.from('colors').insert({
        name: payload.name,
        hex: payload.hex,
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
      const { error } = await supabase.from('colors').delete().eq('id', id);
      if (error) throw error;
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


