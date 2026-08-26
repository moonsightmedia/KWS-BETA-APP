import { createContext, forwardRef, useContext, type ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { ProfileMenu } from '@/components/ProfileMenu';

const SetterTabTitleContext = createContext<{ tabTitle?: string }>({});

export const SetterTabTitleProvider = ({ children, tabTitle }: { children: React.ReactNode; tabTitle?: string }) => (
  <SetterTabTitleContext.Provider value={{ tabTitle }}>{children}</SetterTabTitleContext.Provider>
);

const AdminTabTitleContext = createContext<{ tabTitle?: string }>({});

export const AdminTabTitleProvider = ({ children, tabTitle }: { children: React.ReactNode; tabTitle?: string }) => (
  <AdminTabTitleContext.Provider value={{ tabTitle }}>{children}</AdminTabTitleContext.Provider>
);

const getPageTitle = (pathname: string, setterTabTitle?: string, adminTabTitle?: string): string => {
  if (pathname.startsWith('/boulders/')) return 'Boulder';
  if (pathname === '/setter/create') return 'Erstellen';
  if (pathname === '/setter/edit') return 'Bearbeiten';
  if (pathname === '/setter/status') return 'Status';
  if (pathname === '/setter/schedule') return 'Planung';
  if (pathname === '/setter' && setterTabTitle) return setterTabTitle;
  if (pathname === '/admin' && adminTabTitle) return adminTabTitle;

  const titleMap: Record<string, string> = {
    '/': 'Home',
    '/app': 'Home',
    '/boulders': 'Boulder',
    '/sectors': 'Sektoren',
    '/app/gyms': 'Sektoren',
    '/statistics': 'Statistiken',
    '/setter': 'Setter',
    '/admin': 'Admin',
    '/profile': 'Profil',
    '/app/profile': 'Profil',
    '/profile/edit': 'Profil bearbeiten',
    '/profile/notifications': 'Benachrichtigungen',
    '/profile/about': 'Über die App',
  };

  return titleMap[pathname] || 'Dashboard';
};

type DashboardHeaderProps = {
  rightSlot?: ReactNode;
  belowSlot?: ReactNode;
  backTo?: string;
  backLabel?: string;
};

export const DashboardHeader = forwardRef<HTMLDivElement, DashboardHeaderProps>(({
  rightSlot,
  belowSlot,
  backTo,
  backLabel = 'Zurück zum Profil',
}, ref) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { tabTitle: setterTabTitle } = useContext(SetterTabTitleContext);
  const { tabTitle: adminTabTitle } = useContext(AdminTabTitleContext);
  const pageTitle = getPageTitle(location.pathname, setterTabTitle, adminTabTitle);

  return (
    <div
      ref={ref}
      className="sticky top-0 z-30 border-b border-[#E7F0E8] bg-white/95 pb-3 pt-[calc(1rem+var(--app-safe-area-top))] backdrop-blur-xl md:pt-[calc(1.25rem+var(--app-safe-area-top))]"
    >
      <div className="mx-auto w-full max-w-[1180px] px-4 md:px-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {backTo ? (
              <button
                type="button"
                onClick={() => navigate(backTo)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-kws-control bg-secondary text-[#192436]/65 transition-[background-color,color,transform] hover:bg-[#E8EEE8] hover:text-[#192436] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
                aria-label={backLabel}
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </button>
            ) : (
              <ProfileMenu />
            )}

            <h1 className="truncate text-[2.15rem] font-semibold leading-none tracking-[-0.03em] text-[#192436]">
              {pageTitle}
            </h1>
          </div>

          {rightSlot ? <div className="flex shrink-0 items-center justify-end">{rightSlot}</div> : null}
        </div>

        {belowSlot ? <div className="mt-3">{belowSlot}</div> : null}
      </div>
    </div>
  );
});

DashboardHeader.displayName = 'DashboardHeader';
