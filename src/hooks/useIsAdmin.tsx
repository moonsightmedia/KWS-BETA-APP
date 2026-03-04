import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './useAuth';

// Storage keys (same as in Sidebar and RoleTabs)
// CRITICAL: Use localStorage instead of sessionStorage for native apps
// sessionStorage is cleared when app is closed, localStorage persists
const STORAGE_KEY_ADMIN = 'nav_isAdmin';
const STORAGE_KEY_USER_ID = 'nav_userId';

// Helper to get stored admin status
const getStoredAdmin = (userId: string | undefined): boolean | null => {
  if (!userId) return null;
  
  try {
    // Try localStorage first (persists across app restarts)
    let storedUserId = localStorage.getItem(STORAGE_KEY_USER_ID);
    if (storedUserId === null) {
      // Fallback to sessionStorage for backward compatibility
      storedUserId = sessionStorage.getItem(STORAGE_KEY_USER_ID);
      if (storedUserId !== null) {
        // Migrate to localStorage
        localStorage.setItem(STORAGE_KEY_USER_ID, storedUserId);
      }
    }
    
    if (storedUserId !== userId) {
      // Different user - return null to trigger check
      return null;
    }
    
    let stored = localStorage.getItem(STORAGE_KEY_ADMIN);
    if (stored === null) {
      // Fallback to sessionStorage for backward compatibility
      stored = sessionStorage.getItem(STORAGE_KEY_ADMIN);
      if (stored !== null) {
        // Migrate to localStorage
        localStorage.setItem(STORAGE_KEY_ADMIN, stored);
      }
    }
    return stored === null ? null : stored === 'true';
  } catch {
    return null;
  }
};

// Check admin status via direct REST on user_roles (avoids has_role RPC overload ambiguity)
const checkAdminOnce = async (userId: string, accessToken: string): Promise<boolean> => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return false;
  try {
    const res = await window.fetch(
      `${url}/rest/v1/user_roles?user_id=eq.${userId}&role=eq.admin&select=user_id`,
      {
        method: 'GET',
        headers: {
          apikey: key,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    if (!res.ok) {
      console.error('[useIsAdmin] user_roles fetch failed:', res.status, await res.text());
      return false;
    }
    const data = await res.json();
    const isAdmin = Array.isArray(data) && data.length > 0;
    try {
      localStorage.setItem(STORAGE_KEY_ADMIN, String(isAdmin));
      localStorage.setItem(STORAGE_KEY_USER_ID, userId);
      sessionStorage.setItem(STORAGE_KEY_ADMIN, String(isAdmin));
      sessionStorage.setItem(STORAGE_KEY_USER_ID, userId);
    } catch (storageError) {
      console.warn('[useIsAdmin] Error storing admin status:', storageError);
    }
    return isAdmin;
  } catch (error) {
    console.error('[useIsAdmin] Exception checking admin status:', error);
    return false;
  }
};

export const useIsAdmin = () => {
  const { user, session } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(!!user?.id);

  const refreshAdminStatus = useCallback(async () => {
    if (!user?.id) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    const stored = getStoredAdmin(user.id);
    // Never trust a cached "true" value from browser storage.
    // It can be tampered with in DevTools. Only trust explicit cached false while re-validating.
    if (stored === false) {
      setIsAdmin(false);
    }

    const accessToken = session?.access_token;
    if (!accessToken) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await checkAdminOnce(user.id, accessToken);
      setIsAdmin(result);
    } catch (error) {
      console.error('[useIsAdmin] Error refreshing admin status:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, [user?.id, session?.access_token]);

  useEffect(() => {
    refreshAdminStatus();
  }, [refreshAdminStatus]);

  // CRITICAL: Also refresh when app becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user?.id) {
        console.log('[useIsAdmin] App visible - refreshing admin status');
        refreshAdminStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user?.id, refreshAdminStatus]);

  return { isAdmin, loading };
};
