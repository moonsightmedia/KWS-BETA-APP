import { backendConfig } from '@/lib/backendConfig';
import { supabase } from '@/integrations/supabase/client';
import { createSessionRecovery } from './sessionRecovery';

export const SESSION_REQUIRED_EVENT = 'kws:session-required';
const recovery = createSessionRecovery({
  auth: supabase.auth,
  url: backendConfig.supabaseUrl || 'https://placeholder.supabase.co',
  publicKey: backendConfig.publicKey || '',
  uploadUrls: [
    backendConfig.videoUrl || backendConfig.nativeVideoUrl || 'https://video.kletterwelt-sauerland.de',
    backendConfig.legacyUploadUrl || 'https://cdn.kletterwelt-sauerland.de/upload-api',
  ],
  fetch: (input, init) => window.fetch(input, init),
  onRequired: () => window.dispatchEvent(new Event(SESSION_REQUIRED_EVENT)),
});

export const authenticatedFetch = recovery.authenticatedFetch;
export const getCurrentSession = recovery.getSession;
export const createAuthenticatedUploadFetch = recovery.createUploadFetch;
