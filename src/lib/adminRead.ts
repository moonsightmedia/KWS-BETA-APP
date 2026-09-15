/** Read-only admin queries: bounded time, cancellation, no token/body logging. */
import { authenticatedFetch } from './authenticatedFetch';
export async function readAdminRows<T>(path: string, accessToken: string, signal?: AbortSignal): Promise<T[]> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !accessToken) throw new Error('Keine aktive Verbindung');
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, 15_000);
  try {
    const response = await authenticatedFetch(`${url}/rest/v1/${path}`, { signal: controller.signal, headers: { apikey: key, Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) throw new Error(`Abfrage fehlgeschlagen (${response.status})`);
    const rows: unknown = await response.json();
    if (!Array.isArray(rows)) throw new Error('Ungültige Antwort');
    return rows as T[];
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}
