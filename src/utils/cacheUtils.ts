/**
 * Utility functions for cache management
 * Provides functions to manually clear caches when needed
 */

import { QueryClient, type QueryKey } from '@tanstack/react-query';

/**
 * Clear all React Query caches
 */
export const clearReactQueryCache = (queryClient: QueryClient) => {
  queryClient.clear();
  console.log('[CacheUtils] React Query cache cleared');
};

/**
 * Invalidate and refetch all boulder-related queries
 */
export const refreshBoulderData = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: ['boulders'] });
  queryClient.refetchQueries({ queryKey: ['boulders'] });
  queryClient.invalidateQueries({ queryKey: ['sectors'] });
  queryClient.refetchQueries({ queryKey: ['sectors'] });
  console.log('[CacheUtils] Boulder data refreshed');
};

/**
 * Clear browser caches (Service Worker and HTTP cache)
 * Note: This requires user interaction due to browser security
 */
export const clearBrowserCaches = async (): Promise<void> => {
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
      console.log('[CacheUtils] Browser caches cleared');
    } catch (error) {
      console.error('[CacheUtils] Error clearing browser caches:', error);
      throw error;
    }
  }
};

/**
 * Force reload the page with cache bypass
 */
export const hardReload = () => {
  if ('serviceWorker' in navigator) {
    // Unregister service worker first
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister();
      });
      // Then reload
      window.location.reload();
    });
  } else {
    window.location.reload();
  }
};

/**
 * Clear all caches and reload the page
 */
export const clearAllCachesAndReload = async (queryClient: QueryClient) => {
  try {
    // Clear React Query cache
    clearReactQueryCache(queryClient);
    
    // Clear browser caches
    await clearBrowserCaches();
    
    // Reload page
    hardReload();
  } catch (error) {
    console.error('[CacheUtils] Error clearing all caches:', error);
    // Still reload even if cache clearing fails
    hardReload();
  }
};

/**
 * Get active queries (queries that are currently being used by mounted components)
 */
const getActiveQueries = (queryClient: QueryClient): QueryKey[] => {
  const queryCache = queryClient.getQueryCache();
  const activeQueries: QueryKey[] = [];
  
  queryCache.getAll().forEach((query) => {
    // Only include queries that have observers (are being used)
    if (query.getObserversCount() > 0) {
      activeQueries.push(query.queryKey);
    }
  });
  
  return activeQueries;
};

/**
 * Refetch queries in batches sequentially (like initial load)
 * This prevents too many parallel requests that can cause rate limiting or hanging
 */
