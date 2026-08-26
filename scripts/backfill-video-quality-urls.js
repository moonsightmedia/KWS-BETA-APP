import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import WebSocket from 'ws';

config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const APPLY_CHANGES = process.argv.includes('--apply');
const CHECK_SESSION = process.argv.includes('--check-session');
const cdpArgument = process.argv.find((argument) => argument.startsWith('--cdp-url='));
const CDP_URL = cdpArgument?.slice('--cdp-url='.length) ?? 'http://127.0.0.1:9223';
const MAX_UPDATES = 25;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const parseQualityUrls = (value) => {
  if (!value) return {};
  if (typeof value === 'string') return JSON.parse(value);
  return value;
};

const buildSiblingUrl = (hdUrl, quality) => {
  const url = new URL(hdUrl);
  if (!/_hd\.mp4$/i.test(url.pathname)) return null;
  url.pathname = url.pathname.replace(/_hd\.mp4$/i, `_${quality}.mp4`);
  return url.toString();
};

const isReachableVideo = async (url) => {
  const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
  return response.ok && (response.headers.get('content-type') ?? '').startsWith('video/');
};

const readBoulders = async () => {
  const { data, error } = await supabase
    .from('boulders')
    .select('id, name, beta_video_url, beta_video_urls')
    .not('beta_video_url', 'is', null);

  if (error) throw error;
  return data ?? [];
};

const buildTargets = async (rows) => {
  const incomplete = rows.filter((row) => {
    const urls = parseQualityUrls(row.beta_video_urls);
    return !(urls.hd && urls.sd && urls.low);
  });

  const candidates = await Promise.all(incomplete.map(async (row) => {
    const currentUrls = parseQualityUrls(row.beta_video_urls);
    const hd = currentUrls.hd ?? row.beta_video_url;
    const sd = currentUrls.sd ?? buildSiblingUrl(hd, 'sd');
    const low = currentUrls.low ?? buildSiblingUrl(hd, 'low');

    if (!hd || !sd || !low) {
      return { row, error: 'Quality sibling URL could not be derived.' };
    }

    const [hdOk, sdOk, lowOk] = await Promise.all([
      isReachableVideo(hd),
      isReachableVideo(sd),
      isReachableVideo(low),
    ]);

    if (!hdOk || !sdOk || !lowOk) {
      return { row, error: `Unavailable source: HD=${hdOk}, SD=${sdOk}, Low=${lowOk}` };
    }

    return {
      id: row.id,
      name: row.name,
      expectedHd: currentUrls.hd ?? null,
      urls: { ...currentUrls, hd, sd, low },
    };
  }));

  const errors = candidates.filter((candidate) => candidate.error);
  const targets = candidates.filter((candidate) => !candidate.error);
  return { incomplete, targets, errors };
};

const getWebViewTarget = async () => {
  const response = await fetch(`${CDP_URL}/json/list`);
  if (!response.ok) throw new Error(`Could not inspect Android WebView (${response.status}).`);
  const targets = await response.json();
  const page = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
  if (!page) throw new Error('No debuggable Android WebView page is available.');
  return page;
};

const evaluateInWebView = async (webSocketDebuggerUrl, expression) => new Promise((resolve, reject) => {
  const socket = new WebSocket(webSocketDebuggerUrl);
  const timeout = setTimeout(() => {
    socket.terminate();
    reject(new Error('Android WebView update timed out.'));
  }, 45000);

  socket.on('open', () => {
    socket.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: {
        expression,
        awaitPromise: true,
        returnByValue: true,
      },
    }));
  });

  socket.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString('utf8'));
      if (message.id !== 1) return;

      clearTimeout(timeout);
      socket.terminate();
      if (message.error) {
        reject(new Error(message.error.message));
        return;
      }
      if (message.result?.exceptionDetails) {
        reject(new Error(message.result.exceptionDetails.text ?? 'WebView evaluation failed.'));
        return;
      }
      resolve(message.result?.result?.value);
    } catch (error) {
      clearTimeout(timeout);
      socket.terminate();
      reject(error);
    }
  });

  socket.on('error', () => {
    clearTimeout(timeout);
    reject(new Error('Could not connect to the Android WebView.'));
  });
});

const readAuthenticatedWebViewSession = async () => {
  const page = await getWebViewTarget();
  const session = await evaluateInWebView(page.webSocketDebuggerUrl, `(() => {
    const storageKey = Object.keys(localStorage).find((key) => key.startsWith('sb-') && key.endsWith('-auth-token'));
    if (!storageKey) return null;

    const storedSession = JSON.parse(localStorage.getItem(storageKey) || '{}');
    const accessToken = storedSession.access_token || storedSession.currentSession?.access_token;
    const refreshToken = storedSession.refresh_token || storedSession.currentSession?.refresh_token;
    const userId = storedSession.user?.id || storedSession.currentSession?.user?.id;
    return accessToken && refreshToken && userId ? { accessToken, refreshToken, userId, storageKey } : null;
  })()`);

  return session ? { ...session, webSocketDebuggerUrl: page.webSocketDebuggerUrl } : null;
};

