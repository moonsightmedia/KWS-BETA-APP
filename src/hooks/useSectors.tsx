import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Sector {
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

export const useSectors = () => {
  return useQuery({
    queryKey: ['sectors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sectors')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as Sector[];
    },
  });
};

export const useUpdateSector = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Sector> & { id: string }) => {
      const { data, error } = await supabase
        .from('sectors')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sectors'] });
      toast.success('Sektor erfolgreich aktualisiert!');
    },
    onError: (error) => {
      toast.error('Fehler beim Aktualisieren: ' + error.message);
    },
  });
};

export const useCreateSector = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newSector: Omit<Sector, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('sectors')
        .insert(newSector)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sectors'] });
      toast.success('Sektor erfolgreich erstellt!');
    },
    onError: (error) => {
      toast.error('Fehler beim Erstellen: ' + error.message);
    },
  });
};

export const useDeleteSector = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sectors')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sectors'] });
      toast.success('Sektor erfolgreich gelöscht!');
    },
    onError: (error) => {
      toast.error('Fehler beim Löschen: ' + error.message);
    },
  });
};
