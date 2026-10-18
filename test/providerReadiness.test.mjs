import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { appleToken, betaUsage, checkApple, checkProviders, checkSentry, ensureAppleAnalytics, providerJson } from '../ops/hostinger/monitoring/provider-readiness.mjs';

const keys = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const environment = { APPSTORE_API_KEY_ID: 'TESTKEY123', APPSTORE_ISSUER_ID: '00000000-0000-4000-8000-000000000000', APPSTORE_API_PRIVATE_KEY: keys.privateKey.export({ type: 'pkcs8', format: 'pem' }), SENTRY_AUTH_TOKEN: 'do-not-print-this', SENTRY_ORG: 'fixture', SENTRY_PROJECT: 'kws' };
const json = value => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
const usage = { data: [{ type: 'betaBuildUsages', dataPoints: [{ start: '2026-10-01', end: '2026-10-18', values: { installCount: 12, crashCount: 0, sessionCount: 7 } }] }] };

test('Apple token uses ES256, five minute expiry, and no private material in claims', () => {
  const token = appleToken(environment, 1800000000000);
  const [header, payload, signature] = token.split('.');
  assert.equal(JSON.parse(Buffer.from(header, 'base64url')).alg, 'ES256');
  const claims = JSON.parse(Buffer.from(payload, 'base64url'));
  assert.equal(claims.exp - claims.iat, 330);
  assert.equal(claims.aud, 'appstoreconnect-v1');
  assert.ok(verify('sha256', Buffer.from(`${header}.${payload}`), { key: keys.publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(signature, 'base64url')));
  assert.throws(() => appleToken({}), /apple_credentials_missing/);
  assert.throws(() => appleToken({ ...environment, APPSTORE_API_PRIVATE_KEY: 'secret-invalid-key' }), /apple_key_invalid/);
});

test('provider transport rejects arbitrary origins, redirects and large or non-JSON bodies', async () => {
  await assert.rejects(providerJson('https://evil.invalid', '/v1/apps', 'token'), /target_rejected/);
  await assert.rejects(providerJson('https://sentry.io', '/api/0/../../elsewhere', 'token', async () => { throw new Error('should not fetch'); }), /target_rejected/);
  await assert.rejects(providerJson('https://sentry.io', '/api/0/projects/', 'token', async () => new Response('secret', { status: 403 })), /provider_http_403/);
  await assert.rejects(providerJson('https://sentry.io', '/api/0/projects/', 'token', async () => new Response('secret')), /provider_content_type/);
  await assert.rejects(providerJson('https://api.appstoreconnect.apple.com', '/v1/apps', 'token', async () => new Response(JSON.stringify({errors:[{code:'PARAMETER_ERROR.INVALID',detail:'private-details'}]}), {status:400,headers:{'content-type':'application/json'}})), error => error.code === 'provider_http_400_PARAMETER_ERROR.INVALID' && !error.message.includes('private'));
  await assert.rejects(providerJson('https://sentry.io', '/api/0/projects/', 'token', async () => new Response('x'.repeat(2 * 1024 * 1024 + 1), { headers: { 'content-type': 'application/json' } })), /too_large/);
  await providerJson('https://sentry.io', '/api/0/projects/', 'token', async (url, options) => { assert.equal(options.redirect, 'error'); assert.equal(options.headers.Authorization, 'Bearer token'); return json([]); });
});

test('TestFlight preserves provider periods and nulls, never invents daily download totals or tester identities', () => {
  assert.deepEqual(betaUsage(usage), [{ start: '2026-10-01', end: '2026-10-18', installs: 12, crashes: 0, sessions: 7 }]);
  assert.deepEqual(betaUsage({ data: [{ type: 'betaBuildUsages', dataPoints: [{ start: '2026-10-01', end: '2026-10-18', values: {} }] }] })[0].installs, null);
  assert.throws(() => betaUsage({ ...usage, links: { next: 'https://evil.invalid' } }), /shape/);
  assert.throws(() => betaUsage({ data: [{ type: 'betaBuildUsages', dataPoints: [{ start: '2026-10-18', end: '2026-10-01' }] }] }), /period/);
  assert.throws(() => betaUsage({ data: [{ type: 'betaBuildUsages', dataPoints: [{ start: '2026-99-99', end: '2026-10-01' }] }] }), /date_invalid/);
  assert.throws(() => betaUsage({ data: [{ type: 'betaBuildUsages', dataPoints: [{ start: '2026-10-01', end: '2026-10-18', values: { installCount: -1 } }] }] }), /count/);
});

test('Apple checks only the exact KWS bundle and aggregate build metrics, analytics permission failures remain explicit', async () => {
  const calls = [];
  const result = await checkApple(environment, async url => {
    calls.push(url.href);
    if (url.pathname === '/v1/apps') return json({ data: [{ id: '123', attributes: { bundleId: 'com.kletterwelt.beta' } }] });
    if (url.pathname === '/v1/builds') return json({ data: [{ id: 'build-id', attributes: { version: '93' } }] });
    if (url.pathname.endsWith('/metrics/betaBuildUsages')) return json(usage);
    return new Response('private-error', { status: 403 });
  });
  assert.equal(result.testflight[0].periods[0].installs, 12);
  assert.equal(result.app_store_analytics.code, 'provider_http_403');
  assert.equal(result.daily_downloads_imported, false);
  assert.ok(calls.every(url => !url.includes('betaTesters')));
  await assert.rejects(checkApple(environment, async () => json({ data: [{ id: '123', attributes: { bundleId: 'another.app' } }] })), /app_not_unique/);
});

test('Sentry only exports a verified public DSN, not tokens or event bodies', async () => {
  const result = await checkSentry(environment, async url => url.pathname.endsWith('/keys/') ? json([{ isActive: true, dsn: { public: 'https://abcd1234@o123.ingest.de.sentry.io/456', secret: 'do-not-export' } }]) : json([{ title: 'private title', user: { email: 'private@example.invalid' } }]));
  assert.equal(result.issue_read, 'readable');
  assert.equal(result.native_device_verified, false);
  assert.ok(!JSON.stringify(result).includes('private'));
  assert.ok(!JSON.stringify(result).includes('do-not'));
  await assert.rejects(checkSentry(environment, async () => json([{ isActive: true, dsn: { public: 'https://token:secret@evil.invalid/1' } }])), /dsn_invalid/);
});

test('missing or failing provider access never leaks raw errors or pretends integration is active', async () => {
  const report = await checkProviders({}, async () => { throw new Error('private-token'); });
  assert.equal(report.apple.status, 'unavailable');
  assert.equal(report.sentry.status, 'unavailable');
  assert.equal(report.google_play.status, 'not_configured');
  assert.ok(!JSON.stringify(report).includes('private-token'));
});

test('official Apple report setup is explicit, app-bound, idempotent and never fabricates downloaded data', async () => {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push(options.method);
    if (url.pathname === '/v1/apps') return json({data:[{id:'123',attributes:{bundleId:'com.kletterwelt.beta'}}]});
    if (options.method === 'POST') {
      const body = JSON.parse(options.body);
      assert.equal(body.data.relationships.app.data.id, '123');
      assert.equal(body.data.attributes.accessType, 'ONGOING');
      return json({data:{type:'analyticsReportRequests',attributes:{accessType:'ONGOING'}}});
    }
    return json({data:[]});
  };
  const created = await ensureAppleAnalytics(environment, fetcher);
  assert.equal(created.status, 'created'); assert.equal(created.initial_reports_pending, true); assert.equal(created.daily_downloads_imported, false);
  assert.deepEqual(calls, ['GET','GET','POST']);
  const existing = await ensureAppleAnalytics(environment, async (url, options) => {
    assert.equal(options.method, 'GET');
    return url.pathname === '/v1/apps' ? json({data:[{id:'123',attributes:{bundleId:'com.kletterwelt.beta'}}]}) : json({data:[{attributes:{accessType:'ONGOING',stoppedDueToInactivity:false}}]});
  });
  assert.equal(existing.status, 'already_configured');
  await assert.rejects(providerJson('https://sentry.io', '/api/0/projects/', 'token', fetcher, {}), /write_rejected/);
  await assert.rejects(ensureAppleAnalytics(environment, async url => url.pathname === '/v1/apps' ? json({data:[{id:'123',attributes:{bundleId:'com.kletterwelt.beta'}}]}) : json({data:[],links:{next:'private-next'}})), /requests_incomplete/);
});

test('public CI uploads only encrypted provider artifacts and fails closed without a report recipient', async () => {
  for (const [workflow, artifact] of [['monitoring-providers.yml','provider-readiness'], ['apple-analytics-reports.yml','apple-report-request']]) {
    const source = await readFile(new URL(`../.github/workflows/${workflow}`, import.meta.url), 'utf8');
    assert.ok(source.includes('test -n "$REPORT_RECIPIENT"'));
    assert.ok(source.includes('age --encrypt --recipient "$REPORT_RECIPIENT"'));
    assert.ok(source.includes(`path: \u0024{{ runner.temp }}/${artifact}.age`));
    assert.ok(!source.includes(`path: \u0024{{ runner.temp }}/${artifact}.json`));
    assert.ok(source.includes(`rm -- "$RUNNER_TEMP/${artifact}.json"`));
    assert.ok(!source.includes('AGE-SECRET-KEY'));
  }
});
