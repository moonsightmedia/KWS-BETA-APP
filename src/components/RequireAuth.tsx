import { ReactNode, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

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

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md p-6 space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  // CRITICAL FIX: Don't return null - show fallback UI instead
  // Returning null causes empty screen when redirect is pending
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md p-6 space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
};


