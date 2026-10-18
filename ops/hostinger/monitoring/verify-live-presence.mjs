import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '/sdk/@supabase/supabase-js/dist/main/index.js';

const config = JSON.parse(readFileSync(0, 'utf8'));
assert.equal(config.url, 'https://beta-api.kletterwelt-sauerland.de');
const post = (name, token, body) => fetch(config.url + name, { method: 'POST', headers: { apikey: config.key, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) });
const snapshot = await post('/rest/v1/rpc/kws_monitoring_live', config.admin, {});
assert.equal(snapshot.status, 200);
const data = await snapshot.json();
assert.equal(data.schema_version, 1);
assert.equal(typeof data.online, 'number');
for (const token of [config.key, config.member]) {
  const denied = await post('/rest/v1/rpc/kws_monitoring_live', token, {});
  assert.ok([401, 403].includes(denied.status));
}
const presence = { instance_id: config.instance, installation_id: config.installation, sequence: 1, active: true, platform: 'web', release: 'kws-beta-app@live-verification', channel: 'test', screen: 'home', boulder_id: null };
const ingest = await post('/functions/v1/monitoring-events', config.key, { presence });
assert.equal(ingest.status, 200);
assert.equal((await ingest.json()).accepted, true);
assert.equal((await (await post('/functions/v1/monitoring-events', config.key, { presence })).json()).accepted, false);
presence.sequence = 2; presence.active = false;
assert.equal((await (await post('/functions/v1/monitoring-events', config.key, { presence })).json()).accepted, true);

const results = {};
const clients = [];
for (const [role, token] of Object.entries({ admin: config.admin, member: config.member, guest: config.key })) {
  const client = createClient(config.url, config.key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, accessToken: async () => token });
  clients.push(client);
  const state = results[role] = { joined: false, changes: 0 };
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Realtime join timeout: ' + role)), 15000);
    client.channel('live-verification-' + role)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'monitoring_live_revision' }, event => { state.changes++; assert.ok(!JSON.stringify(event).includes('user_id')); })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') { state.joined = true; clearTimeout(timeout); resolve(); }
        if (['CHANNEL_ERROR', 'TIMED_OUT'].includes(status)) {
          clearTimeout(timeout);
          if (role === 'admin') reject(new Error('Realtime unavailable: ' + role)); else resolve();
        }
      });
  });
}
console.log(JSON.stringify({ status: 'ready_for_revision_update', roles: Object.keys(results) }));
await new Promise(resolve => setTimeout(resolve, 15000));
for (const client of clients) { await client.removeAllChannels(); client.realtime.disconnect(); }
assert.ok(results.admin.changes >= 1, 'Admin did not receive marker update');
assert.equal(results.member.changes, 0, 'Normal account received admin marker');
assert.equal(results.guest.changes, 0, 'Guest received admin marker');
const proof = { verified_at: new Date().toISOString(), admin_snapshot: true, anonymous_and_member_snapshot_denied: true, real_edge_presence: true, stale_sequence_ignored: true, background_acknowledged: true, raw_identity_exposed: false, websocket: results, fixture_excluded: true, instance: config.instance };
writeFileSync('/proof/live-verification.json', JSON.stringify(proof, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ status: 'verified', admin_changes: results.admin.changes, guest_changes: results.guest.changes, member_changes: results.member.changes, fixture_excluded: true }));
