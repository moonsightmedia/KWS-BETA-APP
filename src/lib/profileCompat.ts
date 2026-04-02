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
const PROFILE_FIELDS_WITH_AVATAR = `${PROFILE_FIELDS},avatar_url`;

const isMissingAvatarUrlColumnError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  return (
    message.includes('avatar_url') &&
    (
      message.includes('column') ||
      message.includes('schema cache') ||
      message.includes('could not find') ||
      message.includes('does not exist')
    )
  );
};

export async function fetchProfileRecord(
  userId: string,
  accessToken?: string | null,
): Promise<ProfileRecord | null> {
  const buildPath = (fields: string) =>
    `/rest/v1/profiles?id=eq.${userId}&select=${fields}&limit=1`;

  try {
    const data = await supabaseRestRequest<Array<ProfileRecord>>(buildPath(PROFILE_FIELDS_WITH_AVATAR), {
      accessToken,
    });

    return data[0] ?? null;
  } catch (error) {
    if (!isMissingAvatarUrlColumnError(error)) {
      throw error;
    }

    const data = await supabaseRestRequest<Array<Omit<ProfileRecord, 'avatar_url'>>>(buildPath(PROFILE_FIELDS), {
      accessToken,
    });

    if (!data[0]) {
      return null;
    }

    return {
      ...data[0],
      avatar_url: null,
    };
  }
}

export async function updateProfileRecord(
  userId: string,
  payload: ProfileUpdatePayload,
  accessToken?: string | null,
): Promise<void> {
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
    await request(payload);
  } catch (error) {
    if (!isMissingAvatarUrlColumnError(error) || !Object.prototype.hasOwnProperty.call(payload, 'avatar_url')) {
      throw error;
    }

    const { avatar_url, ...fallbackPayload } = payload;
    await request(fallbackPayload);
  }
}

