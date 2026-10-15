import { createPushHandler } from './handler.ts';

Deno.serve(createPushHandler({
  supabaseUrl: Deno.env.get('SUPABASE_URL') || '',
  anonKey: Deno.env.get('SUPABASE_ANON_KEY') || '',
  serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
  serviceAccount: Deno.env.get('FCM_SERVICE_ACCOUNT_JSON') || '',
}));
