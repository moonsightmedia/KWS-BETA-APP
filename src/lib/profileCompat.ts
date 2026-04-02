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
const PROFILE_FIELDS_WITH_AVATAR = 'first_name,last_name,full_name,email,avatar_url';

function isAvatarUrlCompatibilityError(error: unknown) {
  return error instanceof Error && error.message.toLowerCase().includes('avatar_url');
}

export async function fetchProfileRecord(
  userId: string,
  accessToken?: string | null,
): Promise<ProfileRecord | null> {
  let data: Array<ProfileRecord | Omit<ProfileRecord, 'avatar_url'>>;

  try {
    data = await supabaseRestRequest<Array<ProfileRecord>>(
      `/rest/v1/profiles?id=eq.${userId}&select=${PROFILE_FIELDS_WITH_AVATAR}&limit=1`,
      {
        accessToken,
      },
    );
  } catch (error) {
    if (!isAvatarUrlCompatibilityError(error)) {
      throw error;
    }

    data = await supabaseRestRequest<Array<Omit<ProfileRecord, 'avatar_url'>>>(
      `/rest/v1/profiles?id=eq.${userId}&select=${PROFILE_FIELDS}&limit=1`,
      {
        accessToken,
      },
    );
  }

  if (!data[0]) {
    return null;
  }

  return {
    ...data[0],
    avatar_url: 'avatar_url' in data[0] ? data[0].avatar_url ?? null : null,
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

  try {
    await request(
      avatar_url === undefined
        ? body
        : {
            ...body,
            avatar_url,
          },
    );
  } catch (error) {
    if (avatar_url === undefined || !isAvatarUrlCompatibilityError(error)) {
      throw error;
    }

    await request(body);
  }
}
