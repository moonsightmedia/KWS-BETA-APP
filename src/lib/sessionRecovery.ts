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
        if (latest.user.id !== rejected.user.id) throw new Error('Das Konto wurde gewechselt. Bitte öffne die Seite für das aktuelle Konto neu.');
        // A concurrent caller / SDK auto-refresh may already have rotated it.
        if (latest.access_token !== rejected.access_token) return latest;
        const next = unwrap(await options.auth.refreshSession());
        if (!next) throw required();
        if (next.user.id !== rejected.user.id) throw new Error('Das Konto wurde gewechselt. Bitte öffne die Seite für das aktuelle Konto neu.');
        return next;
      })().finally(() => { refreshFlight = null; });
    }
    return refreshFlight.then(next => {
      // A second account must never consume another caller's shared refresh.
      if (next && next.user.id !== rejected.user.id) throw new Error('Das Konto wurde gewechselt. Bitte öffne die Seite für das aktuelle Konto neu.');
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
    if (subject && subject !== current.user.id) throw new Error('Das Konto wurde gewechselt. Bitte öffne die Seite für das aktuelle Konto neu.');
    headers.set('Authorization', `Bearer ${current.access_token}`);
    const response = await options.fetch(input, { ...init, headers });
    if (!(await jwtExpired(response))) return response;
    if (signal?.aborted) throw new DOMException('Abgebrochen', 'AbortError');
    const renewed = await waitFor(refresh(current), timeoutMs, signal);
    if (!renewed) throw required();
    // Even when requests race across accounts, never retry with another owner.
    if (renewed.user.id !== current.user.id) throw new Error('Das Konto wurde gewechselt. Bitte öffne die Seite für das aktuelle Konto neu.');
    const method = (init?.method ?? request?.method ?? 'GET').toUpperCase();
    if (!['GET', 'HEAD'].includes(method) || target.pathname.startsWith('/rest/v1/rpc/')) {
      throw new Error('Anmeldung erneuert. Bitte prüfe den Stand und starte die Aktion erneut.');
    }
    headers.set('Authorization', `Bearer ${renewed.access_token}`);
    const retried = await options.fetch(input, { ...init, headers });
    if (await jwtExpired(retried)) throw required();
    return retried;
  };
  return { getSession, authenticatedFetch };
}