const refetchBatch = async (
  queryClient: QueryClient,
  queryKeys: QueryKey[],
  batchName: string,
  timeoutMs: number = 15000
): Promise<{ refreshedQueries: number; failedQueries: number }> => {
  const startTime = Date.now();
  console.log(`[CacheUtils] 🔄 Batch "${batchName}": Starting refetch of ${queryKeys.length} queries...`);
  
  const refetchPromises = queryKeys.map(async (queryKey): Promise<boolean> => {
    const queryStartTime = Date.now();
    try {
      // Check if query exists and is active
      const queryState = queryClient.getQueryState(queryKey);
      if (!queryState) {
        console.log(`[CacheUtils] ⏭️  Query ${JSON.stringify(queryKey)} not found, skipping`);
        return true;
      }
      
      // Refetch with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Query timeout after ${timeoutMs}ms`)), timeoutMs);
      });
      
      const refetchPromise = queryClient.refetchQueries({ queryKey, exact: true, type: 'active' }).catch((error) => {
        // Check for rate limiting errors
        if (error?.message?.includes('rate limit') || error?.message?.includes('429') || error?.message?.includes('Too many requests')) {
          console.warn(`[CacheUtils] ⚠️  Rate limit detected for ${JSON.stringify(queryKey)}, will retry with backoff`);
          throw { ...error, isRateLimit: true };
        }
        throw error;
      });
      
      await Promise.race([refetchPromise, timeoutPromise]);

      const refreshedState = queryClient.getQueryState(queryKey);
      if (refreshedState?.status === 'error') {
        throw refreshedState.error ?? new Error(`Query ${JSON.stringify(queryKey)} failed`);
      }
      
      const duration = Date.now() - queryStartTime;
      console.log(`[CacheUtils] ✅ Query ${JSON.stringify(queryKey)} refetched in ${duration}ms`);
      return true;
    } catch (error: unknown) {
      const duration = Date.now() - queryStartTime;
      const refreshError = error as { isRateLimit?: boolean };
      
      // Handle rate limiting with retry
      if (refreshError?.isRateLimit) {
        console.warn(`[CacheUtils] ⚠️  Rate limit for ${JSON.stringify(queryKey)}, waiting 2s before retry...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          await queryClient.refetchQueries({ queryKey, exact: true, type: 'active' });
          const retriedState = queryClient.getQueryState(queryKey);
          if (retriedState?.status === 'error') {
            throw retriedState.error ?? new Error(`Query ${JSON.stringify(queryKey)} failed after retry`);
          }
          console.log(`[CacheUtils] ✅ Query ${JSON.stringify(queryKey)} refetched after retry`);
          return true;
        } catch (retryError) {
          console.error(`[CacheUtils] ❌ Query ${JSON.stringify(queryKey)} failed after retry:`, retryError);
          return false;
        }
      } else {
        console.error(`[CacheUtils] ❌ Query ${JSON.stringify(queryKey)} failed after ${duration}ms:`, error);
        return false;
      }
    }
  });
  
  const results = await Promise.all(refetchPromises);
  const refreshedQueries = results.filter(Boolean).length;
  const failedQueries = results.length - refreshedQueries;
  
  const batchDuration = Date.now() - startTime;
  console.log(`[CacheUtils] ✅ Batch "${batchName}" completed in ${batchDuration}ms (${refreshedQueries} ok, ${failedQueries} failed)`);
  return { refreshedQueries, failedQueries };
};

/**
 * Invalidate and refetch queries sequentially (like initial load)
 * Use this for pull-to-refresh to ensure all data is reloaded without overwhelming the server
 */
export const refreshAllData = async (queryClient: QueryClient): Promise<{ refreshedQueries: number; failedQueries: number }> => {
  const refreshStartTime = Date.now();
  console.log('[CacheUtils] 🔄 Starting refresh (pull-to-refresh/reload)...');
  console.log('[CacheUtils] 📊 Debugging info:', {
    timestamp: new Date().toISOString(),
    activeQueriesCount: getActiveQueries(queryClient).length,
  });
  
  try {
    // Step 1: Get active queries (only refetch queries that are currently being used)
    const activeQueries = getActiveQueries(queryClient);
    console.log(`[CacheUtils] 📋 Found ${activeQueries.length} active queries to refetch`);
    
    if (activeQueries.length === 0) {
      console.log('[CacheUtils] ⚠️  No active queries found, skipping refresh');
      return { refreshedQueries: 0, failedQueries: 0 };
    }

    let refreshedQueries = 0;
    let failedQueries = 0;
    
    // Step 2: Mark active data as stale without triggering an implicit second
    // refetch. Each active query is fetched exactly once in the batches below.
    console.log('[CacheUtils] Step 1: Invalidating all queries...');
    await queryClient.invalidateQueries({ refetchType: 'none' });
    
    // Step 3: Refetch queries in priority batches SEQUENTIALLY (like initial load)
    // This prevents too many parallel requests that can cause rate limiting or hanging
    
    // Batch 1: Critical queries (boulders, sectors) - most important
    const batch1Keys = activeQueries.filter(key => 
      key[0] === 'boulders' || key[0] === 'sectors'
    );
    if (batch1Keys.length > 0) {
      const result = await refetchBatch(queryClient, batch1Keys, 'Critical (boulders, sectors)', 15000);
      refreshedQueries += result.refreshedQueries;
      failedQueries += result.failedQueries;
    }
    
    // Batch 2: Important queries (colors, profiles) - needed for UI
    const batch2Keys = activeQueries.filter(key => 
      key[0] === 'colors' || key[0] === 'profiles'
    );
    if (batch2Keys.length > 0) {
      const result = await refetchBatch(queryClient, batch2Keys, 'Important (colors, profiles)', 15000);
      refreshedQueries += result.refreshedQueries;
      failedQueries += result.failedQueries;
    }
    
    // Batch 3: Other queries (notifications, competition data, etc.) - less critical
    const batch3Keys = activeQueries.filter(key => 
      !batch1Keys.includes(key) && !batch2Keys.includes(key)
    );
    if (batch3Keys.length > 0) {
      const result = await refetchBatch(queryClient, batch3Keys, 'Other queries', 15000);
      refreshedQueries += result.refreshedQueries;
      failedQueries += result.failedQueries;
    }
    
    const totalDuration = Date.now() - refreshStartTime;
    console.log(`[CacheUtils] ✅ Refresh completed in ${totalDuration}ms (${refreshedQueries} ok, ${failedQueries} failed)`);
    return { refreshedQueries, failedQueries };
  } catch (error) {
    const totalDuration = Date.now() - refreshStartTime;
    console.error(`[CacheUtils] ❌ Error refreshing all data after ${totalDuration}ms:`, error);
    throw error;
  }
};

/**
 * Clear all caches (React Query + Browser) without reloading
 * Use this for pull-to-refresh
 */
export const clearAllCaches = async (queryClient: QueryClient) => {
  console.log('[CacheUtils] Clearing all caches...');
  
  try {
    // Clear React Query cache
    clearReactQueryCache(queryClient);
    
    // Clear browser caches (may fail in some contexts, that's okay)
    try {
      await clearBrowserCaches();
    } catch (cacheError) {
      console.warn('[CacheUtils] Could not clear browser caches (may be expected):', cacheError);
      // Don't throw - browser cache clearing may not be available in all contexts
    }
    
    console.log('[CacheUtils] All caches cleared');
  } catch (error) {
    console.error('[CacheUtils] Error clearing caches:', error);
    // Don't throw - allow app to continue functioning even if cache clearing fails
  }
};

/**
 * Refetch stale queries when app becomes visible again
 * Use this for visibilitychange events to refresh data when app comes back from background
 */
export const refetchOnVisibilityChange = async (queryClient: QueryClient) => {
  const visibilityStartTime = Date.now();
  console.log('[CacheUtils] 🔄 App became visible - refetching stale queries...');
  
  try {
    // Get all active queries
    const activeQueries = getActiveQueries(queryClient);
    console.log(`[CacheUtils] 📋 Found ${activeQueries.length} active queries to check`);
    
    if (activeQueries.length === 0) {
      console.log('[CacheUtils] ⚠️  No active queries found, skipping refetch');
      return;
    }
    
    // Only refetch queries that are stale (older than staleTime)
    // Since staleTime is 0, all queries are considered stale
    // But we'll only refetch if they exist and have data (to avoid unnecessary requests)
    const staleQueries = activeQueries.filter(queryKey => {
      const queryState = queryClient.getQueryState(queryKey);
      if (!queryState) return false;
      
      // Refetch if query is stale or has an error
      return queryState.isStale || queryState.status === 'error';
    });
    
    if (staleQueries.length === 0) {
      console.log('[CacheUtils] ✅ No stale queries found, skipping refetch');
      return;
    }
    
    console.log(`[CacheUtils] 🔄 Refetching ${staleQueries.length} stale queries...`);
    
    // Refetch stale queries in batches (same as refreshAllData)
    const batch1Keys = staleQueries.filter(key => 
      key[0] === 'boulders' || key[0] === 'sectors'
    );
    if (batch1Keys.length > 0) {
      await refetchBatch(queryClient, batch1Keys, 'Critical (boulders, sectors)', 15000);
    }
    
    const batch2Keys = staleQueries.filter(key => 
      key[0] === 'colors' || key[0] === 'profiles'
    );
    if (batch2Keys.length > 0) {
      await refetchBatch(queryClient, batch2Keys, 'Important (colors, profiles)', 15000);
    }
    
    const batch3Keys = staleQueries.filter(key => 
      !batch1Keys.includes(key) && !batch2Keys.includes(key)
    );
    if (batch3Keys.length > 0) {
      await refetchBatch(queryClient, batch3Keys, 'Other queries', 15000);
    }
    
    const totalDuration = Date.now() - visibilityStartTime;
    console.log(`[CacheUtils] ✅ Stale queries refetched successfully in ${totalDuration}ms`);
  } catch (error) {
    const totalDuration = Date.now() - visibilityStartTime;
    console.error(`[CacheUtils] ❌ Error refetching stale queries after ${totalDuration}ms:`, error);
    // Don't throw - allow app to continue functioning even if refetch fails
  }
};

