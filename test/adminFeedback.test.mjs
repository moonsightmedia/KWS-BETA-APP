import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
const source = await readFile(new URL('../src/lib/adminFeedback.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
const api = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const connection = { url: 'https://fixture.invalid', key: 'fixture', token: 'fixture' };
const realFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = realFetch; });
const row = (id = 'id-1', patch = {}) => ({ id, title: 'Fehler: Test', type: 'error', status: 'open', priority: 'medium', url: 'https://beta.example.test/path', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', description: 'Test', ...patch });

test('complete keyset walk handles API caps, timestamp ties and more than 1000 rows', async () => {
  const all = Array.from({ length: 1105 }, (_, i) => row(`id-${String(1105 - i).padStart(5, '0')}`));
  let calls = 0;
  globalThis.fetch = async url => {
    const params = new URL(url).searchParams;
    assert.equal(params.get('limit'), '500');
    assert.ok(!params.get('select').includes('description'));
    assert.ok(!params.get('select').includes('error_details'));
    const cursor = params.get('and')?.match(/id\.lt\."([^"]+)"/)[1];
    const batch = all.filter(row => !cursor || row.id < cursor).slice(0, 200);
    calls++;
    return new Response(JSON.stringify(batch));
  };
  const result = await api.loadFeedbackIndex(connection, api.defaultFeedbackFilters);
  assert.equal(result.length, 1105); assert.equal(new Set(result.map(row => row.id)).size, 1105); assert.equal(calls, 7);
});

test('partial index failure and repeated pages never become successful truncated lists', async () => {
  let calls = 0;
  globalThis.fetch = async () => ++calls === 1 ? new Response(JSON.stringify([row()])) : new Response('', { status: 503 });
  await assert.rejects(api.loadFeedbackIndex(connection, api.defaultFeedbackFilters), /503/);
  globalThis.fetch = async () => new Response(JSON.stringify([row()]));
  await assert.rejects(api.loadFeedbackIndex(connection, api.defaultFeedbackFilters), /nicht sicher/);
});

test('search uses literal escaped regex, quoted PostgREST values and server predicates', () => {
  const filters = { ...api.defaultFeedbackFilters, search: 'Test [100%], "a" \\ b.*', priority: 'critical', period: '7', status: 'open' };
  const query = api.feedbackQuery(filters, '2026-09-14T10:00:00Z');
  assert.equal(query.get('priority'), 'eq.critical'); assert.equal(query.get('status'), 'eq.open');
  assert.equal(query.getAll('created_at').length, 2);
  const quoted = query.get('or').match(/title\.imatch\.("(?:\\.|[^"\\])*")/)[1];
  const regex = new RegExp(JSON.parse(quoted));
  assert.ok(regex.test(filters.search)); assert.ok(!regex.test('Test 100 anything'));
});

test('groups preserve exact reports and separate release or environment; priority is semantic', () => {
  const rows = [row('a'), row('b', { created_at: '2026-02-01T00:00:00Z', priority: 'critical' }), row('c', { url: 'http://localhost:5173/path' }), row('d', { release: '1.0.227' })];
  const groups = api.groupFeedback(rows, 'priority');
  assert.equal(groups.length, 3); assert.equal(groups[0].rows.length, 2); assert.equal(groups[0].priority, 'critical');
  assert.equal(groups[0].first, rows[0].created_at); assert.equal(groups[0].last, rows[1].created_at);
  assert.equal(groups.flatMap(group => group.rows).length, 4);
});

test('URLs reject script/data schemes and unknown counts remain unknown', async () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,test', '/relative', null]) assert.equal(api.safeFeedbackUrl(url), undefined);
  assert.equal(api.safeFeedbackUrl('https://example.test/'), 'https://example.test/');
  globalThis.fetch = async () => new Response(null);
  assert.equal(await api.countFeedback(connection, 'people'), null);
});

test('batch status confirms actual IDs and status, and preserves confirmed part on later failure', async () => {
  let calls = 0;
  globalThis.fetch = async (url, init) => {
    calls++;
    assert.equal(init.headers.Prefer, 'return=representation');
    if (calls === 2) return new Response('', { status: 503 });
    const ids = new URL(url).searchParams.get('id').slice(4, -1).split(',').map(JSON.parse);
    return new Response(JSON.stringify(ids.map(id => ({ id, status: 'resolved' }))));
  };
  await assert.rejects(api.writeFeedbackBatch(connection, Array.from({ length: 75 }, (_, i) => `id-${i}`), 'resolved', 'admin'), error => error.confirmed.length === 50 && /50 von 75/.test(error.message));
  globalThis.fetch = async () => new Response(JSON.stringify([{ id: 'a', status: 'open' }]));
  await assert.rejects(api.writeFeedbackBatch(connection, ['a'], 'resolved', 'admin'), error => error.confirmed.length === 0);
});

test('partial delete only confirms returned requested IDs', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify([{ id: 'a' }, { id: 'unrelated' }]));
  await assert.rejects(api.writeFeedbackBatch(connection, ['a', 'b'], 'delete', 'admin'), error => assert.deepEqual(error.confirmed, ['a']) === undefined);
});

test('editor uses version condition and rejects empty or mismatching confirmation', async () => {
  const original = row(); const draft = api.feedbackDraft(original);
  globalThis.fetch = async url => {
    assert.equal(new URL(url).searchParams.get('updated_at'), `eq.${original.updated_at}`);
    return new Response('[]');
  };
  await assert.rejects(api.saveFeedback(connection, original, draft, 'admin'), /Speichern nicht bestätigt/);
  globalThis.fetch = async () => new Response(JSON.stringify([row('id-1', { status: 'closed' })]));
  await assert.rejects(api.saveFeedback(connection, original, draft, 'admin'), /Speichern nicht bestätigt/);
});

test('abort signal cancels in-flight index work', async () => {
  globalThis.fetch = (_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))));
  const controller = new AbortController();
  const promise = api.loadFeedbackIndex(connection, api.defaultFeedbackFilters, controller.signal);
  controller.abort();
  await assert.rejects(promise, { name: 'AbortError' });
});
