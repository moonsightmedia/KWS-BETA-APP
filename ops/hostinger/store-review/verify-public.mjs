// Explicit operator test against the isolated demo only. Credentials arrive in memory.
import assert from 'node:assert/strict';
import https from 'node:https';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

const base = 'https://review-api.kletterwelt-sauerland.de';
const key = process.env.KWS_REVIEW_PUBLIC_KEY;
const accounts = JSON.parse(process.env.KWS_REVIEW_ACCOUNTS || '{}');
assert(key && Object.keys(accounts).length === 4, 'Four demo accounts required');
delete process.env.KWS_REVIEW_ACCOUNTS;
const hosts = new Set(['review-api.kletterwelt-sauerland.de', 'review-video.kletterwelt-sauerland.de']);
// Resolve only these two known VPS names while a local recursive DNS cache is stale.
// TLS certificate/hostname verification remains enabled, with the real SNI/Host.
const lookup = (hostname, options, callback) => {
  assert(hosts.has(hostname), 'Only the fixed demo hosts are permitted');
  callback(null, ...(options?.all ? [[{ address: '187.7.70.230', family: 4 }]] : ['187.7.70.230', 4]));
};
const fetchDemo = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url || input);
  assert(hosts.has(url.hostname), 'No production requests');
  return new Promise((resolve, reject) => {
    const headers = Object.fromEntries(new Headers(init.headers));
    if (init.body) headers['content-length'] = String(Buffer.byteLength(init.body));
    const req = https.request(url, { method: init.method || 'GET', headers,
      lookup, rejectUnauthorized: true, timeout: 15000 }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(new Response(Buffer.concat(chunks), { status: res.statusCode,
        headers: Object.fromEntries(Object.entries(res.headers).filter(([, value]) => value !== undefined).map(([name, value]) => [name, String(value)])) })));
    });
    req.on('error', reject); req.on('timeout', () => req.destroy(new Error('Demo request timed out')));
    if (init.body) req.write(init.body);
    req.end();
  });
};
class DemoSocket extends WebSocket {
  constructor(url, protocols) { super(url, protocols, { lookup, rejectUnauthorized: true }); }
}
const clients = Object.fromEntries(Object.keys(accounts).map(role => [role, createClient(base, key, {
  auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: fetchDemo },
  realtime: { transport: DemoSocket },
})]));
const passed = [];
const check = (name, condition) => { assert(condition, name); passed.push(name); };
try {
  for (const [role, credentials] of Object.entries(accounts)) {
    const { data, error } = await clients[role].auth.signInWithPassword(credentials);
    check(role + '_public_https_login', !error && data.user);
    credentials.id = data.user.id;
  }
  for (const path of ['/', '/pg/', '/project/default', '/functions/v1/nonexistent']) {
    const response = await fetchDemo(base + path);
    check('unexposed_' + path, response.status === 404);
  }
  const overview = await clients.admin.rpc('kws_admin_overview');
  check('admin_overview_synthetic_counts', !overview.error && overview.data.users.total === 4 && overview.data.hall.boulders_hanging === 3);
  const forbidden = await clients.customer.rpc('kws_admin_overview');
  check('customer_admin_overview_denied', Boolean(forbidden.error));
  const filename = `public-proof-${Date.now()}.png`;
  const own = `${accounts.customer.id}/${filename}`;
  const foreign = `${accounts.other.id}/${filename}`;
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=', 'base64');
  const stored = await clients.customer.storage.from('profile-avatars').upload(own, png, { contentType: 'image/png' });
  check('own_avatar_upload', !stored.error);
  const denied = await clients.customer.storage.from('profile-avatars').upload(foreign, png, { contentType: 'image/png' });
  check('foreign_avatar_write_denied', Boolean(denied.error));
  const removed = await clients.customer.storage.from('profile-avatars').remove([own]);
  if (removed.error) console.log(JSON.stringify({ check: 'own_avatar_remove', message: removed.error.message, status: removed.error.status }));
  check('own_avatar_remove', !removed.error);
  const received = [];
  await clients.customer.realtime.setAuth((await clients.customer.auth.getSession()).data.session.access_token);
  const channel = clients.customer.channel('demo-proof-' + Date.now()).on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'notifications' }, message => received.push(message.new));
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Realtime subscribe timed out')), 12000);
    channel.subscribe(status => {
      if (status === 'SUBSCRIBED') { clearTimeout(timer); resolve(); }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { clearTimeout(timer); reject(new Error('Realtime channel failed')); }
    });
  });
  const marker = 'Demo-Verbindungsprüfung ' + Date.now();
  const notifications = await clients.admin.from('notifications').insert(['customer', 'other'].map(role => ({
    user_id: accounts[role].id, type: 'admin_announcement', title: marker, message: 'Erfundene Prüfnachricht.', action_url: '/boulders',
  })));
  check('synthetic_notification_insert', !notifications.error);
  const until = Date.now() + 6000;
  while (Date.now() < until && !received.some(row => row.title === marker)) await new Promise(resolve => setTimeout(resolve, 100));
  check('realtime_own_notification_delivered', received.some(row => row.title === marker && row.user_id === accounts.customer.id));
  // Allow the same committed WAL batch to finish; another account must stay hidden.
  await new Promise(resolve => setTimeout(resolve, 500));
  check('realtime_foreign_notification_hidden', received.every(row => row.user_id === accounts.customer.id));
  await clients.customer.removeChannel(channel);
  console.log(JSON.stringify({ passed, count: passed.length, real_https: true, tls_validation: true,
    temporary_test_dns_override: true, production_requests: 0 }));
} finally {
  await Promise.all(Object.values(clients).map(client => client.removeAllChannels()));
}
