import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useHasRole } from '@/hooks/useHasRole';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import { useRoleTab } from '@/contexts/RoleTabContext';

// Simple storage helpers (same as in Sidebar)
// CRITICAL: Use localStorage instead of sessionStorage for native apps
// sessionStorage is cleared when app is closed, localStorage persists
const STORAGE_KEY_ADMIN = 'nav_isAdmin';
const STORAGE_KEY_SETTER = 'nav_isSetter';
const STORAGE_KEY_USER_ID = 'nav_userId';

const getStoredValue = (key: string): boolean | null => {
  try {
    // Try localStorage first (persists across app restarts)
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      return stored === 'true';
    }
    // Fallback to sessionStorage for backward compatibility
    const sessionStored = sessionStorage.getItem(key);
    if (sessionStored !== null) {
      // Migrate to localStorage
      localStorage.setItem(key, sessionStored);
      return sessionStored === 'true';
    }
    return null;
  } catch {
    return null;
  }
};

const getStoredUserId = (): string | null => {
  try {
    // Try localStorage first (persists across app restarts)
    const stored = localStorage.getItem(STORAGE_KEY_USER_ID);
    if (stored !== null) {
      return stored;
    }
    // Fallback to sessionStorage for backward compatibility
    const sessionStored = sessionStorage.getItem(STORAGE_KEY_USER_ID);
    if (sessionStored !== null) {
      // Migrate to localStorage
      localStorage.setItem(STORAGE_KEY_USER_ID, sessionStored);
      return sessionStored;
    }
    return null;
  } catch {
    return null;
  }
};

const setStoredValue = (key: string, value: boolean): void => {
  try {
    localStorage.setItem(key, String(value));
    // Also set in sessionStorage for backward compatibility
    sessionStorage.setItem(key, String(value));
  } catch {
    // Ignore
  }
};

const setStoredUserId = (userId: string): void => {
  try {
    localStorage.setItem(STORAGE_KEY_USER_ID, userId);
    // Also set in sessionStorage for backward compatibility
    sessionStorage.setItem(STORAGE_KEY_USER_ID, userId);
  } catch {
    // Ignore
  }
};

