import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { transformBoulder } from '@/lib/dataTransformers';
import { Boulder as FrontendBoulder } from '@/types/boulder';
import { useSectors } from './useSectors';
import { deleteBetaVideo, deleteThumbnail } from '@/integrations/supabase/storage';

// Helper function to log boulder operations
async function logBoulderOperation(
  operationType: 'create' | 'update' | 'delete',
  boulderId: string | null,
  boulderName: string | null,
  boulderData?: any,
  changes?: Record<string, any>
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Get profile id from user id
    let profileId: string | null = null;
    if (user?.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
      profileId = profile?.id || null;
    }
    
    await supabase
      .from('boulder_operation_logs')
      .insert({
        boulder_id: boulderId,
        operation_type: operationType,
        user_id: profileId,
        boulder_name: boulderName,
        boulder_data: boulderData || null,
        changes: changes || null,
      });
  } catch (error) {
    console.error('[logBoulderOperation] Error logging operation:', error);
    // Don't throw - logging failures shouldn't break the operation
  }
}

export interface Boulder {
  id: string;
  name: string;
  sector_id: string;
  sector_id_2?: string | null;
  difficulty: number;
  color: string;
  beta_video_url: string | null;
  thumbnail_url: string | null;
  note: string | null;
  status?: 'haengt' | 'abgeschraubt';
  created_at: string;
  updated_at: string;
}

export const useBoulders = (enabled: boolean = true) => {
  // CRITICAL: Log enabled state
  console.log('[useBoulders] Hook called with enabled:', enabled);
  
  return useQuery({
    queryKey: ['boulders'],
    enabled: enabled, // Only run query if enabled (e.g., after auth loading is complete)
    queryFn: async () => {
      console.log('[useBoulders] 🔵 STARTING fetch from Supabase... (enabled:', enabled, ')');
      
      // CRITICAL: Ensure Supabase client is fully initialized before making requests
      // This prevents race conditions where queries start before the client is ready after reload
      try {
        const { ensureSupabaseReady } = await import('@/integrations/supabase/client');
        await ensureSupabaseReady();
        console.log('[useBoulders] ✅ Supabase client ready');
      } catch (error) {
        console.error('[useBoulders] ⚠️ Error ensuring Supabase ready:', error);
        // Continue anyway - client might still work
      }
      
      const startTime = Date.now();
      
      console.log('[useBoulders] 🔵 Creating Supabase query...');
      console.log('[useBoulders] 🔵 Supabase client:', typeof supabase, 'has from:', typeof supabase.from);
      
      // CRITICAL: Get fresh Supabase client instance (especially important after reload)
      const { getSupabase, recreateSupabaseClient } = await import('@/integrations/supabase/client');
      
      // CRITICAL: On reload, recreate the client to ensure it's fresh
      const isReload = typeof window !== 'undefined' &&
                       (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.type === 'reload';
      
      if (isReload) {
        console.log('[useBoulders] 🔄 Reload detected - recreating Supabase client...');
        recreateSupabaseClient();
      }
      
      const currentSupabase = getSupabase();
      
      console.log('[useBoulders] 🔵 Using Supabase client:', typeof currentSupabase, 'has from:', typeof currentSupabase.from);
      
      // CRITICAL: Execute query directly - simplest possible approach
      // No QueryBuilder wrapper, no Promise.resolve, just direct execution
      let timeoutId: NodeJS.Timeout | null = null;
      let isResolved = false;
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          if (!isResolved) {
            console.error('[useBoulders] ⏱️ TIMEOUT after 10s - request never completed');
            reject(new Error('Supabase request timeout after 10s'));
          }
        }, 10000);
      });
      
      try {
        console.log('[useBoulders] 🔵 Executing query directly...');
        
        // CRITICAL: Execute query directly without any wrappers
        // This is the simplest possible approach - just await the query
        const result = await Promise.race([
          currentSupabase
            .from('boulders')
            .select('*')
            .order('created_at', { ascending: false }),
          timeoutPromise
        ]);
        
        console.log('[useBoulders] 🔵 Query resolved:', result);
        isResolved = true;
        if (timeoutId) clearTimeout(timeoutId);
        
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;
        console.log(`[useBoulders] ✅ QueryBuilder resolved after ${duration}ms:`, result);
        
        const { data, error } = result;

        if (error) {
          console.error('[useBoulders] ❌ Error fetching boulders:', error);
          // CRITICAL: Throw error instead of returning empty array to mark query as error
          throw error;
        }
        
        console.log('[useBoulders] ✅ Fetched boulders:', data?.length || 0, 'boulders');
        if (data && data.length > 0) {
          console.log('[useBoulders] Sample boulder:', data[0]);
        }
        
        return data as Boulder[];
      } catch (error: any) {
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;
        
        // Check if it's a timeout/abort error
        if (error?.name === 'AbortError' || error?.message?.includes('timeout')) {
          console.error(`[useBoulders] ⏱️ TIMEOUT after ${duration}ms:`, error);
          throw new Error('Supabase request timeout after 10s');
        }
        
        // Check for rate limiting errors
        if (error?.message?.includes('rate limit') || 
            error?.message?.includes('429') || 
            error?.message?.includes('Too many requests')) {
          console.error(`[useBoulders] ⚠️ RATE LIMIT after ${duration}ms:`, error);
          throw new Error('Rate limit erreicht. Bitte warte einen Moment und versuche es erneut.');
        }
        
        console.error(`[useBoulders] ❌ Exception in queryFn after ${duration}ms:`, error);
        // CRITICAL: Throw error to mark query as error state, not return empty array
        // This ensures React Query shows error state instead of hanging in loading state
        throw error;
      }
    },
    retry: 1, // Only retry once
    retryDelay: 1000, // Wait 1 second before retry
    // CRITICAL: Set staleTime to 0 to ensure data is always refetched after reload
    staleTime: 0,
    // Use default query options from QueryClient (refetchOnMount: true)
  });
};

