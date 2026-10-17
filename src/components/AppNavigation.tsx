import { useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { isAuthPage } from '@/lib/authRoutes';

/** Guests keep one mobile navigation across Boulder, login and registration. */
export const AppNavigation = () => {
  const { pathname } = useLocation();
  const { loading, user } = useAuth();

  if (loading || (user && isAuthPage(pathname))) return null;
  if (['/auth/callback', '/reset-password', '/competition', '/privacy', '/imprint', '/community-rules'].includes(pathname)) return null;

  return <Sidebar />;
};
