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

/** Photos only for authors of comments visible to this viewer on this Boulder. */
export async function readCommentAvatars(boulderId: string, userIds: string[], accessToken?: string | null) {
  const ids = [...new Set(userIds)];
  const batches: string[][] = [];
  for (let i = 0; i < ids.length; i += 100) batches.push(ids.slice(i, i + 100));
  return (await Promise.all(batches.map(p_user_ids => supabaseRestRequest<Array<{ id: string; avatar_url: string | null }>>(
    '/rest/v1/rpc/get_comment_author_avatars', { accessToken, method: 'POST', body: { p_boulder_id: boulderId, p_user_ids } },
  )))).flat();
}