/**
 * Hook der Boulders mit Sektor-Informationen zurückgibt (transformiert zu Frontend Types)
 */
export const useBouldersWithSectors = (enabled: boolean = true) => {
  const { data: boulders, isLoading: isLoadingBoulders, error: bouldersError } = useBoulders(enabled);
  const { data: sectors, isLoading: isLoadingSectors, error: sectorsError } = useSectors(enabled);

  // Only log in development to reduce console noise
  if (import.meta.env.DEV) {
    console.log('[useBouldersWithSectors] Raw boulders:', boulders?.length || 0, 'sectors:', sectors?.length || 0, 'isLoadingBoulders:', isLoadingBoulders, 'isLoadingSectors:', isLoadingSectors);
    if (bouldersError) {
      console.error('[useBouldersWithSectors] Boulders error:', bouldersError);
    }
    if (sectorsError) {
      console.error('[useBouldersWithSectors] Sectors error:', sectorsError);
    }
  }
  
  // If there's an error, don't wait forever - use empty arrays
  const effectiveBoulders = bouldersError ? [] : (boulders || []);
  const effectiveSectors = sectorsError ? [] : (sectors || []);

  // Only transform if we have both boulders and sectors (or at least boulders)
  // If we have errors, return empty array instead of undefined to prevent infinite loading
  const transformedBoulders: FrontendBoulder[] | undefined = effectiveBoulders && effectiveBoulders.length > 0
    ? effectiveBoulders.map(b => {
        try {
          return transformBoulder(b, effectiveSectors);
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
    : (bouldersError || sectorsError ? [] : undefined); // Return empty array on error, undefined if still loading

  // Only log in development to reduce console noise
  if (import.meta.env.DEV) {
    console.log('[useBouldersWithSectors] Transformed boulders:', transformedBoulders?.length || 0);
    if (transformedBoulders && transformedBoulders.length > 0) {
      console.log('[useBouldersWithSectors] Sample transformed boulder:', transformedBoulders[0]);
    }
  }

  // If there are errors, don't show loading state forever
  const hasError = bouldersError || sectorsError;
  const isLoading = hasError ? false : (isLoadingBoulders || isLoadingSectors);
  
  return {
    data: transformedBoulders,
    isLoading: isLoading,
    error: bouldersError || sectorsError,
    rawBoulders: effectiveBoulders,
    rawSectors: effectiveSectors,
  };
};

export const useUpdateBoulder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Boulder> & { id: string }) => {
      console.log('[useUpdateBoulder] Starting mutation for boulder:', id);
      
      // Helper function to add timeout to Supabase queries
      const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> => {
        return Promise.race([
          promise,
          new Promise<T>((_, reject) => {
            setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
          })
        ]);
      };
      
      // Get old data for logging (with timeout)
      console.log('[useUpdateBoulder] Fetching old data...');
      let oldData = null;
      try {
        const oldDataPromise = supabase
          .from('boulders')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        
        const { data: fetchedOldData, error: oldDataError } = await withTimeout(
          oldDataPromise,
          10000, // 10 second timeout
          'Timeout beim Abrufen der alten Daten'
        );
        
        if (oldDataError) {
          console.error('[useUpdateBoulder] Error fetching old data:', oldDataError);
          throw oldDataError;
        }
        oldData = fetchedOldData;
        console.log('[useUpdateBoulder] Old data fetched');
      } catch (error: any) {
        console.warn('[useUpdateBoulder] Could not fetch old data (non-critical):', error);
        // Continue without old data - logging is not critical
      }

      // Update boulder (with timeout)
      console.log('[useUpdateBoulder] Updating boulder with data:', updates);
      const updatePromise = supabase
        .from('boulders')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();
      
      const { data, error } = await withTimeout(
        updatePromise,
        15000, // 15 second timeout
        'Timeout beim Aktualisieren des Boulders'
      );

      if (error) {
        console.error('[useUpdateBoulder] Supabase update error:', error);
        throw error;
      }
      if (!data) {
        console.error('[useUpdateBoulder] No data returned from update');
        throw new Error('Boulder konnte nicht aktualisiert werden. Möglicherweise fehlen die Berechtigungen.');
      }
      console.log('[useUpdateBoulder] Boulder updated successfully');

      // Calculate changes
      const changes: Record<string, any> = {};
      Object.keys(updates).forEach(key => {
        if (oldData && oldData[key] !== updates[key as keyof typeof updates]) {
          changes[key] = {
            old: oldData[key],
            new: updates[key as keyof typeof updates],
          };
        }
      });

      // Log the operation
      console.log('[useUpdateBoulder] Logging operation...');
      try {
        await logBoulderOperation('update', id, data.name, data, changes);
        console.log('[useUpdateBoulder] Operation logged successfully');
      } catch (logError) {
        console.warn('[useUpdateBoulder] Error logging operation (non-critical):', logError);
        // Don't throw - logging is not critical
      }

      console.log('[useUpdateBoulder] Mutation completed successfully');
      return { data, updates };
    },
    onSuccess: (result) => {
      // Always invalidate and refetch boulders immediately
      queryClient.invalidateQueries({ queryKey: ['boulders'] });
      queryClient.refetchQueries({ queryKey: ['boulders'] });
      
      // If sector_id was changed, also invalidate sectors (affects boulder_count)
      if (result.updates.sector_id !== undefined) {
        queryClient.invalidateQueries({ queryKey: ['sectors'] });
        queryClient.refetchQueries({ queryKey: ['sectors'] });
      }
      
      // If status was changed, also invalidate sectors (affects boulder_count)
      if (result.updates.status !== undefined) {
        queryClient.invalidateQueries({ queryKey: ['sectors'] });
        queryClient.refetchQueries({ queryKey: ['sectors'] });
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

      // Log the operation
      await logBoulderOperation('create', data.id, data.name, data);

      return data;
    },
    onSuccess: () => {
      // Invalidate and immediately refetch to show new boulder
      queryClient.invalidateQueries({ queryKey: ['boulders'] });
      queryClient.refetchQueries({ queryKey: ['boulders'] });
      queryClient.invalidateQueries({ queryKey: ['sectors'] });
      queryClient.refetchQueries({ queryKey: ['sectors'] });
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
      
      // First, get the boulder to check if it has a beta video or thumbnail
      const { data: boulder, error: fetchError } = await supabase
        .from('boulders')
        .select('beta_video_url, thumbnail_url, name')
        .eq('id', id)
        .maybeSingle();

      if (fetchError) {
        console.error('[useDeleteBoulder] Error fetching boulder:', fetchError);
        throw fetchError;
      }

      if (!boulder || 'error' in boulder) {
        console.warn('[useDeleteBoulder] Boulder not found:', id);
        throw new Error('Boulder nicht gefunden');
      }

      // Type guard: ensure boulder has the expected structure
      const boulderData = boulder as unknown as { name: string; beta_video_url: string | null; thumbnail_url: string | null };
      console.log('[useDeleteBoulder] Boulder found:', boulderData.name, 'Video URL:', boulderData.beta_video_url, 'Thumbnail URL:', boulderData.thumbnail_url);

      // Get full boulder data for logging
      const { data: fullBoulderData } = await supabase
        .from('boulders')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      // Delete the beta video if it exists
      if (boulderData.beta_video_url) {
        console.log('[useDeleteBoulder] Deleting beta video:', boulderData.beta_video_url);
        try {
          await deleteBetaVideo(boulderData.beta_video_url);
          console.log('[useDeleteBoulder] Beta video deleted successfully');
        } catch (error) {
          console.error('[useDeleteBoulder] Error deleting beta video (continuing anyway):', error);
          // Continue with boulder deletion even if video deletion fails
        }
      }

      // Delete the thumbnail if it exists
      if (boulderData.thumbnail_url) {
        console.log('[useDeleteBoulder] Deleting thumbnail:', boulderData.thumbnail_url);
        try {
          await deleteThumbnail(boulderData.thumbnail_url);
          console.log('[useDeleteBoulder] Thumbnail deleted successfully');
        } catch (error) {
          console.error('[useDeleteBoulder] Error deleting thumbnail (continuing anyway):', error);
          // Continue with boulder deletion even if thumbnail deletion fails
        }
      }

      // Delete upload_logs entries for this boulder first (to avoid foreign key constraint violation)
      console.log('[useDeleteBoulder] Deleting upload_logs for boulder:', id);
      const { error: uploadLogsError } = await supabase
        .from('upload_logs')
        .delete()
        .eq('boulder_id', id);

      if (uploadLogsError) {
        console.error('[useDeleteBoulder] Error deleting upload_logs (continuing anyway):', uploadLogsError);
        // Continue with boulder deletion even if upload_logs deletion fails
      } else {
        console.log('[useDeleteBoulder] Upload logs deleted successfully');
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

      // Log the operation (before checking if deletion was successful)
      if (fullBoulderData) {
        await logBoulderOperation('delete', id, fullBoulderData.name, fullBoulderData);
      }
      
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
      // Invalidate and refetch both boulders and sectors (status changes affect sector boulder_count)
      queryClient.invalidateQueries({ queryKey: ['boulders'] });
      queryClient.refetchQueries({ queryKey: ['boulders'] });
      queryClient.invalidateQueries({ queryKey: ['sectors'] });
      queryClient.refetchQueries({ queryKey: ['sectors'] });
      toast.success('Status aktualisiert');
    },
    onError: (error) => toast.error('Status-Update fehlgeschlagen: ' + error.message)
  });
};

/**
 * Delete all boulders from the database (but keep videos in storage)
 */
export const useDeleteAllBoulders = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      // Delete all boulders (videos remain in storage/CDN)
      const { error } = await supabase
        .from('boulders')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using a condition that's always true)
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boulders'] });
      queryClient.invalidateQueries({ queryKey: ['sectors'] });
      queryClient.refetchQueries({ queryKey: ['boulders'] });
      queryClient.refetchQueries({ queryKey: ['sectors'] });
      toast.success('Alle Boulder erfolgreich gelöscht! Videos bleiben im CDN erhalten.');
    },
    onError: (error) => {
      toast.error('Fehler beim Löschen aller Boulder: ' + error.message);
    },
  });
};

