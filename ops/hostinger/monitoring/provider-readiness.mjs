import { createPrivateKey, sign } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const appleOrigin = 'https://api.appstoreconnect.apple.com';
const sentryOrigins = new Set(['https://sentry.io', 'https://de.sentry.io', 'https://us.sentry.io']);
const maximumResponse = 2 * 1024 * 1024;
const bundleId = 'com.kletterwelt.beta';

export class ProviderError extends Error {
  constructor(code) { super(code); this.code = code; }
}

export function appleToken(environment, now = Date.now()) {
  const keyId = environment.APPSTORE_API_KEY_ID;
  const issuer = environment.APPSTORE_ISSUER_ID;
  if (!/^[A-Za-z0-9]{6,32}$/.test(keyId ?? '') || !/^[a-f0-9-]{36}$/i.test(issuer ?? '')) {
    throw new ProviderError('apple_credentials_missing');
  }
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const issued = Math.floor(now / 1000);
  const unsigned = `${encode({ alg: 'ES256', kid: keyId, typ: 'JWT' })}.${encode({ iss: issuer, iat: issued - 30, exp: issued + 300, aud: 'appstoreconnect-v1' })}`;
  try {
    const key = createPrivateKey(environment.APPSTORE_API_PRIVATE_KEY ?? '');
    if (key.asymmetricKeyType !== 'ec' || key.asymmetricKeyDetails?.namedCurve !== 'prime256v1') throw new Error();
    return `${unsigned}.${sign('sha256', Buffer.from(unsigned), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url')}`;
  } catch { throw new ProviderError('apple_key_invalid'); }
}

export async function providerJson(origin, path, token, fetcher = fetch) {
  if (!(origin === appleOrigin || sentryOrigins.has(origin)) || !path.startsWith('/api/0/') && !path.startsWith('/v1/')) {
    throw new ProviderError('provider_target_rejected');
  }
  const target = new URL(path, origin);
  if (target.origin !== origin || target.username || target.password || target.hash || !(target.pathname.startsWith('/api/0/') || target.pathname.startsWith('/v1/'))) throw new ProviderError('provider_target_rejected');
  let response;
  try {
    response = await fetcher(target, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'User-Agent': 'KWS-Monitoring/1' },
      redirect: 'error', signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok && response.status !== 400) throw new ProviderError(`provider_http_${response.status}`);
    if (!response.headers.get('content-type')?.toLowerCase().includes('application/json')) throw new ProviderError(response.ok ? 'provider_content_type' : `provider_http_${response.status}`);
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > maximumResponse) { await reader.cancel(); throw new ProviderError('provider_response_too_large'); }
      chunks.push(next.value);
    }
    let payload;
    try { payload = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw new ProviderError('provider_json_invalid'); }
    if (!response.ok) {
      const codes = Array.isArray(payload?.errors) ? payload.errors.slice(0, 3).map(error => error.code).filter(code => typeof code === 'string' && /^[A-Z0-9_.]{1,80}$/.test(code)) : [];
      throw new ProviderError(`provider_http_${response.status}${codes.length ? '_' + codes.join('_') : ''}`);
    }
    return payload;
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    throw new ProviderError('provider_unreachable');
  } finally {
    if (response?.body && !response.bodyUsed) await response.body.cancel().catch(() => {});
  }
}

function count(value) {
  if (value == null) return null;
  if (!Number.isSafeInteger(value) || value < 0) throw new ProviderError('provider_count_invalid');
  return value;
}

function date(value) {
  const parsed = new Date(value);
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new ProviderError('provider_date_invalid');
  return value;
}

export function betaUsage(payload) {
  if (!Array.isArray(payload?.data) || payload.data.length > 10 || payload.links?.next) throw new ProviderError('provider_metric_shape');
  return payload.data.flatMap(item => {
    if (item.type !== 'betaBuildUsages' || !Array.isArray(item.dataPoints) || item.dataPoints.length > 10) throw new ProviderError('provider_metric_shape');
    return item.dataPoints.map(point => {
      const start = date(point.start);
      const end = date(point.end);
      if (start > end) throw new ProviderError('provider_period_invalid');
      return { start, end, installs: count(point.values?.installCount), crashes: count(point.values?.crashCount), sessions: count(point.values?.sessionCount) };
    });
  });
}

