import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// Storage keys (same as in Sidebar and RoleTabs)
const STORAGE_KEY_ADMIN = 'nav_isAdmin';
const STORAGE_KEY_SETTER = 'nav_isSetter';
const STORAGE_KEY_USER_ID = 'nav_userId';

// Helper to get stored role
const getStoredRole = (role: 'admin' | 'user' | 'setter', userId: string | undefined): boolean | null => {
  if (!userId) return null;
  
  try {
    const storedUserId = sessionStorage.getItem(STORAGE_KEY_USER_ID);
    if (storedUserId !== userId) {
      // Different user - return null to trigger check
      return null;
    }
    
    if (role === 'admin') {
      const stored = sessionStorage.getItem(STORAGE_KEY_ADMIN);
      return stored === null ? null : stored === 'true';
    } else if (role === 'setter') {
      const stored = sessionStorage.getItem(STORAGE_KEY_SETTER);
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
    if (role === 'admin') {
      sessionStorage.setItem(STORAGE_KEY_ADMIN, String(value));
    } else if (role === 'setter') {
      sessionStorage.setItem(STORAGE_KEY_SETTER, String(value));
    }
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

  useEffect(() => {
    if (!user) {
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

    // Role not in storage - check once (fallback for edge cases)
    // This should rarely happen if checkAndStoreRoles was called during login
    setLoading(true);
    checkRoleOnce(role, user.id).then(result => {
      setHasRole(result);
      setLoading(false);
    });
  }, [user?.id, role]);

  return { hasRole, loading };
};
