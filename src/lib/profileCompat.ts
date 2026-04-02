import { supabaseRestRequest } from '@/lib/supabaseRest';

export interface ProfileRecord {
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

type ProfileUpdatePayload = {
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
};

const PROFILE_FIELDS = 'first_name,last_name,full_name,email';

export async function fetchProfileRecord(
  userId: string,
  accessToken?: string | null,
): Promise<ProfileRecord | null> {
  const data = await supabaseRestRequest<Array<Omit<ProfileRecord, 'avatar_url'>>>(
    `/rest/v1/profiles?id=eq.${userId}&select=${PROFILE_FIELDS}&limit=1`,
    {
      accessToken,
    },
  );

  if (!data[0]) {
    return null;
  }

  return {
    ...data[0],
    avatar_url: null,
  };
}

export async function updateProfileRecord(
  userId: string,
  payload: ProfileUpdatePayload,
  accessToken?: string | null,
): Promise<void> {
  const { avatar_url, ...body } = payload;

  const request = (body: Record<string, unknown>) =>
    supabaseRestRequest(
      `/rest/v1/profiles?id=eq.${userId}`,
      {
        accessToken,
        method: 'PATCH',
        prefer: 'return=minimal',
        body,
      },
    );

  await request(body);
}
