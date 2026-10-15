/** Session coordination only. No credentials are logged or persisted here. */
export interface RecoverySession {
  access_token: string;
  expires_at?: number;
  user: { id: string };
}
type AuthResult<S> = { data: { session: S | null }; error: unknown };
export interface RecoveryAuth<S extends RecoverySession> {
  getSession(): Promise<AuthResult<S>>;
  refreshSession(): Promise<AuthResult<S>>;
}

export class SessionRequiredError extends Error {
  constructor() {
    super('Deine Anmeldung ist abgelaufen. Bitte melde dich erneut an.');
    this.name = 'SessionRequiredError';
  }
}

export class SessionAccountChangedError extends Error {
  constructor() {
    super('Das Konto wurde gewechselt. Bitte öffne die Seite für das aktuelle Konto neu.');
    this.name = 'SessionAccountChangedError';
  }
}

export function isInvalidSession(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  return ['refresh_token_not_found', 'refresh_token_already_used', 'session_not_found', 'user_not_found', 'user_banned'].includes(e?.code ?? '')
    || /invalid refresh token|refresh token.*(not found|already used)|session.*not found/i.test(e?.message ?? '');
}

// Never use this decoded claim as authorization. It only prevents replaying an
// old account's request with another account's current token. RLS stays authoritative.
function tokenSubject(token: string): string | null {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const value = JSON.parse(atob(part));
    return typeof value.sub === 'string' ? value.sub : null;
  } catch { return null; }
}

async function jwtExpired(response: Response) {
  if (response.status !== 401) return false;
  try {
    const body = await response.clone().json();
    return /jwt.*expired|token.*expired/i.test(String(body.message ?? body.error ?? ''));
  } catch { return false; }
}

function waitFor<T>(promise: Promise<T>, timeoutMs: number, signal?: AbortSignal | null): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => finish(() => reject(new DOMException('Abgebrochen', 'AbortError')));
    const timer = setTimeout(() => finish(() => reject(new Error('Anmeldung konnte nicht geprüft werden. Bitte prüfe deine Verbindung und versuche es erneut.'))), timeoutMs);
    const finish = (settle: () => void) => { clearTimeout(timer); signal?.removeEventListener('abort', abort); settle(); };
    // Consume the operation's eventual rejection even if this caller aborts.
    promise.then(value => finish(() => resolve(value)), error => finish(() => reject(error)));
    if (signal?.aborted) { abort(); return; }
    signal?.addEventListener('abort', abort, { once: true });
  });
}

