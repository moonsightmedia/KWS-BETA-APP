declare global {
  interface Window {
    __KWS_VERBOSE?: boolean;
    __KWS_FETCH_OVERRIDE_INSTALLED?: boolean;
    __KWS_NATIVE_FETCH?: typeof window.fetch;
  }
}

const isLocalhost =
  typeof window !== 'undefined'
  && (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost');

function initVerboseFlag() {
  try {
    window.__KWS_VERBOSE = localStorage.getItem('KWS_DEBUG') === '1';
  } catch {
    window.__KWS_VERBOSE = false;
  }
}

function installEarlyStorageErrorGuards() {
  window.addEventListener(
    'unhandledrejection',
    (event) => {
      const reason = event.reason;
      const message =
        typeof reason === 'string'
          ? reason
          : reason && typeof reason.message === 'string'
            ? reason.message
            : String(reason ?? '');

      const lowered = message.toLowerCase();

      if (
        lowered.includes('storage')
        || lowered.includes('access to storage')
        || lowered.includes('not allowed from this context')
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    true,
  );

  window.addEventListener(
    'error',
    (event) => {
      const lowered = String(event.message ?? '').toLowerCase();
      if (
        lowered.includes('storage')
        || lowered.includes('access to storage')
        || lowered.includes('not allowed from this context')
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    true,
  );
}

function installFetchOverride() {
  if (window.__KWS_FETCH_OVERRIDE_INSTALLED) {
    return;
  }

  const nativeFetch = window.__KWS_NATIVE_FETCH ?? window.fetch.bind(window);
  window.__KWS_NATIVE_FETCH = nativeFetch;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlString =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input instanceof Request
            ? input.url
            : String(input);

    try {
      const urlObj = new URL(urlString, window.location.origin);
      const isSupabaseRequest =
        urlObj.hostname.includes('supabase.co')
        || urlObj.hostname.includes('supabase.io')
        || urlObj.hostname.includes('.supabase.co')
        || urlObj.hostname.includes('.supabase.io');
      const isSupabaseStorageRequest =
        isSupabaseRequest && urlObj.pathname.includes('/storage/v1/object/');

      if (!isSupabaseRequest) {
        return nativeFetch(input, init);
      }

      if (isSupabaseStorageRequest) {
        return nativeFetch(input, init);
      }

      let headers: HeadersInit | undefined = init?.headers;

      if (headers instanceof Headers) {
        const normalized: Record<string, string> = {};
        headers.forEach((value, key) => {
          normalized[key] = value;
        });
        headers = normalized;
      }

      if (Array.isArray(headers)) {
        const normalized: Record<string, string> = {};
        headers.forEach(([key, value]) => {
          normalized[key] = value;
        });
        headers = normalized;
      }

      const finalHeaders: Record<string, string> = {
        ...((headers as Record<string, string>) ?? {}),
        ...(init?.headers
          && typeof init.headers === 'object'
          && !(init.headers instanceof Headers)
          && !Array.isArray(init.headers)
          ? (init.headers as Record<string, string>)
          : {}),
      };

      if (input instanceof Request) {
        input.headers.forEach((value, key) => {
          if (!finalHeaders[key]) {
            finalHeaders[key] = value;
          }
        });
      }

      let body: BodyInit | null | undefined = init?.body;
      if (input instanceof Request && !body && !input.bodyUsed) {
        try {
          body = input.clone().body;
        } catch {
          body = null;
        }
      }

      const requestUrl = input instanceof Request ? input.url : input;

      return nativeFetch(requestUrl, {
        ...init,
        method: init?.method || (input instanceof Request ? input.method : 'GET'),
        headers: finalHeaders,
        body,
        cache: 'no-store',
      });
    } catch {
      return nativeFetch(input, init);
    }
  };

  window.__KWS_FETCH_OVERRIDE_INSTALLED = true;
}

async function cleanupLocalDevEnvironment() {
  if (!isLocalhost) {
    return;
  }

  const cleanupTasks: Promise<unknown>[] = [];

  if ('serviceWorker' in navigator) {
    cleanupTasks.push(
      navigator.serviceWorker.getRegistrations().then((registrations) =>
        Promise.allSettled(registrations.map((registration) => registration.unregister())),
      ),
    );
  }

  if ('caches' in window) {
    cleanupTasks.push(
      caches.keys().then((cacheNames) =>
        Promise.allSettled(cacheNames.map((cacheName) => caches.delete(cacheName))),
      ),
    );
  }

  await Promise.allSettled(cleanupTasks);
}

async function bootstrap() {
  initVerboseFlag();
  installEarlyStorageErrorGuards();
  installFetchOverride();
  await cleanupLocalDevEnvironment();
  await import('./main.tsx');
}

void bootstrap();
