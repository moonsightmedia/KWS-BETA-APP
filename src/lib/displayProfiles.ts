import { supabaseRestRequest } from '@/lib/supabaseRest';

export interface DisplayProfile {
  id: string;
  full_name: string | null;
}

export async function readDisplayProfiles(
  userIds: string[],
  accessToken: string | null | undefined,
  signal?: AbortSignal,
): Promise<DisplayProfile[]> {
  const uniqueIds = [...new Set(userIds)];
  const batches: string[][] = [];
  for (let offset = 0; offset < uniqueIds.length; offset += 100) {
    batches.push(uniqueIds.slice(offset, offset + 100));
  }
  return (await Promise.all(batches.map((ids) => supabaseRestRequest<DisplayProfile[]>(
    '/rest/v1/rpc/get_community_display_names',
    { accessToken, signal, method: 'POST', body: { p_user_ids: ids } },
  )))).flat();
}