export function createSessionRecovery<S extends RecoverySession>(options: {
  auth: RecoveryAuth<S>;
  url: string;
  publicKey: string;
  fetch: typeof fetch;
  /** Explicit media API bases; no session credentials are sent to other hosts. */
  uploadUrls?: string[];
  onRequired?: () => void;
  timeoutMs?: number;
}) {
  let readFlight: Promise<S | null> | null = null;
  let refreshFlight: Promise<S | null> | null = null;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const required = () => { options.onRequired?.(); return new SessionRequiredError(); };
  const unwrap = (result: AuthResult<S>) => {
    if (result.error) {
      if (isInvalidSession(result.error)) throw required();
      // Offline, timeouts, 429 and server errors do not destroy the session.
      throw new Error('Anmeldung konnte nicht geprüft werden. Bitte prüfe deine Verbindung und versuche es erneut.');
    }
    return result.data.session;
  };
  const read = () => {
    if (!readFlight) {
      readFlight = options.auth.getSession().then(unwrap).finally(() => { readFlight = null; });
    }
    return readFlight;
  };
  const refresh = (rejected: S) => {
    if (!refreshFlight) {
      refreshFlight = (async () => {
        const latest = await read();
        if (!latest) throw required();
        if (latest.user.id !== rejected.user.id) throw new SessionAccountChangedError();
        // A concurrent caller / SDK auto-refresh may already have rotated it.
        if (latest.access_token !== rejected.access_token) return latest;
        const next = unwrap(await options.auth.refreshSession());
        if (!next) throw required();
        if (next.user.id !== rejected.user.id) throw new SessionAccountChangedError();
        return next;
      })().finally(() => { refreshFlight = null; });
    }
    return refreshFlight.then(next => {
      // A second account must never consume another caller's shared refresh.
      if (next && next.user.id !== rejected.user.id) throw new SessionAccountChangedError();
      return next;
    });
  };
  const getSession = async (signal?: AbortSignal | null): Promise<S | null> => {
    let current = await waitFor(read(), timeoutMs, signal);
    if (current?.expires_at && current.expires_at <= Date.now() / 1000 + 15) {
      current = await waitFor(refresh(current), timeoutMs, signal);
    }
    return current;
  };

  const authenticatedFetch: typeof fetch = async (input, init) => {
    const request = input instanceof Request ? input : null;
    const target = new URL(request?.url ?? String(input), options.url);
    const origin = new URL(options.url).origin;
    const headers = new Headers(init?.headers ?? request?.headers);
    const bearer = headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    // Public reads stay public. Never attach a session to another origin,
    // auth endpoints, uploads or storage. RPCs below never receive a replay.
    if (target.origin !== origin || !target.pathname.startsWith('/rest/v1/') || !bearer || bearer === options.publicKey) {
      return options.fetch(input, init);
    }
    const signal = init?.signal ?? request?.signal;
    if (signal?.aborted) throw new DOMException('Abgebrochen', 'AbortError');
    const current = await getSession(signal);
    if (!current) throw required();
    const subject = tokenSubject(bearer);
    if (subject && subject !== current.user.id) throw new SessionAccountChangedError();
    headers.set('Authorization', `Bearer ${current.access_token}`);
    const response = await options.fetch(input, { ...init, headers });
    if (!(await jwtExpired(response))) return response;
    if (signal?.aborted) throw new DOMException('Abgebrochen', 'AbortError');
    const renewed = await waitFor(refresh(current), timeoutMs, signal);
    if (!renewed) throw required();
    // Even when requests race across accounts, never retry with another owner.
    if (renewed.user.id !== current.user.id) throw new SessionAccountChangedError();
    const method = (init?.method ?? request?.method ?? 'GET').toUpperCase();
    if (!['GET', 'HEAD'].includes(method) || target.pathname.startsWith('/rest/v1/rpc/')) {
      throw new Error('Anmeldung erneuert. Bitte prüfe den Stand und starte die Aktion erneut.');
    }
    headers.set('Authorization', `Bearer ${renewed.access_token}`);
    const retried = await options.fetch(input, { ...init, headers });
    if (await jwtExpired(retried)) throw required();
    return retried;
  };
  /**
   * Upload-only transport. Binds the owner, not a token, for the lifetime of a
   * job. Only a definite authentication rejection gets ONE replay; network
   * errors, generic 401s, permission denials and server errors are not replayed.
   * Other application mutations keep authenticatedFetch's no-replay policy.
   */
  const createUploadFetch = (ownerId: string): typeof fetch => async (input, init) => {
    // Upload bodies must remain replayable (JSON strings / Blobs / FormData).
    // A Request's stream may have been consumed by the first attempt.
    if (input instanceof Request || (typeof ReadableStream !== 'undefined' && init?.body instanceof ReadableStream)) {
      throw new Error('Upload-Anfragen benötigen einen wiederverwendbaren Body.');
    }
    const target = new URL(String(input), options.url);
    const method = (init?.method ?? 'GET').toUpperCase();
    const restOrigin = new URL(options.url).origin;
    const isRestUpload = target.origin === restOrigin && (
      (target.pathname === '/rest/v1/upload_logs' && ['GET', 'POST', 'PATCH'].includes(method)) ||
      (target.pathname === '/rest/v1/boulders' && method === 'PATCH' && /^eq\..+/.test(target.searchParams.get('id') ?? '')) ||
      (['/rest/v1/rpc/begin_boulder_video_upload', '/rest/v1/rpc/fail_boulder_video_upload'].includes(target.pathname) && method === 'POST')
    );
    const isMediaUpload = (options.uploadUrls ?? []).some(base => {
      const url = new URL(base);
      const prefix = url.pathname.replace(/\/$/, '');
      return target.origin === url.origin && (
        (target.pathname === `${prefix}/upload.php` && method === 'POST') ||
        (target.pathname === `${prefix}/upload-status.php` && method === 'GET')
      );
    });
    if (!isRestUpload && !isMediaUpload) throw new Error('Upload-Ziel ist nicht freigegeben.');
    const signal = init?.signal;
    if (signal?.aborted) throw new DOMException('Abgebrochen', 'AbortError');
    const current = await getSession(signal);
    if (!current) throw required();
    const checkOwner = (next: S) => {
      if (!ownerId || next.user.id !== ownerId) throw new SessionAccountChangedError();
    };
    checkOwner(current);
    const headers = new Headers(init?.headers);
    // Never retain caller credentials in the other header.
    headers.delete('Authorization');
    headers.delete('X-Upload-Auth');
    const header = isRestUpload ? 'Authorization' : 'X-Upload-Auth';
    headers.set(header, `Bearer ${current.access_token}`);
    const send = () => options.fetch(input, { ...init, headers: new Headers(headers), redirect: 'error' });
    const rejected = async (response: Response) => {
      if (await jwtExpired(response)) return true;
      if (!isMediaUpload || response.status !== 401) return false;
      try {
        const body = await response.clone().json();
        // Hostinger middleware rejects this before any chunk / job is written.
        return body.error === 'Invalid or expired token';
      } catch { return false; }
    };
    const response = await send();
    if (!await rejected(response)) return response;
    if (signal?.aborted) throw new DOMException('Abgebrochen', 'AbortError');
    const renewed = await waitFor(refresh(current), timeoutMs, signal);
    if (!renewed) throw required();
    checkOwner(renewed);
    headers.set(header, `Bearer ${renewed.access_token}`);
    const retried = await send();
    if (await rejected(retried)) throw required();
    return retried;
  };
  return { getSession, authenticatedFetch, createUploadFetch };
}
