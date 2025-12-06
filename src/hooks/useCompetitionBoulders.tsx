import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CompetitionBoulder {
  id: string;
  boulder_number: number;
  boulder_id: string | null;
  color: string;
  created_at: string;
  boulder?: {
    id: string;
    name: string;
    thumbnail_url?: string;
    color: string;
    difficulty: number | null;
  };
}

export const useCompetitionBoulders = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['competition_boulders'],
    enabled: enabled,
    queryFn: async () => {
      const startTime = Date.now();
      
      try {
        // Create the query
        const queryPromise = supabase
          .from('competition_boulders')
          .select(`
            *,
            boulder:boulders(id, name, thumbnail_url, color, difficulty)
          `)
          .order('boulder_number', { ascending: true });

        // Set up timeout
        let timeoutId: NodeJS.Timeout | null = null;
        let isResolved = false;

        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            if (!isResolved) {
              console.error('[useCompetitionBoulders] ⏱️ TIMEOUT after 10s - request never completed');
              reject(new Error('Supabase request timeout after 10s'));
            }
          }, 10000);
        });

        // Race between query and timeout
        const result = await Promise.race([
          queryPromise.then((result) => {
            isResolved = true;
            if (timeoutId) clearTimeout(timeoutId);
            return result;
          }).catch((err) => {
            isResolved = true;
            if (timeoutId) clearTimeout(timeoutId);
            throw err;
          }),
          timeoutPromise
        ]);

        const duration = Date.now() - startTime;
        const { data, error } = result;

        if (error) {
          console.error(`[useCompetitionBoulders] ❌ Error after ${duration}ms:`, error);
          throw error;
        }

        console.log(`[useCompetitionBoulders] ✅ Fetched ${data?.length || 0} competition boulders after ${duration}ms`);
        return data as CompetitionBoulder[];
      } catch (error: any) {
        const duration = Date.now() - startTime;
        console.error(`[useCompetitionBoulders] ❌ Exception after ${duration}ms:`, error);
        throw error;
      }
    },
    retry: 1,
    retryDelay: 1000,
    staleTime: 0,
  });
};

export const useCreateCompetitionBoulder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      boulder_number: number;
      boulder_id: string | null;
      color: string;
    }) => {
      const { data, error } = await supabase
        .from('competition_boulders')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competition_boulders'] });
      toast.success('Wettkampf-Boulder hinzugefügt');
    },
    onError: (error) => {
      toast.error('Fehler beim Hinzufügen: ' + error.message);
    },
  });
};

export const useUpdateCompetitionBoulder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<CompetitionBoulder>;
    }) => {
      const { data, error } = await supabase
        .from('competition_boulders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competition_boulders'] });
      toast.success('Wettkampf-Boulder aktualisiert');
    },
    onError: (error) => {
      toast.error('Fehler beim Aktualisieren: ' + error.message);
    },
  });
};

export const useDeleteCompetitionBoulder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('competition_boulders')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competition_boulders'] });
      toast.success('Wettkampf-Boulder gelöscht');
    },
    onError: (error) => {
      toast.error('Fehler beim Löschen: ' + error.message);
    },
  });
};

