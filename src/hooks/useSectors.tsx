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
      
      // CRITICAL: Ensure Supabase client is fully initialized before making requests
      // This prevents race conditions where queries start before the client is ready after reload
      try {
        const { ensureSupabaseReady } = await import('@/integrations/supabase/client');
        await ensureSupabaseReady();
        console.log('[useSectors] ✅ Supabase client ready');
      } catch (error) {
        console.error('[useSectors] ⚠️ Error ensuring Supabase ready:', error);
        // Continue anyway - client might still work
      }
      
      const startTime = Date.now();
      
      console.log('[useSectors] 🔵 Creating Supabase query...');
      console.log('[useSectors] 🔵 Supabase client:', typeof supabase, 'has from:', typeof supabase.from);
      
      // CRITICAL: Get fresh Supabase client instance (especially important after reload)
      const { getSupabase, recreateSupabaseClient } = await import('@/integrations/supabase/client');
      
      // CRITICAL: On reload, recreate the client to ensure it's fresh
      const isReload = typeof window !== 'undefined' &&
                       (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.type === 'reload';
      
      if (isReload) {
        console.log('[useSectors] 🔄 Reload detected - recreating Supabase client...');
        recreateSupabaseClient();
      }
      
      const currentSupabase = getSupabase();
      
      console.log('[useSectors] 🔵 Using Supabase client:', typeof currentSupabase, 'has from:', typeof currentSupabase.from);
      
      // CRITICAL: Execute query directly - simplest possible approach
      // No QueryBuilder wrapper, no Promise.resolve, just direct execution
      let timeoutId: NodeJS.Timeout | null = null;
      let isResolved = false;
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          if (!isResolved) {
            console.error('[useSectors] ⏱️ TIMEOUT after 10s - request never completed');
            reject(new Error('Supabase request timeout after 10s'));
          }
        }, 10000);
      });
      
      try {
        console.log('[useSectors] 🔵 Executing query directly...');
        
        // CRITICAL: Execute query directly without any wrappers
        // This is the simplest possible approach - just await the query
        const result = await Promise.race([
          currentSupabase
            .from('sectors')
            .select('*')
            .order('name'),
          timeoutPromise
        ]);
        
        console.log('[useSectors] 🔵 Query resolved:', result);
        isResolved = true;
        if (timeoutId) clearTimeout(timeoutId);
        
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;
        console.log(`[useSectors] ✅ QueryBuilder resolved after ${duration}ms:`, result);
        
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
          } else if (error.message?.includes('timeout') || error.name === 'AbortError') {
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
      } catch (error: any) {
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;
        
        // Check if it's a timeout/abort error
        if (error?.name === 'AbortError' || error?.message?.includes('timeout')) {
          console.error(`[useSectors] ⏱️ TIMEOUT after ${duration}ms:`, error);
          throw new Error('Supabase request timeout after 10s');
        }
        
        // Check for rate limiting errors
        if (error?.message?.includes('rate limit') || 
            error?.message?.includes('429') || 
            error?.message?.includes('Too many requests')) {
          console.error(`[useSectors] ⚠️ RATE LIMIT after ${duration}ms:`, error);
          throw new Error('Rate limit erreicht. Bitte warte einen Moment und versuche es erneut.');
        }
        
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
export const useSectorsTransformed = (enabled: boolean = true) => {
  const { data: sectors, isLoading, error } = useSectors(enabled);

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