/**
 * Hook to get all unique CDN video URLs from the CDN directory (not just from database)
 */
export const useCdnVideos = () => {
  return useQuery({
    queryKey: ['cdn-videos'],
    queryFn: async () => {
      // Get All-Inkl API URL from environment
      const allinklApiUrl = import.meta.env.VITE_ALLINKL_API_URL || 'https://cdn.kletterwelt-sauerland.de/upload-api';
      
      try {
        // Fetch all videos directly from CDN directory
        const response = await fetch(`${allinklApiUrl}/list-videos.php`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch videos: ${response.status} ${response.statusText}`);
        }

        const videoUrls = await response.json();
        
        if (!Array.isArray(videoUrls)) {
          console.error('[useCdnVideos] Invalid response format:', videoUrls);
          return [];
        }

        console.log('[useCdnVideos] Found', videoUrls.length, 'videos in CDN');
        return videoUrls;
      } catch (error) {
        console.error('[useCdnVideos] Error fetching videos from CDN:', error);
        // Fallback: try to get videos from database
        try {
          const { data, error: dbError } = await supabase
            .from('boulders')
            .select('beta_video_url')
            .not('beta_video_url', 'is', null)
            .like('beta_video_url', '%cdn.kletterwelt-sauerland.de%');

          if (dbError) {
            console.error('[useCdnVideos] Error fetching from database:', dbError);
            return [];
          }

          const videoUrls = new Set<string>();
          data?.forEach(b => {
            if (b.beta_video_url && typeof b.beta_video_url === 'string') {
              videoUrls.add(b.beta_video_url);
            }
          });

          const uniqueUrls = Array.from(videoUrls);
          console.log('[useCdnVideos] Fallback: Found', uniqueUrls.length, 'videos from database');
          return uniqueUrls;
        } catch (fallbackError) {
          console.error('[useCdnVideos] Fallback also failed:', fallbackError);
          return [];
        }
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
};
