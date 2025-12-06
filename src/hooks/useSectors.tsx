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

export const useSectors = (enabled: boolean = true) => {
  // CRITICAL: Log enabled state
  console.log('[useSectors] Hook called with enabled:', enabled);
  
  return useQuery({
    queryKey: ['sectors'],
    enabled: enabled, // Only run query if enabled (e.g., after auth loading is complete)
    queryFn: async () => {
      console.log('[useSectors] 🔵 STARTING fetch from Supabase... (enabled:', enabled, ')');
      const startTime = Date.now();
      
      try {
        console.log('[useSectors] 🔵 Creating Supabase query...');
        console.log('[useSectors] 🔵 Supabase client:', typeof supabase, 'has from:', typeof supabase.from);
        
        // CRITICAL: Supabase returns a QueryBuilder, not a Promise directly
        // We need to call it to get the actual Promise
        const queryBuilder = supabase
          .from('sectors')
          .select('*')
          .order('name');
        
        console.log('[useSectors] 🔵 QueryBuilder created, type:', typeof queryBuilder, 'is Promise:', queryBuilder instanceof Promise);
        
        // CRITICAL: Convert QueryBuilder to Promise by calling it
        // In Supabase, the QueryBuilder is a thenable, so we can use Promise.resolve() or just await it
        const fetchPromise = Promise.resolve(queryBuilder).then((qb: any) => {
          console.log('[useSectors] 🔵 QueryBuilder converted to Promise, executing query...');
          // The QueryBuilder should be a thenable, so we can await it directly
          return qb;
        });
        
        console.log('[useSectors] 🔵 FetchPromise created, type:', typeof fetchPromise, 'is Promise:', fetchPromise instanceof Promise);
        
        // CRITICAL: Wrap the promise to see if it's ever resolved/rejected
        const wrappedPromise = fetchPromise.then(
          (result) => {
            console.log('[useSectors] ✅ FetchPromise RESOLVED:', result);
            return result;
          },
          (error) => {
            console.error('[useSectors] ❌ FetchPromise REJECTED:', error);
            throw error;
          }
        );
        
        console.log('[useSectors] 🔵 Supabase query created, setting up timeout...');
        let timeoutId: NodeJS.Timeout | null = null;
        let isResolved = false;
        
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            if (!isResolved) {
              console.error('[useSectors] ⏱️ TIMEOUT after 10s - request never completed');
              reject(new Error('Supabase request timeout after 10s'));
            }
          }, 10000);
        });
        
        console.log('[useSectors] 🔵 Starting Promise.race (fetch vs timeout)...');
        const result = await Promise.race([
          wrappedPromise.then((result) => {
            isResolved = true;
            if (timeoutId) clearTimeout(timeoutId);
            console.log('[useSectors] ✅ Fetch promise resolved');
            return result;
          }).catch((err) => {
            isResolved = true;
            if (timeoutId) clearTimeout(timeoutId);
            console.error('[useSectors] ❌ Fetch promise rejected:', err);
            throw err;
          }),
          timeoutPromise
        ]) as any;
        
        const duration = Date.now() - startTime;
        console.log(`[useSectors] 🔵 Promise.race completed after ${duration}ms`);
        
        const { data, error } = result;

        if (error) {
          console.error('[useSectors] ❌ Error fetching sectors:', error);
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
          // CRITICAL: Throw error to mark query as error state
          throw enhancedError;
        }
        
        if (!data) {
          throw new Error('Keine Daten zurückgegeben');
        }
        
        console.log('[useSectors] ✅ Fetched sectors:', data.length, 'sectors');
        return data as Sector[];
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[useSectors] ❌ Exception after ${duration}ms:`, error);
        // CRITICAL: Re-throw error to mark query as error state, not return empty array
        // This ensures React Query shows error state instead of hanging in loading state
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('Unbekannter Fehler beim Laden der Sektoren');
      }
    },
    retry: 1, // Only retry once to prevent infinite loading
    retryDelay: 1000, // Wait 1 second between retries
    // CRITICAL: Set staleTime to 0 to ensure data is always refetched after reload
    staleTime: 0,
    // Use default query options from QueryClient (refetchOnMount: true)
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
