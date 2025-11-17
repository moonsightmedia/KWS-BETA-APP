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
  
  // Invalidate all queries
  queryClient.invalidateQueries();
  
  // Refetch all active queries
  await queryClient.refetchQueries();
  
  console.log('[CacheUtils] All data refreshed');
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
    
    // Clear browser caches
    await clearBrowserCaches();
    
    console.log('[CacheUtils] All caches cleared');
  } catch (error) {
    console.error('[CacheUtils] Error clearing caches:', error);
    throw error;
  }
};

