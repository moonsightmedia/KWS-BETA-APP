// QA-only transport; the real dashboard query/aggregation/rendering still run.
import { supabaseRestRequest as realRequest } from '../../src/lib/supabaseRest';
export async function supabaseRestRequest<T>(path: string, options: Parameters<typeof realRequest>[1] = {}): Promise<T> {
  const state = new URLSearchParams(location.search).get('state');
  const url = new URL(path, location.origin);
  if (state) url.searchParams.set('qa_state', state);
  return realRequest<T>(`${url.pathname}${url.search}`, options);
}