export const RoleTabs = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { hasRole: isSetter, loading: setterLoading } = useHasRole('setter');
  const { activeRole, setActiveRole } = useRoleTab();

  // Read roles directly from sessionStorage on every render to get latest values
  const getCurrentRolesFromStorage = () => {
    if (!user?.id) return { admin: false, setter: false };
    const storedUserId = getStoredUserId();
    if (storedUserId !== user.id) return { admin: false, setter: false };
    const storedAdmin = getStoredValue(STORAGE_KEY_ADMIN);
    const storedSetter = getStoredValue(STORAGE_KEY_SETTER);
    return {
      admin: storedAdmin ?? false,
      setter: storedSetter ?? false,
    };
  };

  // Stable role state - read from storage initially and update when storage changes
  const [stableIsAdmin, setStableIsAdmin] = useState<boolean>(() => {
    const roles = getCurrentRolesFromStorage();
    return roles.admin;
  });

  const [stableIsSetter, setStableIsSetter] = useState<boolean>(() => {
    const roles = getCurrentRolesFromStorage();
    return roles.setter;
  });

  const lastUserIdRef = useRef<string | undefined>(undefined);
  const rolesInitializedRef = useRef(false);

  // Initialize roles once when user is available and hooks finish loading
  useEffect(() => {
    const currentUserId = user?.id;

    if (currentUserId !== lastUserIdRef.current) {
      const previousUserId = lastUserIdRef.current;
      lastUserIdRef.current = currentUserId;
      rolesInitializedRef.current = false;

      if (currentUserId) {
        const storedUserId = getStoredUserId();
        const storedAdmin = getStoredValue(STORAGE_KEY_ADMIN);
        const storedSetter = getStoredValue(STORAGE_KEY_SETTER);
        
        if (storedUserId !== null && storedUserId !== currentUserId) {
          setStableIsAdmin(false);
          setStableIsSetter(false);
        } else if (storedUserId === currentUserId) {
          if (storedAdmin !== null) setStableIsAdmin(storedAdmin);
          if (storedSetter !== null) setStableIsSetter(storedSetter);
        } else {
          if (storedAdmin !== null) setStableIsAdmin(storedAdmin);
          if (storedSetter !== null) setStableIsSetter(storedSetter);
          setStoredUserId(currentUserId);
        }
      } else {
        if (previousUserId !== undefined) {
          setStableIsAdmin(false);
          setStableIsSetter(false);
        }
      }
    }

    // Always check sessionStorage first - it's the source of truth after login
    // This ensures we pick up roles immediately after they're stored
    if (currentUserId) {
      const storedUserId = getStoredUserId();
      if (storedUserId === currentUserId) {
        const storedAdmin = getStoredValue(STORAGE_KEY_ADMIN);
        const storedSetter = getStoredValue(STORAGE_KEY_SETTER);
        // Update immediately if values are available in storage
        if (storedAdmin !== null && storedAdmin !== stableIsAdmin) {
          setStableIsAdmin(storedAdmin);
        }
        if (storedSetter !== null && storedSetter !== stableIsSetter) {
          setStableIsSetter(storedSetter);
        }
      }
    }

    // CRITICAL: Update stable roles when hooks finish loading
    // This ensures roles are always synced with the database, even after reload
    if (currentUserId && !adminLoading && !setterLoading) {
      const effectiveSetter = isSetter || isAdmin;
      const adminChanged = stableIsAdmin !== isAdmin;
      const setterChanged = stableIsSetter !== effectiveSetter;
      
      // Always update if hooks have finished loading, even if values haven't changed
      // This ensures roles are properly set after reload
      if (adminChanged || setterChanged || !rolesInitializedRef.current) {
        console.log('[RoleTabs] Updating roles from hooks:', { 
          isAdmin, 
          effectiveSetter, 
          adminChanged, 
          setterChanged,
          firstInit: !rolesInitializedRef.current
        });
        
        setStableIsAdmin(isAdmin);
        setStoredValue(STORAGE_KEY_ADMIN, isAdmin);
        setStableIsSetter(effectiveSetter);
        setStoredValue(STORAGE_KEY_SETTER, effectiveSetter);
        if (currentUserId) {
          setStoredUserId(currentUserId);
        }
        rolesInitializedRef.current = true;
      }
    }
  }, [user?.id, isAdmin, isSetter, adminLoading, setterLoading, stableIsAdmin, stableIsSetter]);

  // CRITICAL: Listen for visibility changes to refresh roles when app becomes visible
  useEffect(() => {
    if (!user?.id) return;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[RoleTabs] App visible - refreshing roles from sessionStorage');
        // Read roles directly from sessionStorage when app becomes visible
        const storedUserId = getStoredUserId();
        if (storedUserId === user.id) {
          const storedAdmin = getStoredValue(STORAGE_KEY_ADMIN);
          const storedSetter = getStoredValue(STORAGE_KEY_SETTER);
          
          if (storedAdmin !== null && storedAdmin !== stableIsAdmin) {
            console.log('[RoleTabs] Updating admin role from storage:', storedAdmin);
            setStableIsAdmin(storedAdmin);
          }
          if (storedSetter !== null && storedSetter !== stableIsSetter) {
            console.log('[RoleTabs] Updating setter role from storage:', storedSetter);
            setStableIsSetter(storedSetter);
          }
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user?.id, stableIsAdmin, stableIsSetter]);

  // Poll sessionStorage periodically to catch roles that are stored after component mount
  // This handles the race condition where checkAndStoreRoles completes after initial render
  useEffect(() => {
    if (!user?.id) return;
    
    const intervalId = setInterval(() => {
      const storedUserId = getStoredUserId();
      if (storedUserId === user.id) {
        const storedAdmin = getStoredValue(STORAGE_KEY_ADMIN);
        const storedSetter = getStoredValue(STORAGE_KEY_SETTER);
        
        if (storedAdmin !== null && storedAdmin !== stableIsAdmin) {
          setStableIsAdmin(storedAdmin);
        }
        if (storedSetter !== null && storedSetter !== stableIsSetter) {
          setStableIsSetter(storedSetter);
        }
        
        // Stop polling once we have both roles or hooks finish loading
        if ((storedAdmin !== null && storedSetter !== null) || (!adminLoading && !setterLoading)) {
          clearInterval(intervalId);
        }
      }
    }, 100); // Check every 100ms
    
    // Stop polling after 5 seconds max
    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
    }, 5000);
    
    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [user?.id, stableIsAdmin, stableIsSetter, adminLoading, setterLoading]);

  // Sync activeRole with route changes
  useEffect(() => {
    if (location.pathname === '/setter') {
      setActiveRole('setter');
    } else if (location.pathname === '/admin') {
      setActiveRole('admin');
    } else {
      setActiveRole('user');
    }
  }, [location.pathname, setActiveRole]);

  // Don't show if user is not logged in
  if (!user) {
    return null;
  }

  // Get default path for each group
  const getDefaultPathForGroup = (group: 'user' | 'setter' | 'admin'): string => {
    // Always return the correct path based on the group, regardless of role loading state
    // The route guards will handle access control
    if (group === 'setter') return '/setter';
    if (group === 'admin') return '/admin';
    return '/';
  };

  // Always read roles directly from sessionStorage on render to get latest values
  // This ensures we show the tabs immediately after login when roles are stored
  const currentRoles = getCurrentRolesFromStorage();
  const effectiveIsAdmin = currentRoles.admin || stableIsAdmin;
  const effectiveIsSetter = currentRoles.setter || stableIsSetter;

  // Build tabs based on roles:
  // - If admin: show all three (User, Setter, Admin)
  // - If setter (but not admin): show User and Setter tabs
  // - If only user: show nothing (return null)
  const tabs: Array<{ key: 'user' | 'setter' | 'admin'; label: string }> = [];
  
  if (effectiveIsAdmin) {
    // Admin sees all three tabs
    tabs.push(
      { key: 'user' as const, label: 'User' },
      { key: 'setter' as const, label: 'Setter' },
      { key: 'admin' as const, label: 'Admin' }
    );
  } else if (effectiveIsSetter) {
    // Setter (but not admin) sees User and Setter tabs
    tabs.push(
      { key: 'user' as const, label: 'User' },
      { key: 'setter' as const, label: 'Setter' }
    );
  } else {
    // Only user role - no tabs to show
    // But: If hooks are still loading, don't return null yet (wait for them to finish)
    if (adminLoading || setterLoading) {
      // Still loading - return empty div to prevent layout shift
      return <div className="h-0" />;
    }
    return null;
  }

  return (
    <div className="border-b border-[#E7F7E9] bg-white md:hidden">
      <div className="px-4 py-2 md:pl-0 md:pr-8 w-full">
        <div className="flex bg-[#F9FAF9] p-1 rounded-xl w-full max-w-md mx-auto md:mx-0 border border-[#E7F7E9]">
          {tabs.map((t) => {
            const to = getDefaultPathForGroup(t.key);
            const isActive = activeRole === t.key;
            return (
              <Link
                key={t.key}
                to={to}
                className={cn(
                  'flex-1 py-2 px-3 rounded-[8px] text-xs font-semibold active:scale-95 transition-all focus:outline-none touch-manipulation text-center no-underline',
                  isActive ? 'bg-[#36B531] text-white shadow-sm' : 'text-[#13112B]/60 hover:text-[#13112B]'
                )}
                style={isActive ? { color: 'white' } : undefined}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

