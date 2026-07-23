import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './useAuth';

const STORAGE_KEY_ADMIN = 'nav_isAdmin';
const STORAGE_KEY_USER_ID = 'nav_userId';

type AdminCheckResult =
  | { status: 'ok'; isAdmin: boolean }
  | { status: 'error' };

const getStoredAdmin = (userId: string | undefined): boolean | null => {
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

    let stored = localStorage.getItem(STORAGE_KEY_ADMIN);
    if (stored === null) {
      stored = sessionStorage.getItem(STORAGE_KEY_ADMIN);
      if (stored !== null) {
        localStorage.setItem(STORAGE_KEY_ADMIN, stored);
      }
    }
    return stored === null ? null : stored === 'true';
  } catch {
    return null;
  }
};

const storeAdmin = (value: boolean, userId: string) => {
  try {
    localStorage.setItem(STORAGE_KEY_ADMIN, String(value));
    localStorage.setItem(STORAGE_KEY_USER_ID, userId);
    sessionStorage.setItem(STORAGE_KEY_ADMIN, String(value));
    sessionStorage.setItem(STORAGE_KEY_USER_ID, userId);
  } catch {
    // ignore
  }
};

const checkAdminOnce = async (
  userId: string,
  accessToken: string,
): Promise<AdminCheckResult> => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !accessToken) {
    return { status: 'error' };
  }

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
      },
    );

    if (!res.ok) {
      console.error('[useIsAdmin] user_roles fetch failed:', res.status, await res.text());
      return { status: 'error' };
    }

    const data = await res.json();
    const isAdmin = Array.isArray(data) && data.length > 0;
    storeAdmin(isAdmin, userId);
    return { status: 'ok', isAdmin };
  } catch (error) {
    console.error('[useIsAdmin] Exception checking admin status:', error);
    return { status: 'error' };
  }
};

export const useIsAdmin = () => {
  const { user, session } = useAuth();
  const initialStored = getStoredAdmin(user?.id);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => initialStored ?? false);
  const [loading, setLoading] = useState(() => initialStored === null && Boolean(user?.id));

  const refreshAdminStatus = useCallback(async () => {
    if (!user?.id) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const stored = getStoredAdmin(user.id);
    if (stored !== null) {
      setIsAdmin(stored);
    }

    const accessToken = session?.access_token;
    if (!accessToken) {
      setIsAdmin(stored ?? false);
      setLoading(stored === null);
      return;
    }

    if (stored === null) {
      setLoading(true);
    }

    try {
      const result = await checkAdminOnce(user.id, accessToken);
      if (result.status === 'ok') {
        setIsAdmin(result.isAdmin);
      } else {
        console.warn('[useIsAdmin] Keeping previous admin status after check failure');
        if (stored !== null) {
          setIsAdmin(stored);
        }
      }
    } catch (error) {
      console.error('[useIsAdmin] Error refreshing admin status:', error);
      if (stored !== null) {
        setIsAdmin(stored);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id, session?.access_token]);

  useEffect(() => {
    refreshAdminStatus();
  }, [refreshAdminStatus]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user?.id) {
        refreshAdminStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user?.id, refreshAdminStatus]);

  return { isAdmin, loading };
};
