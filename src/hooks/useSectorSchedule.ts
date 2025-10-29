import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SectorSchedule {
  id: string;
  sector_id: string;
  scheduled_at: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export const useSectorSchedule = () => {
  return useQuery({
    queryKey: ['sector_schedule'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sector_schedule')
        .select('*')
        .order('scheduled_at', { ascending: true });
      if (error) throw error;
      return data as SectorSchedule[];
    }
  });
};

export const useCreateSectorSchedule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<SectorSchedule, 'id' | 'created_at' | 'created_by'>) => {
      const { data, error } = await supabase
        .from('sector_schedule')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as SectorSchedule;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sector_schedule'] });
    }
  });
};

export const useDeleteSectorSchedule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sector_schedule')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sector_schedule'] });
    }
  });
};