const applyWithAuthenticatedSession = async (targets) => {
  const session = await readAuthenticatedWebViewSession();
  if (!session?.accessToken || !session?.refreshToken || !session?.userId) {
    return { ok: false, error: 'NO_AUTHENTICATED_SESSION' };
  }

  let accessToken = session.accessToken;
  let headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
  let roleResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${encodeURIComponent(session.userId)}&select=role`,
    { headers },
  );
  if (roleResponse.status === 401) {
    const refreshResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: session.refreshToken }),
    });
    if (!refreshResponse.ok) {
      return { ok: false, error: 'AUTH_REFRESH_FAILED', status: refreshResponse.status };
    }

    const refreshedSession = await refreshResponse.json();
    accessToken = refreshedSession.access_token;
    headers = {
      ...headers,
      Authorization: `Bearer ${accessToken}`,
    };

    const storageUpdate = JSON.stringify({
      storageKey: session.storageKey,
      accessToken: refreshedSession.access_token,
      refreshToken: refreshedSession.refresh_token,
      expiresAt: refreshedSession.expires_at,
      expiresIn: refreshedSession.expires_in,
      tokenType: refreshedSession.token_type,
    });
    await evaluateInWebView(session.webSocketDebuggerUrl, `(() => {
      const update = ${storageUpdate};
      const storedSession = JSON.parse(localStorage.getItem(update.storageKey) || '{}');
      const target = storedSession.currentSession || storedSession;
      target.access_token = update.accessToken;
      target.refresh_token = update.refreshToken;
      target.expires_at = update.expiresAt;
      target.expires_in = update.expiresIn;
      target.token_type = update.tokenType;
      localStorage.setItem(update.storageKey, JSON.stringify(storedSession));
      return true;
    })()`);

    roleResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${encodeURIComponent(session.userId)}&select=role`,
      { headers },
    );
  }
  if (!roleResponse.ok) {
    return { ok: false, error: 'ROLE_CHECK_FAILED', status: roleResponse.status };
  }
  const roles = (await roleResponse.json()).map((entry) => entry.role);
  if (!roles.some((role) => role === 'admin' || role === 'setter')) {
    return { ok: false, error: 'SESSION_NOT_AUTHORIZED', roles };
  }

  const updated = [];
  const skipped = [];
  const errors = [];
  for (const target of targets) {
    const rowUrl = `${SUPABASE_URL}/rest/v1/boulders?id=eq.${encodeURIComponent(target.id)}`
      + '&select=id,name,beta_video_urls';
    const currentResponse = await fetch(rowUrl, { headers });
    if (!currentResponse.ok) {
      errors.push({ id: target.id, status: currentResponse.status, stage: 'read' });
      continue;
    }

    const [current] = await currentResponse.json();
    if (!current) {
      errors.push({ id: target.id, stage: 'missing' });
      continue;
    }
    const currentUrls = parseQualityUrls(current.beta_video_urls);
    if (currentUrls.sd && currentUrls.low) {
      skipped.push({ id: target.id, reason: 'already-complete' });
      continue;
    }
    if ((currentUrls.hd || null) !== target.expectedHd) {
      skipped.push({ id: target.id, reason: 'changed-since-audit' });
      continue;
    }

    const updateResponse = await fetch(rowUrl, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({ beta_video_urls: { ...currentUrls, ...target.urls } }),
    });
    const result = updateResponse.ok ? await updateResponse.json() : [];
    if (!updateResponse.ok || result.length !== 1) {
      errors.push({ id: target.id, status: updateResponse.status, stage: 'update' });
      continue;
    }
    updated.push({ id: target.id, name: target.name });
  }

  return { ok: errors.length === 0, roles, updated, skipped, errors };
};

if (CHECK_SESSION) {
  const page = await getWebViewTarget();
  const result = await evaluateInWebView(page.webSocketDebuggerUrl, `(() => {
    const storageKey = Object.keys(localStorage).find((key) => key.startsWith('sb-') && key.endsWith('-auth-token'));
    if (!storageKey) return { hasSession: false };
    const storedSession = JSON.parse(localStorage.getItem(storageKey) || '{}');
    return {
      hasSession: Boolean(storedSession.access_token || storedSession.currentSession?.access_token),
      hasUser: Boolean(storedSession.user?.id || storedSession.currentSession?.user?.id),
    };
  })()`);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result?.hasSession && result?.hasUser ? 0 : 1);
}

const rows = await readBoulders();
const { incomplete, targets, errors } = await buildTargets(rows);

console.log(JSON.stringify({
  mode: APPLY_CHANGES ? 'apply' : 'dry-run',
  totalVideos: rows.length,
  incomplete: incomplete.length,
  readyToUpdate: targets.length,
  validationErrors: errors.map(({ row, error }) => ({ id: row.id, name: row.name, error })),
  targetNames: targets.map((target) => target.name),
}, null, 2));

if (errors.length > 0) throw new Error('Backfill validation failed; no data was changed.');
if (targets.length > MAX_UPDATES) throw new Error(`Refusing to update more than ${MAX_UPDATES} rows.`);
if (!APPLY_CHANGES || targets.length === 0) process.exit(0);

const result = await applyWithAuthenticatedSession(targets);
console.log(JSON.stringify({
  applied: result?.updated?.length ?? 0,
  skipped: result?.skipped ?? [],
  errors: result?.errors ?? [],
  authorizedRoles: result?.roles ?? [],
  status: result?.status ?? null,
  result: result?.ok ? 'success' : result?.error ?? 'failed',
}, null, 2));

if (!result?.ok) throw new Error(`Production backfill failed: ${result?.error ?? 'row update error'}`);

const verificationRows = await readBoulders();
const remainingIncomplete = verificationRows.filter((row) => {
  const urls = parseQualityUrls(row.beta_video_urls);
  return !(urls.hd && urls.sd && urls.low);
});
console.log(JSON.stringify({ verification: { remainingIncomplete: remainingIncomplete.length } }, null, 2));
if (remainingIncomplete.length > 0) throw new Error('Post-update verification found incomplete rows.');
