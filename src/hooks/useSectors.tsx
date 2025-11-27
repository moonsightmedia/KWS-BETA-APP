import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { transformSector } from '@/lib/dataTransformers';
import { Sector as FrontendSector } from '@/types/boulder';

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
      console.log('[useSectors] Fetching sectors from Supabase...');
      try {
        const { data, error } = await supabase
          .from('sectors')
          .select('*')
          .order('name');

        if (error) {
          console.error('[useSectors] Error fetching sectors:', error);
          // Provide more user-friendly error messages
          let errorMessage = error.message || 'Fehler beim Laden der Sektoren';
          
          // Check for specific error types
          if (error.code === 'PGRST116' || error.message?.includes('permission') || error.message?.includes('denied')) {
            errorMessage = 'Keine Berechtigung zum Laden der Sektoren. Bitte melde dich an.';
          } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
            errorMessage = 'Netzwerkfehler. Bitte überprüfe deine Internetverbindung.';
          } else if (error.message?.includes('timeout')) {
            errorMessage = 'Zeitüberschreitung beim Laden. Bitte versuche es erneut.';
          }
          
          const enhancedError = new Error(errorMessage);
          (enhancedError as any).originalError = error;
          throw enhancedError;
        }
        
        if (!data) {
          throw new Error('Keine Daten zurückgegeben');
        }
        
        console.log('[useSectors] Fetched sectors:', data.length, 'sectors');
        return data as Sector[];
      } catch (error) {
        // Re-throw with better message if it's not already an Error
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('Unbekannter Fehler beim Laden der Sektoren');
      }
    },
    retry: 1, // Only retry once to prevent infinite loading
    retryDelay: 1000, // Wait 1 second between retries
    // Use default query options from QueryClient (staleTime: 30s, refetchOnMount: false)
  });
};

/**
 * Hook der Sektoren transformiert zu Frontend Types zurückgibt
 */
export const useSectorsTransformed = () => {
  const { data: sectors, isLoading, error } = useSectors();

  const transformedSectors: FrontendSector[] | undefined = sectors
    ? sectors.map(s => transformSector(s))
    : undefined;

  return {
    data: transformedSectors,
    isLoading,
    error,
    rawSectors: sectors,
  };
};

export const useUpdateSector = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Sector> & { id: string }) => {
      // Only allow updating specific fields (exclude computed/read-only fields)
      const allowedFields = ['name', 'description', 'image_url'];
      const cleanUpdates: any = {};
      
      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
          const value = (updates as any)[key];
          // Convert empty strings to null
          cleanUpdates[key] = value === '' ? null : value;
        }
      });

      // First, check if the sector exists
      const { data: existing, error: checkError } = await supabase
        .from('sectors')
        .select('id')
        .eq('id', id)
        .single();

      if (checkError || !existing) {
        throw new Error(`Sektor mit ID ${id} nicht gefunden`);
      }

      const { data, error } = await supabase
        .from('sectors')
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Update sector error:', error, { id, updates: cleanUpdates });
        throw error;
      }

      if (!data) {
        throw new Error('Update erfolgreich, aber keine Daten zurückgegeben');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sectors'] });
      queryClient.refetchQueries({ queryKey: ['sectors'] });
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
    mutationFn: async (newSector: Omit<Sector, 'id' | 'created_at' | 'updated_at' | 'boulder_count' | 'last_schraubtermin' | 'next_schraubtermin'>) => {
      // Only allow specific fields for creation
      const cleanSector: any = {
        name: newSector.name?.trim(),
        description: newSector.description?.trim() || null,
        image_url: newSector.image_url || null,
      };

      // Convert empty strings to null
      Object.keys(cleanSector).forEach(key => {
        if (cleanSector[key] === '') {
          cleanSector[key] = null;
        }
      });

      const { data, error } = await supabase
        .from('sectors')
        .insert(cleanSector)
        .select()
        .single();

      if (error) {
        console.error('Create sector error:', error, { cleanSector });
        throw error;
      }

      if (!data) {
        throw new Error('Sektor erstellt, aber keine Daten zurückgegeben');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sectors'] });
      queryClient.refetchQueries({ queryKey: ['sectors'] });
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
      queryClient.refetchQueries({ queryKey: ['sectors'] });
      toast.success('Sektor erfolgreich gelöscht!');
    },
    onError: (error) => {
      toast.error('Fehler beim Löschen: ' + error.message);
    },
  });
};
