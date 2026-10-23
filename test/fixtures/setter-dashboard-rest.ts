// QA-only transport; the real dashboard query/aggregation/rendering still run.
import { supabaseRestRequest as realRequest } from '../../src/lib/supabaseRest';
export async function supabaseRestRequest<T>(path: string, options: Parameters<typeof realRequest>[1] = {}): Promise<T> {
  const state = new URLSearchParams(location.search).get('state');
  const url = new URL(path, location.origin);
  if (state) url.searchParams.set('qa_state', state);
  // Comparison links use identical examples, so data changes do not bias the UI review.
  if (['v1', 'v2', 'v3', 'v4'].includes(new URLSearchParams(location.search).get('design') ?? '')) url.searchParams.set('qa_design', 'v2');
  return realRequest<T>(`${url.pathname}${url.search}`, options);
}
