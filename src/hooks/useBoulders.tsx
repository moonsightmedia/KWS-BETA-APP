import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

// Get Supabase API key from environment
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
import { transformBoulder } from '@/lib/dataTransformers';
import { Boulder as FrontendBoulder } from '@/types/boulder';
import { useSectors } from './useSectors';
import { deleteBetaVideo, deleteThumbnail } from '@/integrations/supabase/storage';

/** Trim boulder data for log payload to avoid huge JSON and timeouts. Never throws. */
function trimBoulderDataForLog(data: any): any {
  try {
    if (!data || typeof data !== 'object') return null;
    return {
      id: data.id,
      name: data.name,
      sector_id: data.sector_id,
      sector_id_2: data.sector_id_2,
      difficulty: data.difficulty,
      color: data.color,
      status: data.status,
      note: data.note ?? null,
      created_at: data.created_at,
      updated_at: data.updated_at,
      beta_video_url: data.beta_video_url ? '(present)' : null,
      thumbnail_url: data.thumbnail_url ? '(present)' : null,
    };
  } catch {
    return null;
  }
}

/** Safe JSON for log: avoid circular refs / non-serializable. Returns null on failure. */
function safeStringifyLogPayload(payload: Record<string, unknown>): string | null {
  try {
    return JSON.stringify(payload);
  } catch {
    try {
      return JSON.stringify({
        boulder_id: payload.boulder_id,
        operation_type: payload.operation_type,
        user_id: null,
        boulder_name: payload.boulder_name,
        boulder_data: null,
        changes: null,
      });
    } catch {
      return null;
    }
  }
}

/**
 * Logs a boulder operation. Never rejects – always resolves with true/false.
 * Fire-and-forget: caller .catch() will not run for this function.
 * Exported so BatchUpload (and other direct REST create paths) can log creates.
 */
export async function logBoulderOperation(
  operationType: 'create' | 'update' | 'delete',
  boulderId: string | null,
  boulderName: string | null,
  boulderData?: any,
  changes?: Record<string, any>,
  accessToken: string | null | undefined
): Promise<boolean> {
  try {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!SUPABASE_URL || !key || !accessToken) {
      console.warn('[logBoulderOperation] Missing URL, key or token – skip logging');
      toast.warning('Log konnte nicht geschrieben werden (kein Zugriffstoken).');
      return false;
    }
    const trimmedData = trimBoulderDataForLog(boulderData);
    const payload: Record<string, unknown> = {
      boulder_id: boulderId,
      operation_type: operationType,
      user_id: null,
      boulder_name: boulderName ?? null,
      boulder_data: trimmedData,
      changes: changes ?? null,
    };
    const body = safeStringifyLogPayload(payload);
    if (body === null) {
      console.warn('[logBoulderOperation] Payload serialization failed – skip');
      return false;
    }
    const res = await fetch(`${SUPABASE_URL}/rest/v1/boulder_operation_logs`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body,
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('[logBoulderOperation] Insert failed:', res.status, text);
      toast.error(`Log-Eintrag konnte nicht gespeichert werden (${res.status}). Siehe Konsole.`);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[logBoulderOperation] Error logging operation:', error);
    toast.error('Log-Eintrag konnte nicht gespeichert werden. Siehe Konsole.');
    return false;
  }
}

export interface VideoQualities {
  hd?: string;
  sd?: string;
  low?: string;
}

export interface Boulder {
  id: string;
  name: string;
  sector_id: string;
  sector_id_2?: string | null;
  difficulty: number;
  color: string;
  beta_video_url: string | null;
  beta_video_urls: VideoQualities | null;
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
      console.log('[useBoulders] 🔍 Query function called - this means enabled=true and React Query is executing the query');
      
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
      const { getSupabase } = await import('@/integrations/supabase/client');
      
      // CRITICAL: Don't recreate the client on every query - only get the existing instance
      // Recreating causes "Multiple GoTrueClient instances" warnings
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
        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'unknown';
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
        
