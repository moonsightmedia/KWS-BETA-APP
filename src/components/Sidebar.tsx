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
import { MaterialIcon } from '@/components/MaterialIcon';
import { ProfileMenu } from '@/components/ProfileMenu';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

  const avatarUrl =
    typeof user?.user_metadata?.avatar_url === 'string' && user.user_metadata.avatar_url.trim().length > 0
      ? user.user_metadata.avatar_url
      : null;
  const accountLabel = stableIsAdmin ? 'Administrator' : stableIsSetter ? 'Setter' : 'Mitglied';

  return (
    <>
      {/* Desktop Sidebar */}
      {user ? (
      <aside className={cn(
        "fixed left-0 top-0 z-50 hidden h-screen flex-col bg-sidebar-bg py-5 shadow-[10px_0_30px_rgba(19,36,24,0.08)] transition-[width] duration-200 ease-out motion-reduce:transition-none md:flex",
        isExpanded ? "w-64 items-start" : "w-20 items-center",
        className
      )}>
        {/* Brand */}
        <div className={cn('mb-8 flex h-14 items-center px-3', isExpanded ? 'w-full gap-3' : 'justify-center')}>
          <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-white shadow-[0_8px_22px_rgba(8,22,11,0.22)] ring-1 ring-white/20">
            <img
              src="/080616_Kletterwelt-Sauerland_Logo_ohne_Hintergrund_ohne_Schrift.png"
              alt=""
              className="h-full w-full object-cover"
              aria-hidden="true"
            />
          </div>
          {isExpanded ? (
            <div className="min-w-0">
              <p className="truncate font-heading text-[1.35rem] font-semibold leading-none tracking-[0.01em] text-white">
                Kletterwelt
              </p>
              <p className="mt-1 truncate font-sans text-[9px] font-semibold uppercase tracking-[0.14em] text-white/55">
                Sauerland · Beta App
              </p>
            </div>
          ) : null}
        </div>

        {/* Navigation */}
        <TooltipProvider delayDuration={300}>
          <nav aria-label="Hauptnavigation" className="flex w-full flex-1 flex-col gap-6 overflow-y-auto px-3">
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
                            {isExpanded ? (
                              <NavLink
                                to={item.path}
                                aria-label={item.label}
                                className={cn(
                                  "relative flex min-h-11 flex-row items-center gap-3 rounded-kws-control px-3 py-2 font-sans outline-none transition-[background-color,color,transform] duration-150 focus-visible:ring-2 focus-visible:ring-primary/70",
                                  isActive
                                    ? "bg-white/10 font-semibold text-white before:absolute before:bottom-2 before:left-0 before:top-2 before:w-0.5 before:rounded-full before:bg-primary"
                                    : "text-white/60 hover:bg-white/[0.06] hover:text-white"
                                )}
                              >
                                <div className={cn('grid h-5 w-5 flex-shrink-0 place-items-center', isActive && 'text-primary')}>
                                  {item.isMaterialIcon ? (
                                    <MaterialIcon name={item.icon as string} className="w-5 h-5" size={20} />
                                  ) : (
                                    <item.icon className="w-5 h-5" />
                                  )}
                                </div>
                                <span className="whitespace-nowrap text-sm">{item.label}</span>
                              </NavLink>
                            ) : (
                              <NavLink
                                to={item.path}
                                aria-label={item.label}
                                className={cn(
                                  "mx-auto grid h-11 w-11 place-items-center rounded-kws-control outline-none transition-[background-color,color,transform] duration-150 focus-visible:ring-2 focus-visible:ring-primary/70",
                                  isActive
                                    ? "bg-white/10 text-primary"
                                    : "text-white/60 hover:bg-white/[0.06] hover:text-white"
                                )}
                              >
                                {item.isMaterialIcon ? (
                                  <MaterialIcon name={item.icon as string} className="w-5 h-5" size={20} />
                                ) : (
                                  <item.icon className="w-5 h-5" />
                                )}
                              </NavLink>
                            )}
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
        <div className={cn('mt-auto w-full border-t border-white/10 pt-3', isExpanded ? 'px-3' : 'px-2')}>
          <ProfileMenu
            side="right"
            align="end"
            trigger={(
              <button
                type="button"
                className={cn(
                  'group relative flex min-h-12 items-center rounded-kws-control text-left outline-none transition-[background-color,box-shadow] hover:bg-white/[0.075] focus-visible:ring-2 focus-visible:ring-primary/70',
                  isExpanded ? 'w-full gap-3 bg-white/[0.035] px-2.5 py-2' : 'mx-auto w-12 justify-center',
                )}
                aria-label={`Profil und Einstellungen · ${accountLabel}`}
              >
                <Avatar className="h-10 w-10 shrink-0 rounded-full border border-white/10">
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt="" className="rounded-full object-cover" />
                  ) : null}
                  <AvatarFallback className="rounded-full bg-primary font-sans text-xs font-semibold text-[#132216]">
                    {user.email?.substring(0, 2).toUpperCase() || 'KS'}
                  </AvatarFallback>
                </Avatar>
                {isExpanded ? (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-sans text-xs font-semibold text-white">{user.email}</span>
                      <span className="mt-1 flex items-center gap-1.5 font-sans text-[10px] font-medium text-white/55">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                        {accountLabel}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-white/35 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </>
                ) : null}
              </button>
            )}
          />

          <button
            type="button"
            onClick={toggleExpanded}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Navigation einklappen' : 'Navigation ausklappen'}
            className={cn(
              'mt-1 flex min-h-10 items-center rounded-kws-control font-sans text-white/60 outline-none transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-primary/70',
              isExpanded ? 'w-full gap-3 px-3 text-xs font-medium' : 'mx-auto w-12 justify-center',
            )}
          >
            {isExpanded ? <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" /> : <ChevronRight className="h-4 w-4" aria-hidden="true" />}
            {isExpanded ? <span>Einklappen</span> : null}
          </button>
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
