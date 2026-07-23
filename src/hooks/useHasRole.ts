import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './useAuth';

// Storage keys (same as in Sidebar and RoleTabs)
// CRITICAL: Use localStorage instead of sessionStorage for native apps
const STORAGE_KEY_ADMIN = 'nav_isAdmin';
const STORAGE_KEY_SETTER = 'nav_isSetter';
const STORAGE_KEY_USER_ID = 'nav_userId';

type RoleCheckResult =
  | { status: 'ok'; hasRole: boolean }
  | { status: 'error' };

const getStoredRole = (role: 'admin' | 'user' | 'setter', userId: string | undefined): boolean | null => {
  if (!userId) return null;

  try {
    let storedUserId = localStorage.getItem(STORAGE_KEY_USER_ID);
    if (storedUserId === null) {
      storedUserId = sessionStorage.getItem(STORAGE_KEY_USER_ID);
      if (storedUserId !== null) {
        localStorage.setItem(STORAGE_KEY_USER_ID, storedUserId);
      }
    }

    if (storedUserId !== userId) {
      return null;
    }

    if (role === 'admin') {
      let stored = localStorage.getItem(STORAGE_KEY_ADMIN);
      if (stored === null) {
        stored = sessionStorage.getItem(STORAGE_KEY_ADMIN);
        if (stored !== null) {
          localStorage.setItem(STORAGE_KEY_ADMIN, stored);
        }
      }
      return stored === null ? null : stored === 'true';
    }

    if (role === 'setter') {
      let stored = localStorage.getItem(STORAGE_KEY_SETTER);
      if (stored === null) {
        stored = sessionStorage.getItem(STORAGE_KEY_SETTER);
        if (stored !== null) {
          localStorage.setItem(STORAGE_KEY_SETTER, stored);
        }
      }
      return stored === null ? null : stored === 'true';
    }

    return userId ? true : null;
  } catch {
    return null;
  }
};

const storeRole = (role: 'admin' | 'user' | 'setter', value: boolean, userId: string) => {
  try {
    if (role === 'admin') {
      localStorage.setItem(STORAGE_KEY_ADMIN, String(value));
      sessionStorage.setItem(STORAGE_KEY_ADMIN, String(value));
    } else if (role === 'setter') {
      localStorage.setItem(STORAGE_KEY_SETTER, String(value));
      sessionStorage.setItem(STORAGE_KEY_SETTER, String(value));
    }
    localStorage.setItem(STORAGE_KEY_USER_ID, userId);
    sessionStorage.setItem(STORAGE_KEY_USER_ID, userId);
  } catch {
    // Ignore storage errors
  }
};

/**
 * Returns ok+hasRole on success. On network/HTTP failure returns error
 * so callers can keep the last known role (fail-open).
 */
const checkRoleOnce = async (
  role: 'admin' | 'user' | 'setter',
  userId: string,
  accessToken: string,
): Promise<RoleCheckResult> => {
  if (role === 'user') return { status: 'ok', hasRole: true };

  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !accessToken) {
    return { status: 'error' };
  }

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
      },
    );

    if (!res.ok) {
      console.error(`[useHasRole] user_roles fetch "${role}" failed:`, res.status, await res.text());
      return { status: 'error' };
    }

    const data = await res.json();
    const hasRole = Array.isArray(data) && data.length > 0;
    storeRole(role, hasRole, userId);
    return { status: 'ok', hasRole };
  } catch (error) {
    console.error(`[useHasRole] Exception checking role "${role}":`, error);
    return { status: 'error' };
  }
};

export const useHasRole = (role: 'admin' | 'user' | 'setter') => {
  const { user, session } = useAuth();
  const initialStored = getStoredRole(role, user?.id);
  const [hasRole, setHasRole] = useState<boolean>(() => initialStored ?? false);
  // Unknown role → show loading instead of flashing "Kein Zugriff"
  const [loading, setLoading] = useState(() => initialStored === null && Boolean(user?.id));

  const refreshRoleStatus = useCallback(async () => {
    if (!user?.id) {
      setHasRole(false);
      setLoading(false);
      return;
    }

    const stored = getStoredRole(role, user.id);
    if (stored !== null) {
      setHasRole(stored);
    }

    if (role === 'user') {
      setHasRole(true);
      setLoading(false);
      return;
    }

    if (!session?.access_token) {
      // Keep last known role while token is briefly missing
      setHasRole(stored ?? false);
      setLoading(stored === null);
      return;
    }

    // Avoid full-screen loading flicker when we already know the role
    if (stored === null) {
      setLoading(true);
    }

    try {
      const result = await checkRoleOnce(role, user.id, session.access_token);
      if (result.status === 'ok') {
        setHasRole(result.hasRole);
      } else {
        // Fail-open: keep stored / current value, never force false on transport errors
        console.warn(`[useHasRole] Keeping previous "${role}" role after check failure`);
        if (stored !== null) {
          setHasRole(stored);
        }
      }
    } catch (error) {
      console.error(`[useHasRole] Error refreshing role "${role}":`, error);
      if (stored !== null) {
        setHasRole(stored);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id, role, session?.access_token]);

  useEffect(() => {
    refreshRoleStatus();
  }, [refreshRoleStatus]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user?.id) {
        refreshRoleStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user?.id, refreshRoleStatus]);

  return { hasRole, loading };
};
