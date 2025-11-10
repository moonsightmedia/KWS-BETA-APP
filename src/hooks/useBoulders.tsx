import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { transformBoulder } from '@/lib/dataTransformers';
import { Boulder as FrontendBoulder } from '@/types/boulder';
import { useSectors } from './useSectors';

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
      const { data, error } = await supabase
        .from('boulders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Boulder[];
    },
  });
};

/**
 * Hook der Boulders mit Sektor-Informationen zurückgibt (transformiert zu Frontend Types)
 */
export const useBouldersWithSectors = () => {
  const { data: boulders, isLoading, error } = useBoulders();
  const { data: sectors } = useSectors();

  const transformedBoulders: FrontendBoulder[] | undefined = boulders
    ? boulders.map(b => transformBoulder(b, sectors))
    : undefined;

  return {
    data: transformedBoulders,
    isLoading,
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
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boulders'] });
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
      const { error } = await supabase
        .from('boulders')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boulders'] });
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
      queryClient.invalidateQueries({ queryKey: ['boulders'] });
      toast.success('Status aktualisiert');
    },
    onError: (error) => toast.error('Status-Update fehlgeschlagen: ' + error.message)
  });
};
