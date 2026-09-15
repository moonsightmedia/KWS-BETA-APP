import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
const source = await readFile(new URL('../src/lib/notifications.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { notificationQuery, notificationDestination, notificationDay, validateNotifications, exactNotificationCount } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const params = path => new URL(path, 'https://example.invalid').searchParams;
test('queries are owner scoped and cursor uses stable timestamp + ID ordering', () => {
  const q = params(notificationQuery('owner-a', { unreadOnly: true, topic: 'competition' }, { id: 'id-b', created_at: '2026-09-15T10:00:00.000Z' }));
  assert.equal(q.get('user_id'), 'eq.owner-a'); assert.equal(q.get('read'), 'eq.false'); assert.equal(q.get('limit'), '30');
  assert.equal(q.get('order'), 'created_at.desc,id.desc');
  assert.equal(q.get('type'), 'in.(competition_update,competition_result,competition_leaderboard_change)');
  assert.equal(q.get('or'), '(created_at.lt.2026-09-15T10:00:00.000Z,and(created_at.eq.2026-09-15T10:00:00.000Z,id.lt.id-b))');
  assert.equal(params(notificationQuery('owner-a', { topic: 'boulder_new' })).get('type'), 'eq.boulder_new');
});
test('invalid filters, owner IDs and cursor injection fail closed', () => {
  for (const owner of ['', 'a,b', 'a&read=true']) assert.throws(() => notificationQuery(owner));
  assert.throws(() => notificationQuery('a', { topic: 'unknown' }));
  for (const created_at of ['2026-99-01T10:00:00Z', 'x),user_id.neq.a', '']) assert.throws(() => notificationQuery('a', {}, { id: 'b', created_at }));
});
test('only existing local notification destinations are accepted', () => {
  for (const url of ['/boulders', '/boulders/abc-123', '/boulders?show=new#top', '/profile', '/profile/notifications', '/setter/schedule', '/competition', '/guest']) assert.equal(notificationDestination(url), url);
  for (const url of ['https://evil.invalid', '//evil.invalid', 'javascript:alert(1)', '/\\evil.invalid', '/boulders\n', '/%62oulders', '/boulders%2fabc', '/admin', '/competitions/123', '/competition/123', '/not-a-route', null, {}]) assert.equal(notificationDestination(url), null);
});
test('unknown counts are not zero; malformed or foreign records are rejected', () => {
  assert.equal(exactNotificationCount(new Response(null, { headers: { 'content-range': '*/0' } })), 0);
  assert.equal(exactNotificationCount(new Response(null, { headers: { 'content-range': '0-0/67' } })), 67);
  for (const value of [undefined, '0-9/*', 'wrong']) assert.throws(() => exactNotificationCount(new Response(null, { headers: value ? { 'content-range': value } : {} })));
  const row = { id: 'a', user_id: 'me', title: 'Title', message: 'Message', read: false, created_at: '2026-09-15T10:00:00Z' };
  assert.equal(validateNotifications([row], 'me')[0], row);
  for (const value of [{}, null, [{ ...row, user_id: 'other' }], [{ ...row, read: 'false' }], [{ ...row, created_at: 'invalid' }]]) assert.throws(() => validateNotifications(value, 'me'));
});
test('day headings use local calendar days, including DST boundaries', () => {
  const now = new Date(2026, 9, 25, 12);
  assert.equal(notificationDay(new Date(2026, 9, 25, 0, 1).toISOString(), now), 'Heute');
  assert.equal(notificationDay(new Date(2026, 9, 24, 0, 1).toISOString(), now), 'Gestern');
  assert.equal(notificationDay('invalid', now), 'Ältere Mitteilungen');
});
