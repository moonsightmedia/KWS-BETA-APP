import { LayoutDashboard, List, Map, ChevronRight, ChevronLeft, User, LogOut, Settings, HelpCircle, Shield } from 'lucide-react';
import { MaterialIcon } from '@/components/MaterialIcon';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useHasRole } from '@/hooks/useHasRole';
import { useSidebar } from './SidebarContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SidebarProps {
  className?: string;
}

// Simple storage keys
const STORAGE_KEY_ADMIN = 'nav_isAdmin';
const STORAGE_KEY_SETTER = 'nav_isSetter';
const STORAGE_KEY_USER_ID = 'nav_userId';

// Simple storage helpers
const getStoredValue = (key: string): boolean | null => {
  try {
    const stored = sessionStorage.getItem(key);
    return stored === null ? null : stored === 'true';
  } catch {
    return null;
  }
};

const setStoredValue = (key: string, value: boolean): void => {
  try {
    sessionStorage.setItem(key, String(value));
  } catch {
    // Ignore
  }
};

const getStoredUserId = (): string | null => {
  try {
    return sessionStorage.getItem(STORAGE_KEY_USER_ID);
  } catch {
    return null;
  }
};

const setStoredUserId = (userId: string | null): void => {
  try {
    if (userId) {
      sessionStorage.setItem(STORAGE_KEY_USER_ID, userId);
    } else {
      sessionStorage.removeItem(STORAGE_KEY_USER_ID);
    }
  } catch {
    // Ignore
  }
};

const clearStoredRoles = (): void => {
  try {
    sessionStorage.removeItem(STORAGE_KEY_ADMIN);
    sessionStorage.removeItem(STORAGE_KEY_SETTER);
    sessionStorage.removeItem(STORAGE_KEY_USER_ID);
  } catch {
    // Ignore
  }
};

