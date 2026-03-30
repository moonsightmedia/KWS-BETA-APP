import { Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useHasRole } from '@/hooks/useHasRole';
import { cn } from '@/lib/utils';

const STORAGE_KEY_ADMIN = 'nav_isAdmin';
const STORAGE_KEY_SETTER = 'nav_isSetter';
const STORAGE_KEY_USER_ID = 'nav_userId';

const getStoredValue = (key: string): boolean | null => {
  try {
    const localValue = localStorage.getItem(key);
    if (localValue !== null) return localValue === 'true';

    const sessionValue = sessionStorage.getItem(key);
    if (sessionValue !== null) {
      localStorage.setItem(key, sessionValue);
      return sessionValue === 'true';
    }
  } catch {
    // Ignore storage access issues.
  }

  return null;
};

const getStoredUserId = (): string | null => {
  try {
    const localValue = localStorage.getItem(STORAGE_KEY_USER_ID);
    if (localValue !== null) return localValue;

    const sessionValue = sessionStorage.getItem(STORAGE_KEY_USER_ID);
    if (sessionValue !== null) {
      localStorage.setItem(STORAGE_KEY_USER_ID, sessionValue);
      return sessionValue;
    }
  } catch {
    // Ignore storage access issues.
  }

  return null;
};

const setStoredValue = (key: string, value: boolean) => {
  try {
    const serialized = String(value);
    localStorage.setItem(key, serialized);
    sessionStorage.setItem(key, serialized);
  } catch {
    // Ignore storage access issues.
  }
};

const setStoredUserId = (userId: string) => {
  try {
    localStorage.setItem(STORAGE_KEY_USER_ID, userId);
    sessionStorage.setItem(STORAGE_KEY_USER_ID, userId);
  } catch {
    // Ignore storage access issues.
  }
};

const getActiveRoleFromPath = (pathname: string): 'user' | 'setter' | 'admin' => {
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/setter')) return 'setter';
  return 'user';
};

export const RoleTabs = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { hasRole: isSetter, loading: setterLoading } = useHasRole('setter');

  useEffect(() => {
    if (!user?.id) return;
    if (adminLoading || setterLoading) return;

    const effectiveSetter = isSetter || isAdmin;
    setStoredUserId(user.id);
    setStoredValue(STORAGE_KEY_ADMIN, isAdmin);
    setStoredValue(STORAGE_KEY_SETTER, effectiveSetter);
  }, [user?.id, isAdmin, isSetter, adminLoading, setterLoading]);

  if (!user) {
    return null;
  }

  const storedUserId = getStoredUserId();
  const storedAdmin = storedUserId === user.id ? (getStoredValue(STORAGE_KEY_ADMIN) ?? false) : false;
  const storedSetter = storedUserId === user.id ? (getStoredValue(STORAGE_KEY_SETTER) ?? false) : false;

  const effectiveIsAdmin = isAdmin || storedAdmin;
  const effectiveIsSetter = effectiveIsAdmin || isSetter || storedSetter;
  const isLoading = adminLoading || setterLoading;

  if (!effectiveIsAdmin && !effectiveIsSetter) {
    return isLoading ? <div className="h-0" /> : null;
  }

  const tabs: Array<{ key: 'user' | 'setter' | 'admin'; label: string; to: string }> = [
    { key: 'user', label: 'User', to: '/' },
  ];

  if (effectiveIsSetter) {
    tabs.push({ key: 'setter', label: 'Setter', to: '/setter' });
  }

  if (effectiveIsAdmin) {
    tabs.push({ key: 'admin', label: 'Admin', to: '/admin' });
  }

  const activeRole = getActiveRoleFromPath(location.pathname);

  return (
    <div className="border-b border-[#E7F7E9] bg-white md:hidden">
      <div className="px-4 py-2 md:pl-0 md:pr-8 w-full">
        <div className="flex bg-[#F9FAF9] p-1 rounded-xl w-full max-w-md mx-auto md:mx-0 border border-[#E7F7E9]">
          {tabs.map((tab) => {
            const isActive = activeRole === tab.key;

            return (
              <Link
                key={tab.key}
                to={tab.to}
                className={cn(
                  'flex-1 py-2 px-3 rounded-xl text-xs font-semibold active:scale-95 transition-all focus:outline-none touch-manipulation text-center no-underline',
                  isActive ? 'bg-[#36B531] text-white shadow-sm' : 'text-[#13112B]/60 hover:text-[#13112B]'
                )}
                style={isActive ? { color: 'white' } : undefined}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};
