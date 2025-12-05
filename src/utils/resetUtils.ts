import { QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * Performs an emergency reset of the app
 * Clears all caches, storage (except auth), and reloads the page
 * 
 * @param queryClient - The React Query client instance
 * @returns Promise that resolves when reset is complete
 */
export async function performEmergencyReset(queryClient: QueryClient): Promise<void> {
  try {
    console.log('[ResetUtils] Starting emergency reset...');
    
    // Step 1: Clear React Query cache
    queryClient.clear();
    console.log('[ResetUtils] React Query cache cleared');
    
    // Step 2: Clear session storage (but keep auth session)
    try {
      const preserveAuth = sessionStorage.getItem('sb-auth-token');
      sessionStorage.clear();
      // Restore auth token if it exists
      if (preserveAuth) {
        sessionStorage.setItem('sb-auth-token', preserveAuth);
      }
      console.log('[ResetUtils] Session storage cleared');
    } catch (e) {
      console.warn('[ResetUtils] Could not clear session storage:', e);
    }
    
    // Step 3: Clear localStorage (but keep auth)
    try {
      const preserveAuthLocal = localStorage.getItem('sb-auth-token');
      localStorage.clear();
      // Restore auth token if it exists
      if (preserveAuthLocal) {
        localStorage.setItem('sb-auth-token', preserveAuthLocal);
      }
      console.log('[ResetUtils] Local storage cleared');
    } catch (e) {
      console.warn('[ResetUtils] Could not clear local storage:', e);
    }
    
    // Step 4: Clear browser caches
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('[ResetUtils] Browser caches cleared');
      }
    } catch (e) {
      console.warn('[ResetUtils] Could not clear browser caches:', e);
    }
    
    // Step 5: Show toast and reload page
    toast.success('App wird neu gestartet...', {
      description: 'Die Seite wird neu geladen.',
    });
    
    setTimeout(() => {
      window.location.href = '/';
    }, 500);
    
  } catch (error) {
    console.error('[ResetUtils] Error during reset:', error);
    toast.error('Fehler beim Neustarten', {
      description: 'Bitte versuche es erneut oder lade die Seite manuell neu.',
    });
    throw error; // Re-throw so caller can handle it
  }
}

