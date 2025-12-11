import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

// Check admin status once and store it
const checkAdminOnce = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
    
    if (error) {
      console.error('[useIsAdmin] Error checking admin status:', error);
      return false;
    }
    
    const isAdmin = !!data;
    
    // Store in localStorage (persists across app restarts)
    try {
      localStorage.setItem(STORAGE_KEY_ADMIN, String(isAdmin));
      localStorage.setItem(STORAGE_KEY_USER_ID, userId);
      // Also set in sessionStorage for backward compatibility
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
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    // Initial: Read from sessionStorage
    return getStoredAdmin(user?.id) ?? false;
  });
  const [loading, setLoading] = useState(false);

  // Function to refresh admin status
  const refreshAdminStatus = useCallback(async () => {
    if (!user?.id) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    // Check if admin status is already in sessionStorage
    const stored = getStoredAdmin(user.id);
    if (stored !== null) {
      // Admin status found in storage - use it
      setIsAdmin(stored);
      setLoading(false);
      return;
    }

    // Admin status not in storage - check once
    setLoading(true);
    try {
      const result = await checkAdminOnce(user.id);
      setIsAdmin(result);
    } catch (error) {
      console.error('[useIsAdmin] Error refreshing admin status:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

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
