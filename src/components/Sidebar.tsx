import {
  LayoutDashboard,
  List,
  ChevronRight,
  ChevronLeft,
  User,
  Settings,
  Shield,
  Edit3,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  FileText,
  MessageSquare,
  Plus,
  Users,
} from 'lucide-react';
import { ProfileMenu } from '@/components/ProfileMenu';
import { cn } from '@/lib/utils';
import { AccountAvatar } from '@/components/AccountAvatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useHasRole } from '@/hooks/useHasRole';
import { useSidebar } from './SidebarContext';

interface SidebarProps {
  className?: string;
}

// Simple storage keys
const STORAGE_KEY_ADMIN = 'nav_isAdmin';
const STORAGE_KEY_SETTER = 'nav_isSetter';
const STORAGE_KEY_USER_ID = 'nav_userId';

// Simple storage helpers
// CRITICAL: Use localStorage instead of sessionStorage for native apps
// sessionStorage is cleared when app is closed, localStorage persists
const getStoredValue = (key: string): boolean | null => {
  try {
    // Try localStorage first (persists across app restarts)
    let stored = localStorage.getItem(key);
    if (stored === null) {
      // Fallback to sessionStorage for backward compatibility
      stored = sessionStorage.getItem(key);
      if (stored !== null) {
        // Migrate to localStorage
        localStorage.setItem(key, stored);
      }
    }
    return stored === null ? null : stored === 'true';
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

const getStoredUserId = (): string | null => {
  try {
    // Try localStorage first (persists across app restarts)
    let stored = localStorage.getItem(STORAGE_KEY_USER_ID);
    if (stored === null) {
      // Fallback to sessionStorage for backward compatibility
      stored = sessionStorage.getItem(STORAGE_KEY_USER_ID);
      if (stored !== null) {
        // Migrate to localStorage
        localStorage.setItem(STORAGE_KEY_USER_ID, stored);
      }
    }
    return stored;
  } catch {
    return null;
  }
};

const setStoredUserId = (userId: string | null): void => {
  try {
    if (userId) {
      localStorage.setItem(STORAGE_KEY_USER_ID, userId);
      sessionStorage.setItem(STORAGE_KEY_USER_ID, userId);
    } else {
      localStorage.removeItem(STORAGE_KEY_USER_ID);
      sessionStorage.removeItem(STORAGE_KEY_USER_ID);
    }
  } catch {
    // Ignore
  }
};

const clearStoredRoles = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY_ADMIN);
    localStorage.removeItem(STORAGE_KEY_SETTER);
    localStorage.removeItem(STORAGE_KEY_USER_ID);
    sessionStorage.removeItem(STORAGE_KEY_ADMIN);
    sessionStorage.removeItem(STORAGE_KEY_SETTER);
    sessionStorage.removeItem(STORAGE_KEY_USER_ID);
  } catch {
    // Ignore
  }
};

