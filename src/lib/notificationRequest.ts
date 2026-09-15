import { authenticatedFetch } from '@/lib/authenticatedFetch';
/** Bounded, authenticated REST. Failed requests never masquerade as empty data. */
export async function notificationRequest(path: string, accessToken: string | undefined, init: RequestInit = {}) {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!accessToken) throw new Error('Bitte melde dich erneut an.');
  if (!url || !key) throw new Error('Supabase-Konfiguration fehlt.');
  const controller = new AbortController(); const abort = () => controller.abort();
  if (init.signal?.aborted) abort();
  init.signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, 15000);
  try {
    const response = await authenticatedFetch(url + path, { ...init, signal: controller.signal, headers: {
      apikey: key, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...init.headers,
    } });
    if (!response.ok) throw new Error(response.status === 401 ? 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.' : 'Die Anfrage konnte nicht bestätigt werden. Bitte erneut versuchen.');
    const text = await response.text();
    return { response, data: text ? JSON.parse(text) as unknown : null };
  } finally { clearTimeout(timer); init.signal?.removeEventListener('abort', abort); }
}