export async function checkApple(environment, fetcher = fetch) {
  const token = appleToken(environment);
  const get = path => providerJson(appleOrigin, path, token, fetcher);
  const apps = await get(`/v1/apps?filter[bundleId]=${bundleId}&fields[apps]=bundleId&limit=2`);
  if (apps.data?.length !== 1 || apps.data[0].attributes?.bundleId !== bundleId || !/^\d+$/.test(apps.data[0].id)) throw new ProviderError('apple_app_not_unique');
  const appId = apps.data[0].id;
  const builds = await get(`/v1/builds?filter[app]=${appId}&sort=-uploadedDate&fields[builds]=version,processingState,uploadedDate&limit=5`);
  if (!Array.isArray(builds.data) || builds.data.length > 5) throw new ProviderError('apple_builds_invalid');
  const snapshots = [];
  for (const build of builds.data) {
    if (!/^[A-Za-z0-9-]{1,64}$/.test(build.id) || !/^[0-9.]{1,32}$/.test(build.attributes?.version ?? '')) throw new ProviderError('apple_build_invalid');
    try {
      snapshots.push({ build: build.attributes.version, status: 'available', periods: betaUsage(await get(`/v1/builds/${build.id}/metrics/betaBuildUsages`)) });
    } catch (error) {
      snapshots.push({ build: build.attributes.version, status: 'unavailable', code: safeCode(error) });
    }
  }
  let analytics;
  try {
    const requests = await get(`/v1/apps/${appId}/analyticsReportRequests?limit=10`);
    if (!Array.isArray(requests.data)) throw new ProviderError('apple_analytics_invalid');
    analytics = { status: 'readable', existing_requests: requests.data.length };
  } catch (error) { analytics = { status: 'unavailable', code: safeCode(error) }; }
  return { status: 'readable', bundle_id: bundleId, testflight: snapshots, app_store_analytics: analytics, daily_downloads_imported: false };
}

export async function checkSentry(environment, fetcher = fetch) {
  const organization = environment.SENTRY_ORG;
  const project = environment.SENTRY_PROJECT;
  if (!environment.SENTRY_AUTH_TOKEN || !/^[a-z0-9_-]{1,100}$/.test(organization ?? '') || !/^[a-z0-9_-]{1,100}$/.test(project ?? '')) throw new ProviderError('sentry_credentials_missing');
  const origin = environment.SENTRY_URL || 'https://sentry.io';
  if (!sentryOrigins.has(origin)) throw new ProviderError('provider_target_rejected');
  const get = path => providerJson(origin, path, environment.SENTRY_AUTH_TOKEN, fetcher);
  const keys = await get(`/api/0/projects/${organization}/${project}/keys/`);
  if (!Array.isArray(keys) || keys.length > 100) throw new ProviderError('sentry_keys_invalid');
  const dsns = keys.filter(key => key.isActive === true).map(key => key.dsn?.public).filter(value => typeof value === 'string');
  const unique = [...new Set(dsns)];
  if (unique.length !== 1) throw new ProviderError('sentry_dsn_not_unique');
  let dsn;
  try { dsn = new URL(unique[0]); } catch { throw new ProviderError('sentry_dsn_invalid'); }
  if (dsn.protocol !== 'https:' || !/^[a-f0-9]+$/.test(dsn.username) || dsn.password || !/^o\d+\.ingest\.(?:de\.|us\.)?sentry\.io$/.test(dsn.hostname) || !/^\/\d+$/.test(dsn.pathname) || dsn.search || dsn.hash) throw new ProviderError('sentry_dsn_invalid');
  let issueRead;
  try {
    const issues = await get(`/api/0/projects/${organization}/${project}/issues/?limit=1`);
    issueRead = Array.isArray(issues) ? 'readable' : 'invalid';
  } catch (error) { issueRead = safeCode(error); }
  return { status: 'readable', origin, organization, project, public_dsn: dsn.href, issue_read: issueRead, native_device_verified: false };
}

export function safeCode(error) {
  return error instanceof ProviderError ? error.code : 'provider_check_failed';
}

export async function checkProviders(environment, fetcher = fetch) {
  const report = { version: 1, observed_at: new Date().toISOString(), google_play: { status: 'not_configured', daily_downloads_imported: false } };
  for (const [name, check] of [['apple', checkApple], ['sentry', checkSentry]]) {
    try { report[name] = await check(environment, fetcher); }
    catch (error) { report[name] = { status: 'unavailable', code: safeCode(error) }; }
  }
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const output = process.argv[2];
  if (!output) throw new ProviderError('output_path_required');
  const report = await checkProviders(process.env);
  await writeFile(output, JSON.stringify(report, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  console.log(JSON.stringify({ apple: report.apple.status, sentry: report.sentry.status, google_play: report.google_play.status }));
}
