import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { DashboardHeader } from '@/components/DashboardHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSidebar } from '@/components/SidebarContext';
import { useAuth } from '@/hooks/useAuth';
import { useHasRole } from '@/hooks/useHasRole';
import { cn } from '@/lib/utils';

export const setterLegacyViewToPath = (view: string | null | undefined) => {
  switch (view) {
    case 'edit':
      return '/setter/edit';
    case 'status':
      return '/setter/status';
    case 'schedule':
      return '/setter/schedule';
    case 'create':
    case 'batch':
    default:
      return '/setter/create';
  }
};

export const SetterAreaLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isExpanded } = useSidebar();
  const { session, loading: authLoading } = useAuth();
  const { hasRole: isSetter, loading: setterLoading } = useHasRole('setter');
  const { hasRole: isAdmin, loading: adminLoading } = useHasRole('admin');

  useEffect(() => {
    if (!authLoading && !session) {
      try {
        const currentRoute = `${location.pathname}${location.search}`;
        if (currentRoute !== '/auth') {
          sessionStorage.setItem('preserveRoute', currentRoute);
        }
      } catch {
        // Ignore storage issues and still continue to auth.
      }

      navigate('/auth', { replace: true });
    }
  }, [authLoading, location.pathname, location.search, navigate, session]);

  const isLoading = authLoading || setterLoading || adminLoading;
  const canAccess = !!session && (isSetter || isAdmin);

  if (isLoading || !session) {
    return (
      <div
        className={cn(
          'flex min-h-screen min-w-0 flex-1 flex-col bg-background pb-28 md:pb-0',
          isExpanded ? 'md:ml-64' : 'md:ml-20',
        )}
      >
        <DashboardHeader />
        <main className="flex min-w-0 flex-1 items-center justify-center px-4 py-8 sm:px-6">
          <Card className="w-full max-w-md border-border bg-card">
            <CardHeader>
              <CardTitle>Setter-Bereich wird geladen</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Berechtigungen und Session werden geprüft.
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div
        className={cn(
          'flex min-h-screen min-w-0 flex-1 flex-col bg-background pb-28 md:pb-0',
          isExpanded ? 'md:ml-64' : 'md:ml-20',
        )}
      >
        <DashboardHeader />
        <main className="flex min-w-0 flex-1 items-center justify-center px-4 py-8 sm:px-6">
          <Card className="w-full max-w-lg border-border bg-card">
            <CardHeader>
              <CardTitle>Kein Zugriff auf den Setter-Bereich</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Für diese Seiten brauchst du die Rolle `setter` oder `admin`.
              </p>
              <Button onClick={() => navigate('/')}>Zurück zum Dashboard</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F9FAF9]">
      <div
        className={cn(
          'flex min-h-screen min-w-0 w-full flex-1 flex-col bg-[#F9FAF9] pb-28 md:pb-0',
          isExpanded ? 'md:ml-64' : 'md:ml-20',
        )}
      >
        <DashboardHeader />
        <main className="min-w-0 w-full flex-1 overflow-x-hidden px-4 pb-28 pt-6 md:px-8 md:pb-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
