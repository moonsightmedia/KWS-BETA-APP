import { BACKEND_ENVIRONMENT_KEY, environmentStorageKey, resolveBackendConfig, type BackendEnvironment } from './backendEnvironment';

let requested: string | null = null;
try { requested = localStorage.getItem(BACKEND_ENVIRONMENT_KEY); } catch { /* Production is the default. */ }
export const backendConfig = resolveBackendConfig(import.meta.env, requested);
export const isReviewEnvironment = backendConfig.environment === 'review';
export const isReviewAvailable = import.meta.env.VITE_STORE_REVIEW_ENABLED === 'true'
  && Boolean(import.meta.env.VITE_STORE_REVIEW_ANON_KEY)
  && import.meta.env.VITE_STORE_REVIEW_ANON_KEY !== import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const backendStorageKey = (key: string) => environmentStorageKey(key, backendConfig.environment);

/** Called only after checking the session and active uploads; reload discards in-memory query data. */
export function switchBackendEnvironment(environment: BackendEnvironment) {
  if (environment === 'review' && !isReviewAvailable) throw new Error('Die Demoumgebung ist nicht verfügbar.');
  localStorage.setItem(BACKEND_ENVIRONMENT_KEY, environment);
  sessionStorage.removeItem('preserveRoute');
  window.location.assign('/app/login');
}