        console.log('[useBoulders] 🔵 Executing query directly...');
        console.log('[useBoulders] 🔍 Hostname:', hostname, 'isLocalhost:', isLocalhost);
        console.log('[useBoulders] 🔍 Current Supabase client:', currentSupabase);
        console.log('[useBoulders] 🔍 Client has from:', typeof currentSupabase.from);
        console.log('[useBoulders] 🔍 Supabase URL:', currentSupabase.supabaseUrl);
        
        // CRITICAL: Since direct fetch() works, but QueryBuilder doesn't, 
        // let's try using the REST client directly instead of QueryBuilder
        console.log('[useBoulders] 🔍 Direct fetch works, but QueryBuilder doesn\'t - trying REST client directly...');
        
        // CRITICAL: Always use REST client fetch directly for localhost
        // QueryBuilder doesn't work reliably on localhost, so we bypass it
        // @ts-ignore - accessing internal property
        const restClient = currentSupabase.rest;
        const restFetch = restClient?.fetch;
        
        // Always use REST client if available (which it should be)
        if (restFetch) {
          console.log('[useBoulders] 🔵 Using REST client fetch directly...');
          
          // Build the query URL manually
          const queryUrl = `${currentSupabase.supabaseUrl}/rest/v1/boulders?select=*&order=created_at.desc`;
          console.log('[useBoulders] 🔵 Query URL:', queryUrl);
          
          // Use REST client fetch directly
          // Get the API key from environment
          const apiKey = SUPABASE_PUBLISHABLE_KEY;
          if (!apiKey) {
            throw new Error('Supabase API key not found');
          }
          
          console.log('[useBoulders] 🔵 Calling REST fetch with:', { queryUrl, apiKey: apiKey.substring(0, 20) + '...' });
          
          // CRITICAL: Use window.fetch directly instead of restFetch
          // restFetch might not trigger our custom fetch override
          // Use window.fetch which is guaranteed to use our override
          const restPromise = window.fetch(queryUrl, {
            method: 'GET',
            headers: {
              'apikey': apiKey,
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          }).then(async (response: Response) => {
            console.log('[useBoulders] 🔵 REST fetch response:', response.status, response.statusText);
            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`REST fetch failed: ${response.status} ${response.statusText} - ${errorText}`);
            }
            const data = await response.json();
            console.log('[useBoulders] ✅ REST fetch data:', data);
            return { data, error: null };
          });
          
          const result = await Promise.race([
            restPromise,
            timeoutPromise
          ]);
          
          console.log('[useBoulders] 🔵 REST fetch result:', result);
          const { data, error } = result as { data: any, error: any };
          
          if (error) {
            throw error;
          }
          