export const Sidebar = ({ className }: SidebarProps) => {
  const { isExpanded, setIsExpanded } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { hasRole: isSetter, loading: setterLoading } = useHasRole('setter');
  const [isMobileNavCompact, setIsMobileNavCompact] = useState(false);

  useEffect(() => {
    let animationFrame: number | null = null;

    const updateMobileNav = () => {
      if (animationFrame !== null) {
        return;
      }

      animationFrame = window.requestAnimationFrame(() => {
        const scrollOffset = Math.max(
          window.scrollY,
          document.documentElement.scrollTop,
          document.body.scrollTop
        );

        setIsMobileNavCompact(scrollOffset > 24);
        animationFrame = null;
      });
    };

    updateMobileNav();
    window.addEventListener('scroll', updateMobileNav, { passive: true });
    document.addEventListener('scroll', updateMobileNav, { passive: true, capture: true });

    return () => {
      window.removeEventListener('scroll', updateMobileNav);
      document.removeEventListener('scroll', updateMobileNav, true);
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [location.pathname, location.search]);

  const navigateToArea = useCallback((path: string) => {
    if (location.pathname + location.search === path) {
      return;
    }
    navigate(path);
  }, [location.pathname, location.search, navigate]);

  // Memoize toggle function to prevent unnecessary re-renders
  const toggleExpanded = useCallback(() => {
    setIsExpanded(!isExpanded);
  }, [isExpanded, setIsExpanded]);

  // Stable role state - initialized from sessionStorage immediately (even before user loads)
  // This ensures roles persist across page refreshes
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

    // User changed - check if we need to reset or load stored values
    if (currentUserId !== lastUserIdRef.current) {
      const previousUserId = lastUserIdRef.current;
      console.log('[Sidebar] User changed:', { previousUserId, currentUserId });
      lastUserIdRef.current = currentUserId;
      rolesInitializedRef.current = false;

      if (currentUserId) {
        // New user logged in - check if we have stored values for this user
        const storedUserId = getStoredUserId();
        const storedAdmin = getStoredValue(STORAGE_KEY_ADMIN);
        const storedSetter = getStoredValue(STORAGE_KEY_SETTER);
        console.log('[Sidebar] Checking stored values:', { storedUserId, currentUserId, storedAdmin, storedSetter, previousUserId });
        
        // Only reset if we have a storedUserId that doesn't match
        // If storedUserId is null, it means this is the first time or a refresh - keep stored values
        if (storedUserId !== null && storedUserId !== currentUserId) {
          // Different user - reset to false
          console.log('[Sidebar] Different user detected, resetting');
          setStableIsAdmin(false);
          setStableIsSetter(false);
          clearStoredRoles();
        } else if (storedUserId === currentUserId) {
          // Same user - ensure stored values are loaded (even if they're false)
          console.log('[Sidebar] Same user detected, ensuring stored values are loaded');
          if (storedAdmin !== null) {
            setStableIsAdmin(storedAdmin);
          }
          if (storedSetter !== null) {
            setStableIsSetter(storedSetter);
          }
        } else {
          // No storedUserId yet (first time or refresh) - load values from sessionStorage
          // This handles the case where sessionStorage has values but no userId stored
          console.log('[Sidebar] No stored userId yet (refresh scenario), loading from sessionStorage');
          if (storedAdmin !== null) {
            setStableIsAdmin(storedAdmin);
          }
          if (storedSetter !== null) {
            setStableIsSetter(storedSetter);
          }
          // Set the userId now so we know it's for this user
          setStoredUserId(currentUserId);
        }
      } else {
        // User logged out - clear everything
        if (previousUserId !== undefined) {
          console.log('[Sidebar] User logged out, clearing');
          setStableIsAdmin(false);
          setStableIsSetter(false);
          clearStoredRoles();
        }
      }
    }

    // Update stable roles when hooks finish loading
    // CRITICAL: Always trust the hooks when they finish loading - they are the source of truth
    // IMPORTANT: Update roles whenever hooks change, not just once, to handle race conditions
    if (currentUserId && !adminLoading && !setterLoading) {
      // Admin users also have setter access
      const effectiveSetter = isSetter || isAdmin;

      // Only update if values have changed to avoid unnecessary re-renders
      const adminChanged = stableIsAdmin !== isAdmin;
      const setterChanged = stableIsSetter !== effectiveSetter;
      
      if (adminChanged || setterChanged || !rolesInitializedRef.current) {
        console.log('[Sidebar] Hooks finished loading, updating roles:', { 
          isAdmin, 
          isSetter, 
          effectiveSetter,
          currentStableAdmin: stableIsAdmin,
          currentStableSetter: stableIsSetter,
          willSetAdmin: isAdmin,
          willSetSetter: effectiveSetter,
          adminChanged,
          setterChanged,
          firstInit: !rolesInitializedRef.current
        });

        // Always update based on hook results - hooks are the source of truth
        // This ensures that if roles change in the database, the UI reflects it immediately
        console.log('[Sidebar] Setting roles:', { 
          admin: isAdmin, 
          setter: effectiveSetter,
          reason: isAdmin ? 'User is admin' : (isSetter ? 'User is setter' : 'User has no special roles')
        });
        
        setStableIsAdmin(isAdmin);
        setStoredValue(STORAGE_KEY_ADMIN, isAdmin);

        setStableIsSetter(effectiveSetter);
        setStoredValue(STORAGE_KEY_SETTER, effectiveSetter);

        setStoredUserId(currentUserId);

        rolesInitializedRef.current = true;
        
        console.log('[Sidebar] Roles updated successfully:', { 
          stableIsAdmin: isAdmin, 
          stableIsSetter: effectiveSetter 
        });
      }
    }
  }, [user?.id, isAdmin, isSetter, adminLoading, setterLoading, stableIsAdmin, stableIsSetter]);

  // Compute desktop navigation groups - always stable, never changes during navigation
  const desktopNavGroups = useMemo(() => [
    {
      title: 'Hauptnavigation',
      items: [
        { icon: LayoutDashboard, label: 'Home', path: '/' },
        { icon: List, label: 'Boulder', path: '/boulders' },
        { icon: BarChart3, label: 'Statistiken', path: '/statistics' },
      ],
      visible: true,
    },
  ], []);

  const homePath = user ? '/' : '/guest';
  const isSetterArea = location.pathname === '/setter' || location.pathname.startsWith('/setter/');
  const isAdminArea = location.pathname === '/admin';

  const mobileNavItems = useMemo(() => {
    if (!user) {
      return [
        { icon: List, label: 'Boulder', path: '/guest' },
        { icon: User, label: 'Anmelden', path: '/auth' },
      ];
    }

    if (isSetterArea && stableIsSetter) {
      return [
        { icon: Plus, label: 'Erstellen', path: '/setter/create' },
        { icon: Edit3, label: 'Bearbeiten', path: '/setter/edit' },
        { icon: CheckCircle2, label: 'Status', path: '/setter/status' },
        { icon: CalendarDays, label: 'Planung', path: '/setter/schedule' },
      ];
    }

    if (isAdminArea && stableIsAdmin) {
      return [
        { icon: Users, label: 'Benutzer', path: '/admin?tab=users' },
        { icon: Settings, label: 'Settings', path: '/admin?tab=settings' },
        { icon: MessageSquare, label: 'Feedback', path: '/admin?tab=feedback' },
        { icon: FileText, label: 'Logs', path: '/admin?tab=logs' },
        { icon: Shield, label: 'Tests', path: '/admin?tab=tests' },
      ];
    }

    return [
      { icon: LayoutDashboard, label: 'Home', path: homePath },
      { icon: List, label: 'Boulder', path: '/boulders' },
      { icon: BarChart3, label: 'Statistiken', path: '/statistics' },
    ];
  }, [homePath, isAdminArea, isSetterArea, stableIsAdmin, stableIsSetter, user]);

  const accountLabel = stableIsAdmin ? 'Administrator' : stableIsSetter ? 'Setter' : 'Mitglied';

  return (
    <>
      {/* Desktop Sidebar */}
      {user ? (
      <aside id="desktop-navigation" data-expanded={isExpanded} className={cn(
        "kws-sidebar fixed left-0 top-0 z-40 hidden h-dvh flex-col overflow-hidden border-r border-border/60 bg-sidebar-bg py-5 text-foreground md:flex",
        isExpanded ? "w-64" : "w-20",
        className
      )}>
        {/* Brand */}
        <div className="mb-8 flex h-14 w-full shrink-0 items-center gap-3 overflow-hidden px-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-white">
            <img
              src="/080616_Kletterwelt-Sauerland_Logo_ohne_Hintergrund_ohne_Schrift.png"
              alt={isExpanded ? '' : 'Kletterwelt Sauerland'}
              className="h-full w-full object-cover"
            />
          </div>
            <div className="kws-sidebar-label min-w-0" aria-hidden={!isExpanded}>
              <p className="truncate font-heading text-[1.35rem] font-semibold leading-none tracking-[0.01em] text-foreground">
                Kletterwelt
              </p>
              <p className="mt-1 truncate font-sans text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Sauerland · Beta App
              </p>
            </div>
        </div>

        {/* Navigation */}
        <TooltipProvider delayDuration={300}>
          <nav aria-label="Hauptnavigation" className="flex min-h-0 w-full flex-1 flex-col gap-6 overflow-x-hidden overflow-y-auto px-3">
            {desktopNavGroups.map((group) => {
              if (!group.visible) return null;
              
              return (
                <div key={group.title} className="flex flex-col gap-2">
                  <div className="flex flex-col gap-1">
                    {group.items.map((item) => {
                      // Determine active state based on pathname and query params
                      const searchParams = new URLSearchParams(location.search);
                      let isActive = false;
                      
                      if (item.path.startsWith('/setter')) {
                        const itemView = item.path.split('?view=')[1];
                        isActive = location.pathname === '/setter' && searchParams.get('view') === itemView;
                      } else if (item.path.startsWith('/admin')) {
                        const itemTab = item.path.split('?tab=')[1];
                        const currentTab = searchParams.get('tab') || 'users';
                        isActive = location.pathname === '/admin' && itemTab === currentTab;
                      } else {
                        isActive = location.pathname === item.path;
                      }
                      
                      return (
                        <Tooltip key={item.label}>
                          <TooltipTrigger asChild>
                              <NavLink
                                to={item.path}
                                aria-label={item.label}
                                className={cn(
                                  "relative flex h-11 items-center overflow-hidden rounded-kws-control font-sans outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/70",
                                  isActive
                                    ? "bg-primary/10 font-semibold text-foreground before:absolute before:bottom-2 before:left-0 before:top-2 before:w-0.5 before:rounded-full before:bg-primary"
                                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                                )}
                              >
                                <div className={cn('grid h-11 w-14 shrink-0 place-items-center', isActive && 'text-primary')}>
                                  <item.icon className="w-5 h-5" />
                                </div>
                                <span className="kws-sidebar-label whitespace-nowrap text-sm" aria-hidden={!isExpanded}>{item.label}</span>
                              </NavLink>
                          </TooltipTrigger>
                          {!isExpanded && (
                            <TooltipContent side="right">
                              <p>{item.label}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </TooltipProvider>

        {/* Account and sidebar controls */}
        <div className="mt-auto w-full shrink-0 px-3 pt-3">
          <button
            type="button"
            onClick={toggleExpanded}
            aria-expanded={isExpanded}
            aria-controls="desktop-navigation"
            aria-label={isExpanded ? 'Navigation einklappen' : 'Navigation ausklappen'}
            className="mb-3 flex h-11 w-full items-center overflow-hidden rounded-kws-control font-sans text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/70"
          >
            <span className="grid h-11 w-14 shrink-0 place-items-center" aria-hidden="true"><ChevronLeft className={cn('kws-sidebar-chevron h-4 w-4', !isExpanded && 'rotate-180')} /></span>
            <span className="kws-sidebar-label whitespace-nowrap" aria-hidden={!isExpanded}>Einklappen</span>
          </button>
          <div className="border-t border-border/60 pt-3">
          <ProfileMenu
            side="right"
            align="end"
            trigger={(
              <button
                type="button"
                className="group relative flex h-14 w-full items-center gap-3 overflow-hidden rounded-kws-control px-2 text-left outline-none transition-colors hover:bg-secondary data-[state=open]:bg-secondary focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/70"
                aria-label={`Profil und Einstellungen · ${accountLabel}`}
              >
                <AccountAvatar user={user} />
                  <span className="kws-sidebar-label flex min-w-0 flex-1 items-center gap-2 whitespace-nowrap" aria-hidden={!isExpanded}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-sans text-xs font-semibold text-foreground">{user.email}</span>
                      <span className="mt-1 block font-sans text-xs text-muted-foreground">
                        {accountLabel}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </span>
              </button>
            )}
          />

          </div>
        </div>
      </aside>
      ) : null}

      {/* Mobile Bottom Navigation */}
      {location.pathname !== '/auth' && location.pathname !== '/competition' && (
        <nav
          aria-label="Hauptnavigation"
          data-compact={isMobileNavCompact}
          className={cn(
            "fixed left-1/2 z-[110] w-[calc(100%-2.5rem)] -translate-x-1/2 overflow-hidden rounded-kws-card bg-card/95 shadow-[0_5px_15px_rgba(0,33,85,0.10)] backdrop-blur-xl transition-[max-width,height,box-shadow] duration-300 ease-out motion-reduce:transition-none md:hidden",
            isMobileNavCompact ? "h-14" : "h-[68px]"
          )}
          style={{
            bottom: 'calc(var(--app-safe-area-bottom) + 12px)',
            maxWidth: isMobileNavCompact
              ? `${Math.min(480, mobileNavItems.length * 72 + 40)}px`
              : '440px',
          }}
        >
          <div className="flex h-full items-stretch px-1.5">
            {mobileNavItems.map((item) => {
              // Check if active based on pathname and query params
              const searchParams = new URLSearchParams(location.search);
              const isActive = item.path === '/guest'
                ? location.pathname === '/guest' || (!user && location.pathname.startsWith('/boulders/'))
                : item.path === '/'
                  ? location.pathname === '/'
                  : item.path === '/boulders'
                    ? location.pathname.startsWith('/boulders')
                    : item.path === '/statistics'
                      ? location.pathname.startsWith('/statistics')
                      : item.path === '/auth'
                        ? location.pathname === '/auth'
                        : item.path.startsWith('/setter')
                          ? location.pathname === item.path
                          : item.path.startsWith('/admin')
                            ? location.pathname === '/admin' && (() => {
                                const itemTab = item.path.split('?tab=')[1];
                                const currentTab = searchParams.get('tab') || 'users';
                                return itemTab === currentTab;
                              })()
                            : location.pathname === item.path;
              
              return (
                <NavLink
                  key={item.label}
                  to={item.path}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    "group flex min-w-0 flex-1 flex-col items-center justify-center px-1 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                    isMobileNavCompact ? "gap-0" : "gap-0.5"
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid h-10 w-10 flex-shrink-0 place-items-center rounded-kws-control transition-[background-color,color,box-shadow,transform] duration-200 motion-reduce:transition-none",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-[0_6px_14px_rgba(54,181,49,0.28)]"
                        : "text-muted-foreground group-hover:bg-secondary group-hover:text-foreground group-active:scale-95"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "max-w-[72px] overflow-hidden truncate text-[11px] font-semibold leading-4 transition-[max-height,opacity,transform] duration-200 motion-reduce:transition-none",
                      isActive ? "text-primary" : "text-muted-foreground",
                      isMobileNavCompact
                        ? "max-h-0 translate-y-1 opacity-0"
                        : "max-h-4 translate-y-0 opacity-100"
                    )}
                  >
                    {item.label}
                  </span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
};