export const Sidebar = ({ className }: SidebarProps) => {
  const { hideMobileNav } = useSidebar();
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { hasRole: isSetter, loading: setterLoading } = useHasRole('setter');

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

    // Update stable roles when hooks finish loading (only once per user)
    // CRITICAL: Only update if we haven't initialized yet for this user
    // IMPORTANT: Don't overwrite stored true values with false during loading
    // Only update if hooks return true, or if we haven't initialized at all
    if (currentUserId && !adminLoading && !setterLoading && !rolesInitializedRef.current) {
      // Admin users also have setter access
      const effectiveSetter = isSetter || isAdmin;

      console.log('[Sidebar] Hooks finished loading, updating roles:', { 
        isAdmin, 
        isSetter, 
        effectiveSetter,
        currentStableAdmin: stableIsAdmin,
        currentStableSetter: stableIsSetter
      });

      // CRITICAL: Only update if hooks return true, NEVER overwrite stored true with false
      // This ensures that if we have stored true values, they persist until hooks confirm true
      if (isAdmin) {
        // Hook returned true - update
        setStableIsAdmin(true);
        setStoredValue(STORAGE_KEY_ADMIN, true);
      } else if (!stableIsAdmin) {
        // Hook returned false AND we don't have a stored true value - safe to set false
        setStableIsAdmin(false);
        setStoredValue(STORAGE_KEY_ADMIN, false);
      }
      // If hook is false but stableIsAdmin is true, keep the stored true value

      if (effectiveSetter) {
        // Hook returned true - update
        setStableIsSetter(true);
        setStoredValue(STORAGE_KEY_SETTER, true);
      } else if (!stableIsSetter) {
        // Hook returned false AND we don't have a stored true value - safe to set false
        setStableIsSetter(false);
        setStoredValue(STORAGE_KEY_SETTER, false);
      }
      // If hook is false but stableIsSetter is true, keep the stored true value

      setStoredUserId(currentUserId);

      rolesInitializedRef.current = true;
    }
  }, [user?.id, isAdmin, isSetter, adminLoading, setterLoading, stableIsAdmin, stableIsSetter]);

  // Handle sign out
  const handleSignOut = useCallback(() => {
    clearStoredRoles();
    setStableIsAdmin(false);
    setStableIsSetter(false);
    rolesInitializedRef.current = false;
    signOut();
  }, [signOut]);

  // Compute navigation items - always stable, never changes during navigation
  const navItems = useMemo(() => {
    const baseItems = [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
      { icon: List, label: 'Boulder', path: '/boulders' },
      { icon: Map, label: 'Sektoren', path: '/sectors' },
    ];

    // Always show Setter/Admin items if user has those roles
    // These values are stable and don't change during navigation
    if (stableIsSetter) {
      baseItems.push({ icon: 'build', label: 'Setter', path: '/setter', isMaterialIcon: true });
    }
    if (stableIsAdmin) {
      baseItems.push({ icon: Shield, label: 'Admin', path: '/admin' });
    }

    return baseItems;
  }, [stableIsAdmin, stableIsSetter]); // Only depend on stable values

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden md:flex bg-sidebar-bg flex-col py-6 transition-all duration-300 h-screen fixed left-0 top-0 z-50",
        isExpanded ? "w-48 items-start" : "w-20 items-center",
        className
      )}>
        {/* Profile Picture with Dropdown */}
        <div className={cn("mb-6", isExpanded ? "px-4" : "")}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="cursor-pointer focus:outline-none relative">
                <Avatar className="w-12 h-12 hover:opacity-80 transition-opacity">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {user ? (
                      user.email?.substring(0, 2).toUpperCase() || 'KS'
                    ) : (
                      <HelpCircle className="w-6 h-6" />
                    )}
                  </AvatarFallback>
                </Avatar>
                {stableIsAdmin && (
                  <Badge variant="default" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center">
                    <Shield className="h-3 w-3" />
                  </Badge>
                )}
                {stableIsSetter && !stableIsAdmin && (
                  <Badge variant="default" className="absolute -bottom-1 -right-1 h-5 w-5 p-0 flex items-center justify-center">
                    <MaterialIcon name="build" className="h-3 w-3" size={12} />
                  </Badge>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-card">
              {user ? (
                <>
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <Settings className="w-4 h-4 mr-2" />
                    Profil Einstellungen
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Abmelden
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem onClick={() => navigate('/auth')}>
                  <User className="w-4 h-4 mr-2" />
                  Anmelden
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Navigation */}
        <TooltipProvider delayDuration={300}>
          <nav className="flex-1 flex flex-col gap-4 w-full">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Tooltip key={item.label}>
                  <TooltipTrigger asChild>
                    {isExpanded ? (
                      <NavLink
                        to={item.path}
                        className={cn(
                          "flex flex-row items-center gap-3 px-6 py-3 mx-4 rounded-xl transition-all duration-300",
                          isActive
                            ? "bg-sidebar-bg text-success"
                            : "bg-sidebar-bg text-sidebar-icon hover:bg-sidebar-bg/80"
                        )}
                      >
                        <div className="grid place-items-center w-8 h-8 flex-shrink-0">
                          {item.isMaterialIcon ? (
                            <MaterialIcon name={item.icon as string} className="w-5 h-5" size={20} />
                          ) : (
                            <item.icon className="w-5 h-5" />
                          )}
                        </div>
                        <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                      </NavLink>
                    ) : (
                      <NavLink
                        to={item.path}
                        className={cn(
                          "grid place-items-center w-12 h-12 mx-auto rounded-xl transition-all duration-300",
                          isActive
                            ? "bg-sidebar-bg text-success"
                            : "bg-sidebar-bg text-sidebar-icon hover:bg-sidebar-bg/80"
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
          </nav>
        </TooltipProvider>

        {/* Toggle Button */}
        <div className="w-full">
          {isExpanded ? (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex flex-row items-center gap-3 px-6 py-3 mx-4 rounded-xl bg-sidebar-bg text-sidebar-icon hover:bg-sidebar-bg/80 transition-all duration-300"
            >
              <ChevronLeft className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">Einklappen</span>
            </button>
          ) : (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="grid place-items-center w-12 h-12 mx-auto rounded-xl bg-sidebar-bg text-sidebar-icon hover:bg-sidebar-bg/80 transition-all duration-300"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      {!hideMobileNav && (
        <nav className="md:hidden fixed bottom-4 left-4 right-4 z-50 bg-sidebar-bg rounded-2xl shadow-2xl border border-border">
          <div className="flex items-center justify-around px-4 py-3">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.label}
                  to={item.path}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-300 min-w-0",
                    isActive ? "text-success" : "text-sidebar-icon"
                  )}
                >
                  {item.isMaterialIcon ? (
                    <MaterialIcon name={item.icon as string} className="w-5 h-5 flex-shrink-0" size={20} />
                  ) : (
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                  )}
                  <span className="text-xs font-medium truncate max-w-[60px]">{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
};
