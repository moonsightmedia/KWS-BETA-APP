/**
 * Utility functions for cache management
 * Provides functions to manually clear caches when needed
 */

import { QueryClient } from '@tanstack/react-query';

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
 * Invalidate and refetch ALL queries in React Query
 * Use this for pull-to-refresh to ensure all data is reloaded
 */
export const refreshAllData = async (queryClient: QueryClient) => {
  console.log('[CacheUtils] Refreshing all data (pull-to-refresh)...');
  
  try {
    // Step 1: Invalidate ALL queries first (marks them as stale)
    console.log('[CacheUtils] Step 1: Invalidating all queries...');
    await queryClient.invalidateQueries();
    
    // Step 2: Refetch ALL queries (both active and inactive) to ensure everything is fresh
    // This is important after a hard reload when components might not be mounted yet
    console.log('[CacheUtils] Step 2: Refetching all queries (active and inactive)...');
    const allRefetchResult = await queryClient.refetchQueries();
    console.log(`[CacheUtils] Refetched ${allRefetchResult.length} queries`);
    
    // Step 3: Also explicitly refetch common query keys to ensure they're loaded
    // This is a safety net for queries that might not be refetched otherwise
    const commonQueryKeys = [
      ['boulders'],
      ['sectors'],
      ['colors'],
      ['competition_boulders'],
      ['competition_results'],
      ['competition_leaderboard'],
      ['competition_participant'],
      ['competition_participants'],
      ['profiles'],
      ['boulder-operation-logs'],
      ['notifications'],
      ['notification_preferences'],
    ];
    
    console.log('[CacheUtils] Step 3: Explicitly refetching common query keys...');
    const commonRefetchPromises = commonQueryKeys.map(queryKey =>
      queryClient.refetchQueries({ queryKey }).catch((error) => {
        console.warn(`[CacheUtils] Error refetching query ${JSON.stringify(queryKey)}:`, error);
      })
    );
    await Promise.all(commonRefetchPromises);
    
    // Step 4: Clear browser caches after refetch to ensure fresh data on next load
    try {
      await clearBrowserCaches();
      console.log('[CacheUtils] Browser caches cleared');
    } catch (cacheError) {
      console.warn('[CacheUtils] Could not clear browser caches:', cacheError);
    }
    
    console.log('[CacheUtils] ✅ All data refreshed successfully');
  } catch (error) {
    console.error('[CacheUtils] ❌ Error refreshing all data:', error);
    // Don't throw - allow app to continue functioning even if refresh fails
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

