import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['colors'] }),
  });
}

export function useUpdateColor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<ColorRow> & { id: string }) => {
      const { id, ...rest } = payload;
      const { error } = await supabase.from('colors').update(rest).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['colors'] }),
  });
}

export function useDeleteColor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('colors').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['colors'] }),
  });
}


