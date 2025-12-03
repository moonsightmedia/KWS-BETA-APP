import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// Storage keys (same as in Sidebar and RoleTabs)
const STORAGE_KEY_ADMIN = 'nav_isAdmin';
const STORAGE_KEY_USER_ID = 'nav_userId';

// Helper to get stored admin status
const getStoredAdmin = (userId: string | undefined): boolean | null => {
  if (!userId) return null;
  
  try {
    const storedUserId = sessionStorage.getItem(STORAGE_KEY_USER_ID);
    if (storedUserId !== userId) {
      // Different user - return null to trigger check
      return null;
    }
    
    const stored = sessionStorage.getItem(STORAGE_KEY_ADMIN);
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
    
    // Store in sessionStorage
    try {
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

  useEffect(() => {
    if (!user) {
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

    // Admin status not in storage - check once (fallback for edge cases)
    // This should rarely happen if checkAndStoreRoles was called during login
    setLoading(true);
    checkAdminOnce(user.id).then(result => {
      setIsAdmin(result);
      setLoading(false);
    });
  }, [user?.id]);

  return { isAdmin, loading };
};
