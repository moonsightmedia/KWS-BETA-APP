import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { LoadingScreen } from '@/components/LoadingScreen';
import { supabase } from '@/integrations/supabase/client';
import { completeEmailSession, safeNextPath } from '@/lib/emailAuth';

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const initialization = useRef<Promise<boolean> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const finishAuth = async () => {
      const searchParams = new URLSearchParams(location.search);
      const hashParams = new URLSearchParams(location.hash.startsWith('#') ? location.hash.slice(1) : location.hash);

      const nextPath = safeNextPath(searchParams.get('next') || hashParams.get('next'));

      try {
        initialization.current ??= completeEmailSession(supabase.auth, location.search, location.hash);
        const recovery = await initialization.current;

        if (cancelled) return;

        window.history.replaceState(null, '', '/auth/callback');
        if (recovery) { navigate('/reset-password', { replace: true }); return; }

        toast.success('E-Mail bestätigt', {
          description: 'Du wirst jetzt direkt in den Nutzerbereich weitergeleitet.',
        });
        navigate(nextPath, { replace: true });
      } catch (error: unknown) {
        if (cancelled) return;

        window.history.replaceState(null, '', '/auth/callback');

        toast.error('Bestätigung fehlgeschlagen', {
          description: error instanceof Error ? error.message : 'Bitte versuche es erneut.',
        });
        navigate('/auth', { replace: true });
      }
    };

    void finishAuth();

    return () => {
      cancelled = true;
    };
  }, [location.hash, location.search, navigate]);

  return <LoadingScreen state="confirming-email" />;
};

export default AuthCallback;
