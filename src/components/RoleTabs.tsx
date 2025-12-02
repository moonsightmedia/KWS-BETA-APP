import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useHasRole } from '@/hooks/useHasRole';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import { useRoleTab } from '@/contexts/RoleTabContext';

// Simple storage helpers (same as in Sidebar)
const STORAGE_KEY_ADMIN = 'nav_isAdmin';
const STORAGE_KEY_SETTER = 'nav_isSetter';
const STORAGE_KEY_USER_ID = 'nav_userId';

const getStoredValue = (key: string): boolean | null => {
  try {
    const stored = sessionStorage.getItem(key);
    return stored === null ? null : stored === 'true';
  } catch {
    return null;
  }
};

const getStoredUserId = (): string | null => {
  try {
    return sessionStorage.getItem(STORAGE_KEY_USER_ID);
  } catch {
    return null;
  }
};

export const RoleTabs = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { hasRole: isSetter, loading: setterLoading } = useHasRole('setter');
  const { activeRole, setActiveRole } = useRoleTab();

  // Stable role state - same logic as Sidebar
  const [stableIsAdmin, setStableIsAdmin] = useState<boolean>(() => {
    const storedAdmin = getStoredValue(STORAGE_KEY_ADMIN);
    return storedAdmin ?? false;
  });

  const [stableIsSetter, setStableIsSetter] = useState<boolean>(() => {
    const storedSetter = getStoredValue(STORAGE_KEY_SETTER);
    return storedSetter ?? false;
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
          sessionStorage.setItem(STORAGE_KEY_USER_ID, currentUserId);
        }
      } else {
        if (previousUserId !== undefined) {
          setStableIsAdmin(false);
          setStableIsSetter(false);
        }
      }
    }

    // Update stable roles when hooks finish loading
    if (currentUserId && !adminLoading && !setterLoading) {
      const effectiveSetter = isSetter || isAdmin;
      const adminChanged = stableIsAdmin !== isAdmin;
      const setterChanged = stableIsSetter !== effectiveSetter;
      
      if (adminChanged || setterChanged || !rolesInitializedRef.current) {
        setStableIsAdmin(isAdmin);
        sessionStorage.setItem(STORAGE_KEY_ADMIN, String(isAdmin));
        setStableIsSetter(effectiveSetter);
        sessionStorage.setItem(STORAGE_KEY_SETTER, String(effectiveSetter));
        if (currentUserId) {
          sessionStorage.setItem(STORAGE_KEY_USER_ID, currentUserId);
        }
        rolesInitializedRef.current = true;
      }
    }
  }, [user?.id, isAdmin, isSetter, adminLoading, setterLoading, stableIsAdmin, stableIsSetter]);

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
    if (group === 'setter' && stableIsSetter) return '/setter';
    if (group === 'admin' && stableIsAdmin) return '/admin';
    return '/';
  };

  const tabs = [
    { key: 'user' as const, label: 'User' },
    ...(stableIsSetter ? [{ key: 'setter' as const, label: 'Setter' }] : []),
    ...(stableIsAdmin ? [{ key: 'admin' as const, label: 'Admin' }] : []),
  ];

  return (
    <div className="lg:hidden border-b border-[#E7F7E9] bg-white/50 backdrop-blur-sm">
      <div className="px-4 py-2 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex bg-[#F9FAF9] p-1 rounded-xl w-full max-w-md mx-auto lg:mx-0 border border-[#E7F7E9]">
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

