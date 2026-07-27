import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';

const normalizeNextPath = (value: string | null): string => {
  if (!value || !value.startsWith('/')) {
    return '/';
  }

  return value;
};

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    const finishAuth = async () => {
      const searchParams = new URLSearchParams(location.search);
      const hashParams = new URLSearchParams(location.hash.startsWith('#') ? location.hash.slice(1) : location.hash);

      const nextPath = normalizeNextPath(searchParams.get('next') || hashParams.get('next'));
      const errorMessage =
        searchParams.get('error_description') ||
        hashParams.get('error_description') ||
        searchParams.get('error') ||
        hashParams.get('error');

      try {
        if (errorMessage) {
          throw new Error(errorMessage);
        }

        const code = searchParams.get('code') || hashParams.get('code');

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');

          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) throw error;
          } else {
            const { data } = await supabase.auth.getSession();
            if (!data.session) {
              throw new Error('Der Bestätigungslink konnte nicht verarbeitet werden.');
            }
          }
        }

        if (cancelled) return;

        toast.success('E-Mail bestätigt', {
          description: 'Du wirst jetzt direkt in den Nutzerbereich weitergeleitet.',
        });
        navigate(nextPath, { replace: true });
      } catch (error: unknown) {
        if (cancelled) return;

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F9FAF9] p-6">
      <div className="w-full max-w-sm rounded-2xl border border-[#E7F7E9] bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#36B531]/10">
          <Loader2 className="h-6 w-6 animate-spin text-[#36B531]" />
        </div>
        <h1 className="text-xl font-semibold text-[#13112B]">E-Mail wird bestätigt</h1>
        <p className="mt-2 text-sm leading-6 text-[#13112B]/65">
          Einen kleinen Moment bitte. Wir melden dich direkt an und leiten dich in den Nutzerbereich weiter.
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;
