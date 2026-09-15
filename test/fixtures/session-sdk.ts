// Real installed Supabase SDK, isolated in-memory session and local fake server.
import { createClient } from '@supabase/supabase-js';
export const fixtureUser = { id: '00000000-0000-4000-8000-000000000001', email: 'setter@example.invalid', aud: 'authenticated', role: 'authenticated', user_metadata: {}, app_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
export const fixtureToken = (version: number) => `fixture.${btoa(JSON.stringify({sub:fixtureUser.id, exp:Math.floor(Date.now()/1000)+3600, version}))}.fake`;
const values = new Map([['qa-auth', JSON.stringify({ access_token: fixtureToken(1), refresh_token: 'fixture-refresh-only', token_type: 'bearer', expires_at:Math.floor(Date.now()/1000)+3600, expires_in:3600, user:fixtureUser })]]);
export const replaceStoredSession = () => { const value=JSON.parse(values.get('qa-auth')!); value.access_token=fixtureToken(2); values.set('qa-auth',JSON.stringify(value)); };
export const supabase = createClient(`${location.origin}/qa/supabase`, 'fixture-public-only', { auth: {
  autoRefreshToken: false, persistSession: true, storageKey:'qa-auth', detectSessionInUrl:false,
  storage: { getItem: key => values.get(key) ?? null, setItem: (key,value) => { values.set(key,value); }, removeItem: key => { values.delete(key); } },
} });
export const getSupabase = () => supabase;
export const ensureSupabaseReady = async () => {};
