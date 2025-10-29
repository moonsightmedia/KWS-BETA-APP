import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Boulder {
  id: string;
  name: string;
  sector_id: string;
  difficulty: number;
  color: string;
  beta_video_url: string | null;
  note: string | null;
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

export const useUpdateBoulder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Boulder> & { id: string }) => {
      const { data, error } = await supabase
        .from('boulders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
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
      const { data, error } = await supabase
        .from('boulders')
        .insert(newBoulder)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boulders'] });
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
