import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { transformBoulder } from '@/lib/dataTransformers';
import { Boulder as FrontendBoulder } from '@/types/boulder';
import { useSectors } from './useSectors';
import { deleteBetaVideo } from '@/integrations/supabase/storage';

export interface Boulder {
  id: string;
  name: string;
  sector_id: string;
  sector_id_2?: string | null;
  difficulty: number;
  color: string;
  beta_video_url: string | null;
  note: string | null;
  status?: 'haengt' | 'abgeschraubt';
  created_at: string;
  updated_at: string;
}

export const useBoulders = () => {
  return useQuery({
    queryKey: ['boulders'],
    queryFn: async () => {
      console.log('[useBoulders] Fetching boulders from Supabase...');
      const { data, error } = await supabase
        .from('boulders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useBoulders] Error fetching boulders:', error);
        throw error;
      }
      
      console.log('[useBoulders] Fetched boulders:', data?.length || 0, 'boulders');
      if (data && data.length > 0) {
        console.log('[useBoulders] Sample boulder:', data[0]);
      }
      
      return data as Boulder[];
    },
    staleTime: 0, // Always consider data stale
    gcTime: 5 * 60 * 1000, // Keep data in cache for 5 minutes (for smooth UX)
    refetchOnMount: true, // Always refetch on mount
  });
};

/**
 * Hook der Boulders mit Sektor-Informationen zurückgibt (transformiert zu Frontend Types)
 */
export const useBouldersWithSectors = () => {
  const { data: boulders, isLoading: isLoadingBoulders, error } = useBoulders();
  const { data: sectors, isLoading: isLoadingSectors } = useSectors();

  console.log('[useBouldersWithSectors] Raw boulders:', boulders?.length || 0, 'sectors:', sectors?.length || 0, 'isLoadingBoulders:', isLoadingBoulders, 'isLoadingSectors:', isLoadingSectors);

  // Only transform if we have both boulders and sectors (or at least boulders)
  const transformedBoulders: FrontendBoulder[] | undefined = boulders && boulders.length > 0
    ? boulders.map(b => {
        try {
          return transformBoulder(b, sectors);
        } catch (error) {
          console.error('[useBouldersWithSectors] Error transforming boulder:', b.id, error);
          // Return a fallback boulder
          return {
            id: b.id,
            name: b.name,
            sector: 'Unbekannter Sektor',
            difficulty: b.difficulty as any,
            color: b.color as any,
            betaVideoUrl: b.beta_video_url || undefined,
            note: b.note || undefined,
            createdAt: new Date(b.created_at),
            status: (b as any).status || 'haengt',
          };
        }
      })
    : undefined;

  console.log('[useBouldersWithSectors] Transformed boulders:', transformedBoulders?.length || 0);
  if (transformedBoulders && transformedBoulders.length > 0) {
    console.log('[useBouldersWithSectors] Sample transformed boulder:', transformedBoulders[0]);
  }

  return {
    data: transformedBoulders,
    isLoading: isLoadingBoulders || isLoadingSectors,
    error,
    rawBoulders: boulders,
  };
};

export const useUpdateBoulder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Boulder> & { id: string }) => {
      const { data, error } = await supabase
        .from('boulders')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('Boulder konnte nicht aktualisiert werden. Möglicherweise fehlen die Berechtigungen.');
      }    
      return { data, updates };
    },
    onSuccess: (result) => {
      // Always invalidate boulders
      queryClient.invalidateQueries({ queryKey: ['boulders'] });
      
      // If sector_id was changed, also invalidate sectors (affects boulder_count)
      if (result.updates.sector_id !== undefined) {
        queryClient.invalidateQueries({ queryKey: ['sectors'] });
      }
      
      // If status was changed, also invalidate sectors (affects boulder_count)
      if (result.updates.status !== undefined) {
        queryClient.invalidateQueries({ queryKey: ['sectors'] });
      }
      
      toast.success('Boulder erfolgreich aktualisiert!');
    },
    onError: (error) => {
      toast.error('Fehler beim Aktualisieren: ' + error.message);
    },
  });
};

