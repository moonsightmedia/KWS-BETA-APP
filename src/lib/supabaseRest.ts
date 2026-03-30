interface SupabaseRestOptions {
  accessToken?: string | null;
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  prefer?: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type PostgrestErrorPayload = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

function getRequiredConfig() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Supabase-Konfiguration fehlt');
  }

  return {
    url: SUPABASE_URL,
    key: SUPABASE_PUBLISHABLE_KEY,
  };
}

export async function supabaseRestRequest<T>(
  path: string,
  { accessToken, method = 'GET', body, prefer }: SupabaseRestOptions = {},
): Promise<T> {
  const { url, key } = getRequiredConfig();

  const response = await window.fetch(`${url}${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${accessToken || key}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();

    if (errorText) {
      try {
        const parsedError = JSON.parse(errorText) as PostgrestErrorPayload;
        const normalizedMessage = [parsedError.message, parsedError.details, parsedError.hint]
          .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
          .join(' ');

        throw new Error(normalizedMessage || errorText);
      } catch {
        throw new Error(errorText);
      }
    }

    throw new Error(`HTTP ${response.status}`);
  }

  if (response.status === 204 || response.status === 205) {
    return undefined as T;
  }

  const responseText = await response.text();
  if (!responseText.trim()) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return JSON.parse(responseText) as T;
  }

  return responseText as T;
}
