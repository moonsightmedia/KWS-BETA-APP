import { createContext, useContext } from 'react';
import { LayoutDashboard, LogOut, Settings, Shield, User, Wrench } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth';
import { useHasRole } from '@/hooks/useHasRole';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const STORAGE_KEY_ADMIN = 'nav_isAdmin';
const STORAGE_KEY_SETTER = 'nav_isSetter';
const STORAGE_KEY_USER_ID = 'nav_userId';

const getStoredRole = (key: string, userId?: string): boolean => {
  if (!userId) return false;

  try {
    const storedUserId = localStorage.getItem(STORAGE_KEY_USER_ID) ?? sessionStorage.getItem(STORAGE_KEY_USER_ID);
    if (storedUserId !== userId) return false;

    const storedValue = localStorage.getItem(key) ?? sessionStorage.getItem(key);
    return storedValue === 'true';
  } catch {
    return false;
  }
};

const SetterTabTitleContext = createContext<{ tabTitle?: string }>({});

export const SetterTabTitleProvider = ({ children, tabTitle }: { children: React.ReactNode; tabTitle?: string }) => {
  return (
    <SetterTabTitleContext.Provider value={{ tabTitle }}>
      {children}
    </SetterTabTitleContext.Provider>
  );
};

const AdminTabTitleContext = createContext<{ tabTitle?: string }>({});

export const AdminTabTitleProvider = ({ children, tabTitle }: { children: React.ReactNode; tabTitle?: string }) => {
  return (
    <AdminTabTitleContext.Provider value={{ tabTitle }}>
      {children}
    </AdminTabTitleContext.Provider>
  );
};

const getPageTitle = (pathname: string, setterTabTitle?: string, adminTabTitle?: string): string => {
  if (pathname.startsWith('/boulders/')) {
    return 'Boulder';
  }

  if (pathname === '/setter/create') {
    return 'Erstellen';
  }

  if (pathname === '/setter/edit') {
    return 'Bearbeiten';
  }

  if (pathname === '/setter/status') {
    return 'Status';
  }

  if (pathname === '/setter/schedule') {
    return 'Planung';
  }

  if (pathname === '/setter' && setterTabTitle) {
    return setterTabTitle;
  }

  if (pathname === '/admin' && adminTabTitle) {
    return adminTabTitle;
  }

  const titleMap: Record<string, string> = {
    '/': 'Dashboard',
    '/boulders': 'Boulder',
    '/sectors': 'Sektoren',
    '/statistics': 'Statistiken',
    '/setter': 'Setter',
    '/admin': 'Admin',
    '/profile': 'Profil',
  };

  return titleMap[pathname] || 'Dashboard';
};

export const DashboardHeader = ({
  rightSlot,
}: {
  rightSlot?: React.ReactNode;
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { hasRole: isSetter } = useHasRole('setter');
  const { tabTitle: setterTabTitle } = useContext(SetterTabTitleContext);
  const { tabTitle: adminTabTitle } = useContext(AdminTabTitleContext);

  const pageTitle = getPageTitle(location.pathname, setterTabTitle, adminTabTitle);
  const storedIsAdmin = getStoredRole(STORAGE_KEY_ADMIN, user?.id);
  const storedIsSetter = getStoredRole(STORAGE_KEY_SETTER, user?.id);
  const effectiveIsAdmin = isAdmin || storedIsAdmin;
  const effectiveIsSetter = effectiveIsAdmin || isSetter || storedIsSetter;

  const navigateToArea = (path: string) => {
    if (location.pathname + location.search === path) {
      return;
    }
    navigate(path);
  };

  const profileMenuContentClassName =
    'z-50 w-[min(17rem,calc(100vw-2rem))] rounded-xl border border-[#DDE7DF] bg-[#F9FAF9] p-0 shadow-[0_14px_32px_rgba(19,17,43,0.10)] overflow-hidden';
  const profileMenuItemClassName =
    'mx-2 my-1 flex min-h-[46px] items-center gap-3 rounded-xl px-4 py-3 text-[0.96rem] font-medium text-[#13112B] outline-none transition-colors data-[highlighted]:bg-[#F4F7F4] data-[highlighted]:text-[#13112B]';
  const profileMenuSeparatorClassName = 'my-0 h-px bg-[#E7F0E8]';

  return (
    <div
      className="sticky top-0 z-10 border-b border-border bg-background/80 px-4 pt-12 pb-3 backdrop-blur-xl"
      style={{
        paddingTop: 'max(3rem, calc(3rem + env(safe-area-inset-top, 0px)))',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary transition-colors active:scale-95 focus:outline-none"
                aria-label="Profil"
              >
                <User className="h-4 w-4 text-muted-foreground" strokeWidth={1.9} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={12} className={profileMenuContentClassName}>
              {user ? (
                <>
                  <div className="px-4 py-4">
                    <p className="truncate text-[1rem] font-semibold tracking-[-0.02em] text-[#13112B]">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator className={profileMenuSeparatorClassName} />
                  <DropdownMenuItem className={profileMenuItemClassName} onSelect={() => navigate('/profile')}>
                    <Settings className="h-5 w-5 text-[#13112B]/55" />
                    Profil Einstellungen
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className={profileMenuSeparatorClassName} />
                  <DropdownMenuItem className={profileMenuItemClassName} onSelect={() => navigateToArea('/')}>
                    <LayoutDashboard className="h-5 w-5 text-[#13112B]/55" />
                    User Bereich
                  </DropdownMenuItem>
                  {effectiveIsSetter && (
                    <DropdownMenuItem className={profileMenuItemClassName} onSelect={() => navigateToArea('/setter/create')}>
                      <Wrench className="h-5 w-5 text-[#13112B]/55" />
                      Setter Bereich
                    </DropdownMenuItem>
                  )}
                  {effectiveIsAdmin && (
                    <DropdownMenuItem className={profileMenuItemClassName} onSelect={() => navigateToArea('/admin?tab=users')}>
                      <Shield className="h-5 w-5 text-[#13112B]/55" />
                      Admin Bereich
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className={profileMenuSeparatorClassName} />
                  <DropdownMenuItem
                    onSelect={signOut}
                    className={`${profileMenuItemClassName} text-[#D25545] data-[highlighted]:bg-red-50 data-[highlighted]:text-[#D25545]`}
                  >
                    <LogOut className="h-5 w-5" />
                    Abmelden
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem className={profileMenuItemClassName} onSelect={() => navigate('/auth')}>
                  <User className="h-5 w-5" />
                  Anmelden
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="min-w-0">
            <h1 className="truncate text-[2.15rem] font-semibold leading-none tracking-[-0.03em] text-foreground">
              {pageTitle}
            </h1>
          </div>
        </div>

        <div className="flex w-10 shrink-0 items-center justify-end">
          {rightSlot ?? null}
        </div>
      </div>
    </div>
  );
};
