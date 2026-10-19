export const BACKEND_ENVIRONMENT_KEY = 'kws.backend-environment.v1';
export type BackendEnvironment = 'production' | 'review';

export interface BackendConfig {
  environment: BackendEnvironment;
  supabaseUrl: string;
  publicKey: string;
  videoUrl: string | undefined;
  nativeVideoUrl: string | undefined;
  legacyUploadUrl: string | undefined;
  authSiteUrl: string | undefined;
  authStorageKey: string;
}

export const environmentStorageKey = (key: string, environment: BackendEnvironment) =>
  environment === 'review' ? `kws.review.${key}` : key;

export function resolveBackendConfig(env: Record<string, string | undefined>, requested: string | null): BackendConfig {
  const review = requested === 'review';
  const productionUrl = env.VITE_SUPABASE_URL || '';
  const productionStorageKey = productionUrl
    ? `sb-${new URL(productionUrl).hostname.split('.')[0]}-auth-token`
    : 'sb-placeholder-auth-token';
  if (!review) return {
    environment: 'production', supabaseUrl: productionUrl, publicKey: env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
    videoUrl: env.VITE_VIDEO_API_URL, nativeVideoUrl: env.VITE_NATIVE_VIDEO_API_URL,
    legacyUploadUrl: env.VITE_ALLINKL_API_URL, authSiteUrl: env.VITE_AUTH_SITE_URL,
    authStorageKey: productionStorageKey,
  };
  // Fixed destinations only. No URL/query parameter can supply a backend or key.
  const base = 'https://review-api.kletterwelt-sauerland.de';
  const publicKey = env.VITE_STORE_REVIEW_ANON_KEY;
  if (env.VITE_STORE_REVIEW_ENABLED !== 'true' || !publicKey || publicKey === env.VITE_SUPABASE_PUBLISHABLE_KEY) {
    // Keep the demo notice and return action available, without ever using real data.
    return { environment: 'review', supabaseUrl: 'https://review-unavailable.invalid',
      publicKey: 'review-unavailable', videoUrl: 'https://review-unavailable.invalid',
      nativeVideoUrl: 'https://review-unavailable.invalid', legacyUploadUrl: 'https://review-unavailable.invalid',
      authSiteUrl: env.VITE_AUTH_SITE_URL, authStorageKey: 'sb-kws-store-review-auth-token' };
  }
  return { environment: 'review', supabaseUrl: base, publicKey,
    videoUrl: 'https://review-video.kletterwelt-sauerland.de', nativeVideoUrl: 'https://review-video.kletterwelt-sauerland.de',
    legacyUploadUrl: 'https://review-video.kletterwelt-sauerland.de', authSiteUrl: env.VITE_AUTH_SITE_URL,
    authStorageKey: 'sb-kws-store-review-auth-token' };
}
