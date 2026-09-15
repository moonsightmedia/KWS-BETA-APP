import { supabase } from '@/integrations/supabase/client';
import { createSessionRecovery } from './sessionRecovery';

export const SESSION_REQUIRED_EVENT = 'kws:session-required';
const recovery = createSessionRecovery({
  auth: supabase.auth,
  url: import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co',
  publicKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
  fetch: (input, init) => window.fetch(input, init),
  onRequired: () => window.dispatchEvent(new Event(SESSION_REQUIRED_EVENT)),
});

export const authenticatedFetch = recovery.authenticatedFetch;
export const getCurrentSession = recovery.getSession;
