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
  const accountInitial = user?.email?.trim().charAt(0).toUpperCase() || 'K';

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
    'mx-0.5 my-0.5 flex min-h-11 items-center gap-3 rounded-kws-control px-3 py-2.5 font-sans text-sm font-medium text-[#192436] outline-none transition-colors data-[highlighted]:bg-[#F1F5F1] data-[highlighted]:text-[#192436]';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-kws-control bg-secondary text-[#192436]/65 transition-[background-color,color,transform] hover:bg-[#E8EEE8] hover:text-[#192436] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
            aria-label="Profil"
          >
            <User className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
          </button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={align}
        side={side}
        sideOffset={sideOffset}
        className="z-50 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-kws-card border-0 bg-white p-2 shadow-[0_18px_44px_rgba(19,17,43,0.15)]"
      >
        {user ? (
          <>
            <div className="mb-1 rounded-kws-control bg-[#F1F5F1] p-3">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-kws-control bg-[#192436] font-sans text-sm font-semibold text-white">
                  {accountInitial}
                </div>
                <div className="min-w-0">
                  <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-[#646C71]">Angemeldet als</p>
                  <p className="truncate pt-0.5 font-sans text-sm font-semibold text-[#192436]">{user.email}</p>
                </div>
              </div>
            </div>

            <DropdownMenuItem className={menuItemClassName} onSelect={() => navigate('/profile')}>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-kws-control bg-[#F1F5F1] text-[#192436]/65">
                <Settings className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block">Profil & Einstellungen</span>
                <span className="block truncate pt-0.5 text-[10px] font-normal text-[#646C71]">Konto, Benachrichtigungen und App</span>
              </span>
              <ChevronRight className="h-4 w-4 text-[#646C71]" aria-hidden="true" />
            </DropdownMenuItem>

            <p className="px-3 pb-1 pt-3 font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-[#646C71]">Bereich wechseln</p>
            {profileAreas.map((area) => {
              const AreaIcon = area.icon;
              return (
                <DropdownMenuItem
                  key={area.path}
                  className={cn(
                    menuItemClassName,
                    area.active && 'bg-[#192436] text-white data-[highlighted]:bg-[#25344B] data-[highlighted]:text-white',
                  )}
                  onSelect={() => navigateToArea(area.path)}
                >
                  <AreaIcon className={cn('h-4 w-4 shrink-0', area.active ? 'text-white' : 'text-[#192436]/55')} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block">{area.label}</span>
                    <span className={cn('block truncate pt-0.5 text-[10px] font-normal', area.active ? 'text-white/65' : 'text-[#646C71]')}>
                      {area.description}
                    </span>
                  </span>
                  {area.active ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
                </DropdownMenuItem>
              );
            })}

            <div className="mx-2 my-2 h-px bg-[#E5EBE6]" />
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
