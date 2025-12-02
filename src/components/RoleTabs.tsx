import { useLocation, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
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

  // Don't show if user is not logged in
  if (!user) {
    return null;
  }

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

  const handleTabClick = (role: 'user' | 'setter' | 'admin') => {
    setActiveRole(role);
    if (role === 'setter' && stableIsSetter) {
      navigate('/setter');
    } else if (role === 'admin' && stableIsAdmin) {
      navigate('/admin');
    } else if (role === 'user') {
      navigate('/');
    }
  };

  return (
    <div className="bg-[#fafafa] px-4 md:px-6 py-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleTabClick('user')}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-semibold transition-colors",
            activeRole === 'user'
              ? "bg-[#6cb24a] text-white shadow-sm"
              : "bg-white text-[#4a4a4a] hover:bg-[#f5f5f5]"
          )}
        >
          User
        </button>
        
        {stableIsSetter && (
          <button
            onClick={() => handleTabClick('setter')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold transition-colors",
              activeRole === 'setter'
                ? "bg-[#6cb24a] text-white shadow-sm"
                : "bg-white text-[#4a4a4a] hover:bg-[#f5f5f5]"
            )}
          >
            Setter
          </button>
        )}
        
        {stableIsAdmin && (
          <button
            onClick={() => handleTabClick('admin')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold transition-colors",
              activeRole === 'admin'
                ? "bg-[#6cb24a] text-white shadow-sm"
                : "bg-white text-[#4a4a4a] hover:bg-[#f5f5f5]"
            )}
          >
            Admin
          </button>
        )}
      </div>
    </div>
  );
};

