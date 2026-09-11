import type { ReactNode } from 'react';
import { Check, ChevronRight, LayoutDashboard, LogOut, Settings, Shield, User, Wrench } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useHasRole } from '@/hooks/useHasRole';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { cn } from '@/lib/utils';
import { AccountAvatar } from '@/components/AccountAvatar';
import { kwsPopoverClassName } from '@/components/ui/kws-surface';
import { useHoverMenu } from '@/hooks/useHoverMenu';

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

const clearStoredRoles = () => {
  try {
    [STORAGE_KEY_ADMIN, STORAGE_KEY_SETTER, STORAGE_KEY_USER_ID].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  } catch {
    // Signing out must still work when browser storage is unavailable.
  }
};

type ProfileMenuProps = {
  trigger?: ReactNode;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
};

export const ProfileMenu = ({
  trigger,
  align = 'start',
  side = 'bottom',
  sideOffset = 12,
}: ProfileMenuProps) => {
  const menu = useHoverMenu();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, authTransition } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { hasRole: isSetter } = useHasRole('setter');

  const storedIsAdmin = getStoredRole(STORAGE_KEY_ADMIN, user?.id);
  const storedIsSetter = getStoredRole(STORAGE_KEY_SETTER, user?.id);
  const effectiveIsAdmin = isAdmin || storedIsAdmin;
  const effectiveIsSetter = effectiveIsAdmin || isSetter || storedIsSetter;
  const isSetterArea = location.pathname.startsWith('/setter');
  const isAdminArea = location.pathname.startsWith('/admin');
  const isUserArea = !isSetterArea && !isAdminArea;

  const navigateToArea = (path: string) => {
    if (location.pathname + location.search !== path) {
      navigate(path);
    }
  };

  const profileAreas = [
    {
      label: 'Home',
      description: 'Dein persönlicher Bereich',
      icon: LayoutDashboard,
      path: '/',
      active: isUserArea,
    },
    ...(effectiveIsSetter
      ? [{ label: 'Setter', description: 'Boulder verwalten', icon: Wrench, path: '/setter/create', active: isSetterArea }]
      : []),
    ...(effectiveIsAdmin
      ? [{ label: 'Administration', description: 'App verwalten', icon: Shield, path: '/admin?tab=users', active: isAdminArea }]
      : []),
  ];

  const menuItemClassName =
    'my-0.5 flex min-h-11 items-center gap-3 rounded-kws-badge px-3 py-2.5 font-sans text-sm font-medium text-foreground outline-none transition-colors data-[highlighted]:bg-secondary data-[highlighted]:text-foreground';

  return (
    <DropdownMenu modal={false} open={menu.open} onOpenChange={menu.onOpenChange}>
      <DropdownMenuTrigger asChild {...menu.triggerProps}>
        {trigger ?? (
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-kws-control bg-secondary text-muted-foreground transition-colors hover:text-foreground data-[state=open]:bg-primary/10 data-[state=open]:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
            aria-label="Profil"
          >
            <User className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
          </button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        {...menu.contentProps}
        align={align}
        side={side}
        sideOffset={sideOffset}
        collisionPadding={16}
        className={cn(kwsPopoverClassName, 'z-[120] max-h-[var(--radix-dropdown-menu-content-available-height)] w-[min(18rem,calc(100vw-2rem))] overflow-y-auto p-2')}
      >
        {user ? (
          <>
            <div className="mb-2 border-b border-border/60 px-2 pb-4 pt-2">
              <div className="flex items-center gap-3">
                <AccountAvatar user={user} />
                <div className="min-w-0 flex-1">
                  <p className="font-sans text-sm font-semibold text-foreground">Dein Konto</p>
                  <p className="truncate pt-0.5 font-sans text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
            </div>

            <DropdownMenuItem className={menuItemClassName} onSelect={() => navigate('/profile')}>
              <Settings className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0 flex-1">Profil & Einstellungen</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </DropdownMenuItem>

            <p className="px-3 pb-1 pt-3 font-sans text-xs font-medium text-muted-foreground">Bereich wechseln</p>
            {profileAreas.map((area) => {
              const AreaIcon = area.icon;
              return (
                <DropdownMenuItem
                  key={area.path}
                  className={cn(
                    menuItemClassName,
                    area.active && 'bg-primary/10 font-semibold data-[highlighted]:bg-primary/15',
                  )}
                  onSelect={() => navigateToArea(area.path)}
                >
                  <AreaIcon className={cn('h-4 w-4 shrink-0', area.active ? 'text-primary' : 'text-muted-foreground')} aria-hidden="true" />
                  <span className="min-w-0 flex-1">{area.label}{area.active ? <span className="sr-only">, aktueller Bereich</span> : null}</span>
                  {area.active ? <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> : null}
                </DropdownMenuItem>
              );
            })}

            <div className="mx-2 my-2 h-px bg-border/60" />
            <DropdownMenuItem
              disabled={authTransition === 'signing-out'}
              onSelect={() => {
                clearStoredRoles();
                void signOut();
              }}
              className={`${menuItemClassName} text-[#C6453A] data-[highlighted]:bg-[#FFF1EF] data-[highlighted]:text-[#C6453A]`}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {authTransition === 'signing-out' ? 'Abmeldung läuft…' : 'Abmelden'}
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem className={menuItemClassName} onSelect={() => navigate('/auth')}>
            <User className="h-4 w-4" aria-hidden="true" />
            Anmelden
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
