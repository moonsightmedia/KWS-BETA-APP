import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { DashboardPageLayout } from '@/components/DashboardPageLayout';
import { Button } from '@/components/ui/button';
import { SetterState } from '@/components/setter/SetterControls';
import { useAuth } from '@/hooks/useAuth';
import { useHasRole } from '@/hooks/useHasRole';

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
    return <DashboardPageLayout><SetterState loading title="Setterbereich wird geladen …" /></DashboardPageLayout>;
  }
  if (!canAccess) {
    return <DashboardPageLayout><div className="space-y-4"><SetterState title="Kein Zugriff auf den Setterbereich" description="Für diese Seiten brauchst du eine Setter- oder Adminfreigabe." /><Button variant="secondary" onClick={() => navigate('/')}>Zurück zur App</Button></div></DashboardPageLayout>;
  }
  return <DashboardPageLayout><Outlet /></DashboardPageLayout>;
};
