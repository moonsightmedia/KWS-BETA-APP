import { createMonitoringHandler } from './handler.ts';

Deno.serve(createMonitoringHandler({
  supabaseUrl: Deno.env.get('SUPABASE_URL') || '',
  anonKey: Deno.env.get('SUPABASE_ANON_KEY') || '',
  serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
}));
