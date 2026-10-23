// QA-only transport; the real dashboard query/aggregation/rendering still run.
import { supabaseRestRequest as realRequest } from '../../src/lib/supabaseRest';
let inventoryReads = 0;
export async function supabaseRestRequest<T>(path: string, options: Parameters<typeof realRequest>[1] = {}): Promise<T> {
  const state = new URLSearchParams(location.search).get('state');
  const url = new URL(path, location.origin);
  if (url.pathname.endsWith('/boulders') && !url.searchParams.has('id')) inventoryReads++;
  if (state) url.searchParams.set('qa_state', state === 'refresh-error' ? inventoryReads > 1 ? 'error' : 'ready' : state);
  // Comparison links use identical examples, so data changes do not bias the UI review.
  url.searchParams.set('qa_design', 'v2');
  url.searchParams.set('qa_design_view', new URLSearchParams(location.search).get('design') ?? 'final');
  return realRequest<T>(`${url.pathname}${url.search}`, options);
}
