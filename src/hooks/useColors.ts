import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export interface ColorRow {
  id: string;
  name: string;
  hex: string;
  secondary_hex?: string | null; // Optional second color for two-color grips
  is_active: boolean;
  sort_order: number;
}

export function useColors() {
  const { session, loading: authLoading } = useAuth();

  return useQuery<ColorRow[]>({
    queryKey: ['colors'],
    enabled: !authLoading, // Only run query if auth is complete (even if no user is logged in)
    queryFn: async () => {
      console.log('[useColors] 🔵 STARTING fetch from Supabase...');
      console.log('[useColors] 🔍 Query function called - this means enabled=true and React Query is executing the query');

      // Use direct fetch instead of Supabase QueryBuilder to avoid hanging issues after reload
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      if (!SUPABASE_URL || !SUPABASE_KEY) {
        throw new Error('Supabase-Konfiguration fehlt');
      }

      // CRITICAL: Use session from useAuth hook instead of supabase.auth.getSession()
      // to avoid hanging issues after reload.
      // Colors should be publicly accessible, but we include the token if available for RLS
      const headers: HeadersInit = {
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      };

      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      console.log('[useColors] 🔵 Calling REST fetch with session:', { hasSession: !!session, hasToken: !!session?.access_token });

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/colors?select=*&order=sort_order.asc&is_active=eq.true`,
        {
          method: 'GET',
          headers,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[useColors] ❌ Error fetching colors:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('[useColors] ✅ REST fetch data:', data.length, 'colors');
      return data as ColorRow[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnMount: true,
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


