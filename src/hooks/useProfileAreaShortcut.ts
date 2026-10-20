import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { backendConfig } from '@/lib/backendConfig';
import { authenticatedFetch } from '@/lib/authenticatedFetch';

/** Navigation only: current server roles are read again before each shortcut. */
export function useProfileAreaShortcut(enabled: boolean, openMenu: () => void, closeMenu: () => void) {
  const { user, session, reauthRequired, authTransition } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const pendingTap = useRef<ReturnType<typeof setTimeout>>();
  const lastTap = useRef(0);
  const request = useRef<AbortController>();
  const inFlight = useRef(false);
  const [checking, setChecking] = useState(false);
  const identity = `${user?.id || ''}:${session?.access_token || ''}:${Boolean(reauthRequired)}:${authTransition || ''}`;
  const currentIdentity = useRef(identity);
  currentIdentity.current = identity;
  const active = enabled && Boolean(user && session?.access_token) && !reauthRequired && !authTransition;

  useEffect(() => {
    setChecking(false);
    return () => {
      clearTimeout(pendingTap.current);
      lastTap.current = 0;
      request.current?.abort();
      request.current = undefined;
      inFlight.current = false;
    };
  }, [identity, location.pathname]);

  const cycleArea = async () => {
    closeMenu();
    if (!active || !user || !session || inFlight.current) return;
    inFlight.current = true;
    setChecking(true);
    const startedIdentity = identity;
    const controller = new AbortController();
    request.current = controller;
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 8000);
    try {
      const response = await authenticatedFetch(`${backendConfig.supabaseUrl}/rest/v1/user_roles?user_id=eq.${encodeURIComponent(user.id)}&select=role`, {
        headers: { apikey: backendConfig.publicKey, Authorization: `Bearer ${session.access_token}` },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('Role check unavailable');
      const rows: unknown = await response.json();
      if (!Array.isArray(rows) || !rows.every((row) => row && typeof row.role === 'string')) throw new Error('Invalid roles');
      if (currentIdentity.current !== startedIdentity || controller.signal.aborted) return;
      const roles = new Set(rows.map((row: { role: string }) => row.role));
      const areas = ['/', ...(roles.has('admin') || roles.has('setter') ? ['/setter/create'] : []), ...(roles.has('admin') ? ['/admin?tab=overview'] : [])];
      const current = location.pathname.startsWith('/admin') ? '/admin?tab=overview' : location.pathname.startsWith('/setter') ? '/setter/create' : '/';
      const next = areas[(areas.indexOf(current) + 1) % areas.length];
      if (next !== current || location.pathname !== '/') navigate(next);
    } catch {
      if (currentIdentity.current === startedIdentity && !controller.signal.aborted) {
        toast.error('Bereich konnte nicht gewechselt werden', { description: 'Die Berechtigungen konnten nicht geprüft werden. Bitte versuche es erneut.' });
      } else if (timedOut && currentIdentity.current === startedIdentity && request.current === controller) {
        toast.error('Bereich konnte nicht gewechselt werden', { description: 'Die Berechtigungsprüfung hat zu lange gedauert. Bitte versuche es erneut.' });
      }
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) {
        request.current = undefined;
        inFlight.current = false;
        setChecking(false);
      }
    }
  };

  return {
    active,
    checking,
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      if (active && event.button === 0 && !event.ctrlKey) event.preventDefault();
    },
    onClick: (event: MouseEvent<HTMLButtonElement>) => {
      if (!active) return;
      event.preventDefault();
      if (event.detail === 0) {
        clearTimeout(pendingTap.current);
        lastTap.current = 0;
        openMenu();
        return;
      }
      const now = performance.now();
      if (lastTap.current && now - lastTap.current <= 300) {
        clearTimeout(pendingTap.current);
        lastTap.current = 0;
        void cycleArea();
      } else {
        lastTap.current = now;
        pendingTap.current = setTimeout(() => { lastTap.current = 0; openMenu(); }, 300);
      }
    },
    onPointerCancel: () => { clearTimeout(pendingTap.current); lastTap.current = 0; },
  };
}