          isResolved = true;
          if (timeoutId) clearTimeout(timeoutId);
          return data as Boulder[];
        } else {
          console.error('[useBoulders] ❌ REST client not available - this should not happen!');
          throw new Error('REST client not available');
          
          // Fallback to QueryBuilder
          const queryPromise = currentSupabase
            .from('boulders')
            .select('*')
            .order('created_at', { ascending: false });
          
          console.log('[useBoulders] 🔵 QueryBuilder created:', typeof queryPromise, queryPromise instanceof Promise);
          console.log('[useBoulders] 🔵 QueryBuilder is thenable:', typeof queryPromise.then === 'function');
          
          const wrappedPromise = new Promise((resolve, reject) => {
            console.log('[useBoulders] 🔵 Wrapping QueryBuilder promise...');
            let resolved = false;
            
            const checkTimeout = setTimeout(() => {
              if (!resolved) {
                console.error('[useBoulders] ⚠️ QueryBuilder promise never resolved after 1s - this indicates the request was never sent!');
              }
            }, 1000);
            
            queryPromise.then((result) => {
              resolved = true;
              clearTimeout(checkTimeout);
              console.log('[useBoulders] ✅ QueryBuilder promise resolved:', result);
              resolve(result);
            }).catch((error) => {
              resolved = true;
              clearTimeout(checkTimeout);
              console.error('[useBoulders] ❌ QueryBuilder promise rejected:', error);
              reject(error);
            });
          });
          
          const result = await Promise.race([
            wrappedPromise,
            timeoutPromise
          ]);
          
          return result as Boulder[];
        }
        
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
  const { session, user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Boulder> & { id: string }) => {
      console.log('[useUpdateBoulder] 🔵 Starting mutation for boulder:', id);
      
      // CRITICAL: Use session from useAuth hook instead of supabase.auth.getSession()
      // supabase.auth.getSession() hangs on localhost after reload
      let currentSession = session;
      
      if (!currentSession?.access_token) {
        // Try to get session with timeout as fallback
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Session timeout after 5s')), 5000)
        );
        
        try {
          const sessionResult = await Promise.race([sessionPromise, timeoutPromise]);
          const { data: { session: fetchedSession } } = sessionResult as any;
          if (!fetchedSession?.access_token) {
            throw new Error('Nicht angemeldet. Bitte melde dich an.');
          }
          currentSession = fetchedSession;
        } catch (timeoutError) {
          console.error('[useUpdateBoulder] ❌ Session timeout:', timeoutError);
          throw new Error('Session timeout - bitte Seite neu laden');
        }
      }
      
      if (!currentSession?.access_token) {
        throw new Error('Nicht angemeldet. Bitte melde dich an.');
      }
      
      console.log('[useUpdateBoulder] ✅ Session obtained');

      // Use direct fetch instead of QueryBuilder to avoid hanging issues after reload
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      if (!SUPABASE_URL || !SUPABASE_KEY) {
        throw new Error('Supabase-Konfiguration fehlt');
      }

      // Get old data for logging (with timeout)
      console.log('[useUpdateBoulder] Fetching old data...');
      let oldData = null;
      try {
        const oldDataTimeout = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Old data fetch timeout')), 5000)
        );
        
        const oldDataResponse = await Promise.race([
          fetch(
            `${SUPABASE_URL}/rest/v1/boulders?id=eq.${id}&select=*`,
            {
              method: 'GET',
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${currentSession.access_token}`,
                'Content-Type': 'application/json',
              },
            }
          ),
          oldDataTimeout
        ]);

        if (oldDataResponse.ok) {
          const oldDataArray = await oldDataResponse.json();
          oldData = Array.isArray(oldDataArray) && oldDataArray.length > 0 ? oldDataArray[0] : null;
          console.log('[useUpdateBoulder] Old data fetched');
        }
      } catch (error: any) {
        console.warn('[useUpdateBoulder] Could not fetch old data (non-critical):', error);
        // Continue without old data - logging is not critical
      }

      // Update boulder (with timeout)
      console.log('[useUpdateBoulder] Updating boulder with data:', updates);
      const updateTimeout = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Update timeout after 20s')), 20000)
      );
      
      const response = await Promise.race([
        fetch(
          `${SUPABASE_URL}/rest/v1/boulders?id=eq.${id}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${currentSession.access_token}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
            body: JSON.stringify(updates),
          }
        ),
        updateTimeout
      ]);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const dataArray = await response.json();
      const data = Array.isArray(dataArray) && dataArray.length > 0 ? dataArray[0] : null;

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

      // Log in background (fire-and-forget) – no await, no timeout; build marker: v2
      console.log('[useUpdateBoulder] Log sent in background (no await)');
      logBoulderOperation('update', id, data.name, data, changes, currentSession.access_token)
        .then((ok) => { if (ok) console.log('[useUpdateBoulder] Operation logged'); })
        .catch((err) => {
          console.warn('[useUpdateBoulder] Log failed (non-critical):', err);
          toast.warning('Boulder wurde gespeichert, aber der Log-Eintrag konnte nicht erstellt werden.');
        });

      console.log('[useUpdateBoulder] Mutation completed successfully');
      return { data, updates };
    },
    onSuccess: (result) => {
      // Always invalidate and refetch boulders immediately
      queryClient.invalidateQueries({ queryKey: ['boulders'] });
      queryClient.refetchQueries({ queryKey: ['boulders'] });
      queryClient.invalidateQueries({ queryKey: ['boulder-operation-logs'] });
      
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
  const { session, user } = useAuth();

  return useMutation({
    mutationFn: async (newBoulder: Omit<Boulder, 'id' | 'created_at' | 'updated_at'>) => {
      console.log('[useCreateBoulder] 🔵 Starting mutation...');

      let currentSession = session;
      if (!currentSession?.access_token) {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Session timeout after 5s')), 5000)
        );
        try {
          const sessionResult = await Promise.race([sessionPromise, timeoutPromise]);
          const { data: { session: fetchedSession } } = sessionResult as any;
          if (!fetchedSession?.access_token) throw new Error('Nicht angemeldet. Bitte melde dich an.');
          currentSession = fetchedSession;
        } catch (timeoutError) {
          console.error('[useCreateBoulder] ❌ Session timeout:', timeoutError);
          throw new Error('Session timeout - bitte Seite neu laden');
        }
      }
      if (!currentSession?.access_token) {
        throw new Error('Nicht angemeldet. Bitte melde dich an.');
      }
      console.log('[useCreateBoulder] ✅ Session obtained');

      // Erstelle den Boulder
      // Ensure status is set (default to 'haengt' if not provided)
      const boulderData = {
        ...newBoulder,
        status: newBoulder.status || 'haengt',
      };
      
      // Use direct fetch instead of QueryBuilder to avoid hanging issues after reload
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      if (!SUPABASE_URL || !SUPABASE_KEY) {
        throw new Error('Supabase-Konfiguration fehlt');
      }

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/boulders`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${currentSession.access_token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(boulderData),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const createdBoulder = Array.isArray(data) ? data[0] : data;

      // Aktualisiere automatisch den last_schraubtermin des Sektors
      try {
        const sectorResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/sectors?id=eq.${newBoulder.sector_id}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${currentSession.access_token}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({ 
              last_schraubtermin: new Date().toISOString() 
            }),
          }
        );

        if (!sectorResponse.ok) {
          console.error('Fehler beim Aktualisieren des Sektor-Schraubtermins:', await sectorResponse.text());
          // Wir werfen den Fehler nicht, da der Boulder bereits erstellt wurde
        }
      } catch (sectorError) {
        console.error('Fehler beim Aktualisieren des Sektor-Schraubtermins:', sectorError);
        // Wir werfen den Fehler nicht, da der Boulder bereits erstellt wurde
      }

      // Log in background (fire-and-forget)
      logBoulderOperation('create', createdBoulder.id, createdBoulder.name, createdBoulder, undefined, currentSession.access_token)
        .then((ok) => { if (ok) console.log('[useCreateBoulder] Operation logged'); })
        .catch((err) => {
          console.warn('[useCreateBoulder] Log failed (non-critical):', err);
          toast.warning('Boulder wurde erstellt, aber der Log-Eintrag konnte nicht erstellt werden.');
        });

      return createdBoulder;
    },
    onSuccess: () => {
      // Invalidate and immediately refetch to show new boulder
      queryClient.invalidateQueries({ queryKey: ['boulders'] });
      queryClient.refetchQueries({ queryKey: ['boulders'] });
      queryClient.invalidateQueries({ queryKey: ['sectors'] });
      queryClient.refetchQueries({ queryKey: ['sectors'] });
      queryClient.invalidateQueries({ queryKey: ['boulder-operation-logs'] });
      toast.success('Boulder erfolgreich erstellt!');
    },
    onError: (error) => {
      const msg = error?.message ?? String(error ?? 'Unbekannter Fehler');
      toast.error('Fehler beim Erstellen: ' + msg);
    },
  });
};

export const useDeleteBoulder = () => {
  const queryClient = useQueryClient();
  const { session, user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      console.log('[useDeleteBoulder] 🔵 Starting deletion for boulder ID:', id);
      
      // CRITICAL: Use session from useAuth hook instead of supabase.auth.getSession()
      // supabase.auth.getSession() hangs on localhost after reload
      let currentSession = session;
      
      if (!currentSession?.access_token) {
        // Try to get session with timeout as fallback
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Session timeout after 5s')), 5000)
        );
        
        try {
          const sessionResult = await Promise.race([sessionPromise, timeoutPromise]);
          const { data: { session: fetchedSession } } = sessionResult as any;
          if (!fetchedSession?.access_token) {
            throw new Error('Nicht angemeldet. Bitte melde dich an.');
          }
          currentSession = fetchedSession;
        } catch (timeoutError) {
          console.error('[useDeleteBoulder] ❌ Session timeout:', timeoutError);
          throw new Error('Session timeout - bitte Seite neu laden');
        }
      }
      
      if (!currentSession?.access_token) {
        throw new Error('Nicht angemeldet. Bitte melde dich an.');
      }
      
      console.log('[useDeleteBoulder] ✅ Session obtained');
      
      // Use direct fetch instead of QueryBuilder to avoid hanging issues after reload
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      if (!SUPABASE_URL || !SUPABASE_KEY) {
        throw new Error('Supabase-Konfiguration fehlt');
      }
      
      // First, get the boulder to check if it has a beta video or thumbnail
      console.log('[useDeleteBoulder] 🔍 Fetching boulder data...');
      const boulderResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/boulders?id=eq.${id}&select=beta_video_url,thumbnail_url,name`,
        {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${currentSession.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!boulderResponse.ok) {
        const errorText = await boulderResponse.text();
        console.error('[useDeleteBoulder] Error fetching boulder:', boulderResponse.status, errorText);
        throw new Error(`HTTP ${boulderResponse.status}: ${errorText}`);
      }

      const boulderArray = await boulderResponse.json();
      const boulder = Array.isArray(boulderArray) && boulderArray.length > 0 ? boulderArray[0] : null;

      if (!boulder) {
        console.warn('[useDeleteBoulder] Boulder not found:', id);
        throw new Error('Boulder nicht gefunden');
      }

      // Type guard: ensure boulder has the expected structure
      const boulderData = boulder as { name: string; beta_video_url: string | null; thumbnail_url: string | null };
      console.log('[useDeleteBoulder] ✅ Boulder found:', boulderData.name, 'Video URL:', boulderData.beta_video_url, 'Thumbnail URL:', boulderData.thumbnail_url);

      // Get full boulder data for logging
      console.log('[useDeleteBoulder] 🔍 Fetching full boulder data for logging...');
      const fullBoulderResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/boulders?id=eq.${id}&select=*`,
        {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${currentSession.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      let fullBoulderData = null;
      if (fullBoulderResponse.ok) {
        const fullBoulderArray = await fullBoulderResponse.json();
        fullBoulderData = Array.isArray(fullBoulderArray) && fullBoulderArray.length > 0 ? fullBoulderArray[0] : null;
      }

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
      console.log('[useDeleteBoulder] 🗑️ Deleting upload_logs for boulder:', id);
      try {
        const uploadLogsResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/upload_logs?boulder_id=eq.${id}`,
          {
            method: 'DELETE',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${currentSession.access_token}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
          }
        );

        if (!uploadLogsResponse.ok) {
          const errorText = await uploadLogsResponse.text();
          console.error('[useDeleteBoulder] Error deleting upload_logs (continuing anyway):', uploadLogsResponse.status, errorText);
        } else {
          console.log('[useDeleteBoulder] ✅ Upload logs deleted successfully');
        }
      } catch (uploadLogsError) {
        console.error('[useDeleteBoulder] Error deleting upload_logs (continuing anyway):', uploadLogsError);
        // Continue with boulder deletion even if upload_logs deletion fails
      }

      // Log delete BEFORE deleting the boulder (FK: boulder_operation_logs.boulder_id must exist in boulders)
      const logName = fullBoulderData?.name ?? boulderData.name;
      const logData = fullBoulderData ?? { id, name: boulderData.name };
      const logOk = await logBoulderOperation('delete', id, logName, logData, undefined, currentSession.access_token);
      if (logOk) {
        console.log('[useDeleteBoulder] ✅ Operation logged (before delete)');
        queryClient.invalidateQueries({ queryKey: ['boulder-operation-logs'] });
      }

      // Then delete the boulder
      console.log('[useDeleteBoulder] 🗑️ Deleting boulder from database:', id);
      const deleteResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/boulders?id=eq.${id}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${currentSession.access_token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
        }
      );

      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text();
        console.error('[useDeleteBoulder] ❌ Error deleting boulder:', deleteResponse.status, errorText);
        throw new Error(`HTTP ${deleteResponse.status}: ${errorText}`);
      }

      const deleteDataArray = await deleteResponse.json();
      const deleteData = Array.isArray(deleteDataArray) ? deleteDataArray : [];

      console.log('[useDeleteBoulder] ✅ Boulder deleted successfully. Response:', deleteData);
      
      // Check if anything was actually deleted
      if (!deleteData || deleteData.length === 0) {
        console.error('[useDeleteBoulder] ⚠️ No rows deleted! This might be due to RLS policies.');
        // Try to fetch the boulder again to confirm it still exists
        const stillExistsResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/boulders?id=eq.${id}&select=id,name`,
          {
            method: 'GET',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${currentSession.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );
        
        if (stillExistsResponse.ok) {
          const stillExistsArray = await stillExistsResponse.json();
          const stillExists = Array.isArray(stillExistsArray) && stillExistsArray.length > 0 ? stillExistsArray[0] : null;
          
          if (stillExists) {
            throw new Error('Boulder konnte nicht gelöscht werden. Möglicherweise fehlen die Berechtigungen (RLS Policy).');
          }
        }
      }
      
      console.log('[useDeleteBoulder] ✅✅✅ Mutation function completed successfully, returning ID:', id);
      
      // CRITICAL: Update cache immediately in mutation function as well
      // This ensures the UI updates even if onSuccess has issues
      console.log('[useDeleteBoulder] 🔄 Attempting to update cache in mutation function...');
      try {
        const currentCacheData = queryClient.getQueryData<Boulder[]>(['boulders']);
        console.log('[useDeleteBoulder] Current cache data:', currentCacheData ? `${currentCacheData.length} boulders` : 'null/undefined');
        
        queryClient.setQueryData(['boulders'], (oldData: Boulder[] | undefined) => {
          console.log('[useDeleteBoulder] setQueryData callback called with:', oldData ? `${oldData.length} boulders` : 'null/undefined');
          if (!oldData) {
            console.log('[useDeleteBoulder] ⚠️ No old data in cache during mutation - cache might be empty');
            return oldData;
          }
          const beforeCount = oldData.length;
          const filtered = oldData.filter(b => b.id !== id);
          const afterCount = filtered.length;
          console.log('[useDeleteBoulder] ✅✅✅ Removed boulder from cache in mutation:', id, `Before: ${beforeCount}, After: ${afterCount}`);
          if (beforeCount === afterCount) {
            console.warn('[useDeleteBoulder] ⚠️ Boulder was not found in cache! ID:', id);
          }
          return filtered;
        });
        
        // Verify the update worked
        const updatedCacheData = queryClient.getQueryData<Boulder[]>(['boulders']);
        console.log('[useDeleteBoulder] ✅ Cache after update:', updatedCacheData ? `${updatedCacheData.length} boulders` : 'null/undefined');
      } catch (cacheError) {
        console.error('[useDeleteBoulder] ❌ Error updating cache in mutation:', cacheError);
        // Don't throw - cache update failure shouldn't break deletion
      }
      
      console.log('[useDeleteBoulder] ✅✅✅ About to return ID from mutation function:', id);
      // Return the deleted ID so onSuccess can use it
      return id;
    },
    onSuccess: (deletedId: string) => {
      console.log('[useDeleteBoulder] ✅✅✅✅✅ onSuccess CALLED! Deletion successful, updating cache...', deletedId);
      
      // CRITICAL: Remove the deleted boulder from cache immediately
      // This ensures the UI updates instantly without waiting for refetch
      const currentCacheBefore = queryClient.getQueryData<Boulder[]>(['boulders']);
      console.log('[useDeleteBoulder] Cache before onSuccess update:', currentCacheBefore ? `${currentCacheBefore.length} boulders` : 'null/undefined');
      
      queryClient.setQueryData(['boulders'], (oldData: Boulder[] | undefined) => {
        console.log('[useDeleteBoulder] onSuccess setQueryData callback called with:', oldData ? `${oldData.length} boulders` : 'null/undefined');
        if (!oldData) {
          console.log('[useDeleteBoulder] ⚠️ No old data in cache in onSuccess, skipping immediate update');
          return oldData;
        }
        const beforeCount = oldData.length;
        const filtered = oldData.filter(b => b.id !== deletedId);
        const afterCount = filtered.length;
        console.log('[useDeleteBoulder] ✅✅✅ Removed boulder from cache in onSuccess:', deletedId, `Before: ${beforeCount}, After: ${afterCount}`);
        if (beforeCount === afterCount) {
          console.warn('[useDeleteBoulder] ⚠️ Boulder was not found in cache in onSuccess! ID:', deletedId);
        }
        return filtered;
      });
      
      const currentCacheAfter = queryClient.getQueryData<Boulder[]>(['boulders']);
      console.log('[useDeleteBoulder] Cache after onSuccess update:', currentCacheAfter ? `${currentCacheAfter.length} boulders` : 'null/undefined');
      
      // Also invalidate to ensure all dependent queries are updated
      queryClient.invalidateQueries({ queryKey: ['boulders'] });
      queryClient.invalidateQueries({ queryKey: ['sectors'] });
      queryClient.invalidateQueries({ queryKey: ['boulder-operation-logs'] });
      
      // Force refetch immediately to ensure consistency with server
      // Use await to ensure refetch completes before showing success message
      Promise.all([
        queryClient.refetchQueries({ queryKey: ['boulders'] }),
        queryClient.refetchQueries({ queryKey: ['sectors'] })
      ]).then(() => {
        console.log('[useDeleteBoulder] ✅ Cache refetched successfully');
      }).catch((error) => {
        console.error('[useDeleteBoulder] ⚠️ Error refetching cache:', error);
      });
      
      console.log('[useDeleteBoulder] ✅ Cache update initiated');
      toast.success('Boulder erfolgreich gelöscht!');
    },
    onError: (error) => {
      const msg = error?.message ?? String(error ?? 'Unbekannter Fehler');
      toast.error('Fehler beim Löschen: ' + msg);
    },
  });
};

export const useBulkUpdateBoulderStatus = () => {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  
  return useMutation({
    mutationFn: async (payload: { ids: string[]; status: 'haengt' | 'abgeschraubt' }) => {
      console.log('[useBulkUpdateBoulderStatus] 🔵 Starting bulk update for', payload.ids.length, 'boulders');
      
      // CRITICAL: Use session from useAuth hook instead of supabase.auth.getSession()
      // supabase.auth.getSession() hangs on localhost after reload
      let currentSession = session;
      
      if (!currentSession?.access_token) {
        // Try to get session with timeout as fallback
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Session timeout after 5s')), 5000)
        );
        
        try {
          const sessionResult = await Promise.race([sessionPromise, timeoutPromise]);
          const { data: { session: fetchedSession } } = sessionResult as any;
          if (!fetchedSession?.access_token) {
            throw new Error('Nicht angemeldet. Bitte melde dich an.');
          }
          currentSession = fetchedSession;
        } catch (timeoutError) {
          console.error('[useBulkUpdateBoulderStatus] ❌ Session timeout:', timeoutError);
          throw new Error('Session timeout - bitte Seite neu laden');
        }
      }
      
      if (!currentSession?.access_token) {
        throw new Error('Nicht angemeldet. Bitte melde dich an.');
      }
      
      console.log('[useBulkUpdateBoulderStatus] ✅ Session obtained');
      
      // Use direct fetch instead of QueryBuilder to avoid hanging issues after reload
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      if (!SUPABASE_URL || !SUPABASE_KEY) {
        throw new Error('Supabase-Konfiguration fehlt');
      }
      
      // Build filter for multiple IDs: id=in.(id1,id2,id3)
      const idsFilter = payload.ids.join(',');
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/boulders?id=in.(${idsFilter})`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${currentSession.access_token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ status: payload.status }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[useBulkUpdateBoulderStatus] ❌ Error updating boulders:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      console.log('[useBulkUpdateBoulderStatus] ✅ Bulk update completed successfully');
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
