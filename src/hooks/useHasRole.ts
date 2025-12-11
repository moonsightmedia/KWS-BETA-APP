import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

// Check role once and store it
const checkRoleOnce = async (role: 'admin' | 'user' | 'setter', userId: string): Promise<boolean> => {
  try {
    if (role === 'user') {
      // User role is always true if user exists
      return true;
    }
    
    const { data, error } = await supabase.rpc('has_role', { _user_id: userId, _role: role });
    
    if (error) {
      console.error(`[useHasRole] Error checking role "${role}":`, error);
      return false;
    }
    
    const hasRole = !!data;
    storeRole(role, hasRole, userId);
    return hasRole;
  } catch (error) {
    console.error(`[useHasRole] Exception checking role "${role}":`, error);
    return false;
  }
};

export const useHasRole = (role: 'admin' | 'user' | 'setter') => {
  const { user } = useAuth();
  const [hasRole, setHasRole] = useState<boolean>(() => {
    // Initial: Read from sessionStorage
    return getStoredRole(role, user?.id) ?? false;
  });
  const [loading, setLoading] = useState(false);

  // Function to refresh role status
  const refreshRoleStatus = useCallback(async () => {
    if (!user?.id) {
      setHasRole(false);
      setLoading(false);
      return;
    }

    // Check if role is already in sessionStorage
    const stored = getStoredRole(role, user.id);
    if (stored !== null) {
      // Role found in storage - use it
      setHasRole(stored);
      setLoading(false);
      return;
    }

    // Role not in storage - check once
    setLoading(true);
    try {
      const result = await checkRoleOnce(role, user.id);
      setHasRole(result);
    } catch (error) {
      console.error(`[useHasRole] Error refreshing role "${role}":`, error);
      setHasRole(false);
    } finally {
      setLoading(false);
    }
  }, [user?.id, role]);

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
