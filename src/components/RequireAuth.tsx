import { ReactNode, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';

export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !session) {
      console.log('[RequireAuth] no session → redirect to /guest', location.pathname + location.search);
      const params = new URLSearchParams();
      // preserve sector filter if present in current url
      const sector = new URLSearchParams(location.search).get('sector');
      if (sector) params.set('sector', sector);
      navigate({ pathname: '/guest', search: params.toString() }, { replace: true });
    }
  }, [session, loading, navigate, location]);

  if (!session) return null;
  return <>{children}</>;
};