export const useCreateBoulder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newBoulder: Omit<Boulder, 'id' | 'created_at' | 'updated_at'>) => {
      // Erstelle den Boulder
      const { data, error } = await supabase
        .from('boulders')
        .insert(newBoulder)
        .select()
        .single();

      if (error) throw error;

      // Aktualisiere automatisch den last_schraubtermin des Sektors
      const { error: sectorError } = await supabase
        .from('sectors')
        .update({ 
          last_schraubtermin: new Date().toISOString() 
        })
        .eq('id', newBoulder.sector_id);

      if (sectorError) {
        console.error('Fehler beim Aktualisieren des Sektor-Schraubtermins:', sectorError);
        // Wir werfen den Fehler nicht, da der Boulder bereits erstellt wurde
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boulders'] });
      queryClient.invalidateQueries({ queryKey: ['sectors'] });
      toast.success('Boulder erfolgreich erstellt!');
    },
    onError: (error) => {
      toast.error('Fehler beim Erstellen: ' + error.message);
    },
  });
};

export const useDeleteBoulder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      console.log('[useDeleteBoulder] Starting deletion for boulder ID:', id);
      
      // First, get the boulder to check if it has a beta video
      const { data: boulder, error: fetchError } = await supabase
        .from('boulders')
        .select('beta_video_url, name')
        .eq('id', id)
        .maybeSingle();

      if (fetchError) {
        console.error('[useDeleteBoulder] Error fetching boulder:', fetchError);
        throw fetchError;
      }

      if (!boulder) {
        console.warn('[useDeleteBoulder] Boulder not found:', id);
        throw new Error('Boulder nicht gefunden');
      }

      console.log('[useDeleteBoulder] Boulder found:', boulder.name, 'Video URL:', boulder.beta_video_url);

      // Delete the beta video if it exists
      if (boulder?.beta_video_url) {
        console.log('[useDeleteBoulder] Deleting beta video:', boulder.beta_video_url);
        try {
          await deleteBetaVideo(boulder.beta_video_url);
          console.log('[useDeleteBoulder] Beta video deleted successfully');
        } catch (error) {
          console.error('[useDeleteBoulder] Error deleting beta video (continuing anyway):', error);
          // Continue with boulder deletion even if video deletion fails
        }
      }

      // Then delete the boulder
      console.log('[useDeleteBoulder] Deleting boulder from database:', id);
      const { data: deleteData, error } = await supabase
        .from('boulders')
        .delete()
        .eq('id', id)
        .select();

      if (error) {
        console.error('[useDeleteBoulder] Error deleting boulder:', error);
        throw error;
      }

      console.log('[useDeleteBoulder] Boulder deleted successfully. Response:', deleteData);
      
      // Check if anything was actually deleted
      if (!deleteData || deleteData.length === 0) {
        console.error('[useDeleteBoulder] No rows deleted! This might be due to RLS policies.');
        // Try to fetch the boulder again to confirm it still exists
        const { data: stillExists } = await supabase
          .from('boulders')
          .select('id, name')
          .eq('id', id)
          .maybeSingle();
        
        if (stillExists) {
          throw new Error('Boulder konnte nicht gelöscht werden. Möglicherweise fehlen die Berechtigungen (RLS Policy).');
        }
      }
    },
    onSuccess: () => {
      console.log('[useDeleteBoulder] Deletion successful, invalidating cache...');
      // Invalidate both boulders and sectors (deletion affects sector boulder_count)
      queryClient.invalidateQueries({ queryKey: ['boulders'] });
      queryClient.invalidateQueries({ queryKey: ['sectors'] });
      // Force refetch immediately
      queryClient.refetchQueries({ queryKey: ['boulders'] });
      queryClient.refetchQueries({ queryKey: ['sectors'] });
      console.log('[useDeleteBoulder] Cache invalidated and refetched');
      toast.success('Boulder erfolgreich gelöscht!');
    },
    onError: (error) => {
      toast.error('Fehler beim Löschen: ' + error.message);
    },
  });
};

export const useBulkUpdateBoulderStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { ids: string[]; status: 'haengt' | 'abgeschraubt' }) => {
      const { error } = await supabase
        .from('boulders')
        .update({ status: payload.status })
        .in('id', payload.ids);
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate both boulders and sectors (status changes affect sector boulder_count)
      queryClient.invalidateQueries({ queryKey: ['boulders'] });
      queryClient.invalidateQueries({ queryKey: ['sectors'] });
      toast.success('Status aktualisiert');
    },
    onError: (error) => toast.error('Status-Update fehlgeschlagen: ' + error.message)
  });
};
