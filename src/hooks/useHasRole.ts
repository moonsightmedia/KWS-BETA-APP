import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './useAuth';

// Storage keys (same as in Sidebar and RoleTabs)
// CRITICAL: Use localStorage instead of sessionStorage for native apps
// sessionStorage is cleared when app is closed, localStorage persists
const STORAGE_KEY_ADMIN = 'nav_isAdmin';
const STORAGE_KEY_SETTER = 'nav_isSetter';
const STORAGE_KEY_USER_ID = 'nav_userId';

// Helper to get stored role
const getStoredRole = (role: 'admin' | 'user' | 'setter', userId: string | undefined): boolean | null => {
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
    
    if (role === 'admin') {
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
    } else if (role === 'setter') {
      let stored = localStorage.getItem(STORAGE_KEY_SETTER);
      if (stored === null) {
        // Fallback to sessionStorage for backward compatibility
        stored = sessionStorage.getItem(STORAGE_KEY_SETTER);
        if (stored !== null) {
          // Migrate to localStorage
          localStorage.setItem(STORAGE_KEY_SETTER, stored);
        }
      }
      return stored === null ? null : stored === 'true';
    }
    
    // For 'user' role, always return true if user exists
    return userId ? true : null;
  } catch {
    return null;
  }
};

// Helper to store role
const storeRole = (role: 'admin' | 'user' | 'setter', value: boolean, userId: string) => {
  try {
    // Store in localStorage (persists across app restarts)
    if (role === 'admin') {
      localStorage.setItem(STORAGE_KEY_ADMIN, String(value));
      // Also set in sessionStorage for backward compatibility
      sessionStorage.setItem(STORAGE_KEY_ADMIN, String(value));
    } else if (role === 'setter') {
      localStorage.setItem(STORAGE_KEY_SETTER, String(value));
      // Also set in sessionStorage for backward compatibility
      sessionStorage.setItem(STORAGE_KEY_SETTER, String(value));
    }
    localStorage.setItem(STORAGE_KEY_USER_ID, userId);
    // Also set in sessionStorage for backward compatibility
    sessionStorage.setItem(STORAGE_KEY_USER_ID, userId);
  } catch {
    // Ignore storage errors
  }
};

// Check role via direct REST on user_roles (avoids has_role RPC overload ambiguity)
const checkRoleOnce = async (
  role: 'admin' | 'user' | 'setter',
  userId: string,
  accessToken: string
): Promise<boolean> => {
  if (role === 'user') return true;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return false;
  try {
    const res = await window.fetch(
      `${url}/rest/v1/user_roles?user_id=eq.${userId}&role=eq.${role}&select=user_id`,
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
      console.error(`[useHasRole] user_roles fetch "${role}" failed:`, res.status, await res.text());
      return false;
    }
    const data = await res.json();
    const hasRole = Array.isArray(data) && data.length > 0;
    storeRole(role, hasRole, userId);
    return hasRole;
  } catch (error) {
    console.error(`[useHasRole] Exception checking role "${role}":`, error);
    return false;
  }
};

export const useHasRole = (role: 'admin' | 'user' | 'setter') => {
  const { user, session } = useAuth();
  const [hasRole, setHasRole] = useState<boolean>(() => {
    return getStoredRole(role, user?.id) ?? false;
  });
  const [loading, setLoading] = useState(false);

  const refreshRoleStatus = useCallback(async () => {
    if (!user?.id) {
      setHasRole(false);
      setLoading(false);
      return;
    }
    const stored = getStoredRole(role, user.id);
    if (stored !== null) {
      setHasRole(stored);
      setLoading(false);
      return;
    }
    if (role !== 'user' && !session?.access_token) {
      setHasRole(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await checkRoleOnce(role, user.id, session?.access_token ?? '');
      setHasRole(result);
    } catch (error) {
      console.error(`[useHasRole] Error refreshing role "${role}":`, error);
      setHasRole(false);
    } finally {
      setLoading(false);
    }
  }, [user?.id, role, session?.access_token]);

  useEffect(() => {
    refreshRoleStatus();
  }, [refreshRoleStatus]);

  // CRITICAL: Also refresh when app becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user?.id) {
        console.log(`[useHasRole] App visible - refreshing role "${role}"`);
        refreshRoleStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user?.id, role, refreshRoleStatus]);

  return { hasRole, loading };
};
