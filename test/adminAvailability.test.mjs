import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';
import { projectAvailability } from '../ops/monitoring/availability-export.mjs';

const source = await readFile(new URL('../src/lib/adminAvailability.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source.replace(/^import .*;\r?\n/gm, ''), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText.replace(/^export /gm, '');
const api = new Function('LaunchMonitoringError', 'requestMonitoringRpc', compiled + '; return {parseAdminAvailability,availabilityState};')(class extends Error {}, () => {});
const now = Date.now();
const time = value => new Date(value).toISOString();
const fixture = () => ({ schema_version: 1, server_time: time(now), state: 'ready', snapshot: { schema_version: 1, generated_at: time(now - 1000), services: ['app', 'api', 'video'].map(id => ({ id, state: 'operational', checked_at: time(now - 2000), latency_ms: 35, alert_mode: 'live' })), incidents: [] } });

test('availability accepts complete known service sets and rejects malformed responses', () => {
  assert.equal(api.parseAdminAvailability(fixture()).snapshot.services.length, 3);
  for (const mutate of [value => value.snapshot.services.pop(), value => value.snapshot.services[1].id = 'app', value => value.snapshot.services[0].state = 'green', value => value.snapshot.services[0].latency_ms = -1, value => value.state = 'green']) {
    const value = fixture(); mutate(value); assert.throws(() => api.parseAdminAvailability(value));
  }
  assert.equal(api.parseAdminAvailability({ schema_version: 1, server_time: time(now), state: 'unconfigured', snapshot: null }).snapshot, null);
  assert.throws(() => api.parseAdminAvailability({ ...fixture(), snapshot: null }));
});

test('stale snapshots, old checks, refresh errors and clock skew never stay green', () => {
  const value = fixture();
  assert.equal(api.availabilityState(value, time(now - 2000), 'operational', 0, false), 'operational');
  for (const [checkedAt, elapsed, failed] of [[time(now),180000,false],[time(now-180001),0,false],[time(now),0,true],[time(now+60000),0,false]]) assert.equal(api.availabilityState(value, checkedAt, 'operational', elapsed, failed), 'unknown');
  assert.equal(api.availabilityState({ ...value, state: 'stale' }, time(now), 'operational', 0, false), 'unknown');
});

test('Hub projection excludes secrets, targets and unrelated projects', () => {
  const project = { project: { projectId: 'mon_1114D8A6A1631E123C62', private_value: 'private' }, settings: { alertMode: 'live' }, services: [{ components: [{ component: 'public-http-monitor', observedAt: time(now), status: 'ready', latencyMs: 20 }], target: 'private' }], incidents: [{ lifecycle: 'resolved', openedAt: time(now-40000), resolvedAt: time(now-20000), cause: 'timeout', private_value: 'private' }] };
  assert.equal(JSON.stringify(projectAvailability(project, project.project.projectId, now)).includes('private'), false);
  assert.throws(() => projectAvailability(project, 'mon_UNRELATED', now));
  project.incidents[0].lifecycle = 'open';
  assert.equal(projectAvailability(project, project.project.projectId, now).service.state, 'outage');
  assert.equal(projectAvailability(project, project.project.projectId, now+180001).service.state, 'unknown');
});

test('SQL roles, validation, replay and stale state with isolated crypto adapter', async context => {
  const database = new PGlite(); context.after(() => database.close());
  await database.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth; CREATE SCHEMA extensions;
    CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE TABLE public.user_roles(user_id uuid,role text);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE FUNCTION public.has_role(_user_id uuid,_role text) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;
    CREATE FUNCTION extensions.digest(bytea,text) RETURNS bytea LANGUAGE sql AS $$ SELECT sha256($1) $$;
    CREATE FUNCTION extensions.hmac(bytea,bytea,text) RETURNS bytea LANGUAGE sql AS $$ SELECT sha256($2 || $1) $$;
    GRANT USAGE ON SCHEMA auth TO authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
    INSERT INTO auth.users VALUES('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
    INSERT INTO public.user_roles VALUES('00000000-0000-4000-8000-000000000001','admin');`);
  await database.exec(await readFile(new URL('../supabase/migrations/20261019180000_admin_availability.sql', import.meta.url), 'utf8'));
  await database.exec("INSERT INTO kws_monitoring_private.availability_key VALUES(true,decode(repeat('ab',32),'hex'))");
  const snapshot = fixture().snapshot;
  const publish = async (value, signature) => { const text=JSON.stringify(value); const signed=signature||createHash('sha256').update(Buffer.from('ab'.repeat(32),'hex')).update(text).digest('hex'); return (await database.query('SELECT public.kws_publish_availability($1,$2) AS result',[text,signed])).rows[0].result; };
  await database.exec('SET ROLE anon');
  await assert.rejects(database.query('SELECT public.kws_admin_availability()'));
  await assert.rejects(database.query('SELECT * FROM kws_monitoring_private.availability_key'));
  assert.equal((await publish(snapshot,'0'.repeat(64))).accepted,false);
  assert.deepEqual(await publish(snapshot),{accepted:true,updated:true});
  assert.deepEqual(await publish(snapshot),{accepted:true,updated:false});
  for (const mutate of [value=>value.services[1].id='app',value=>value.extra='private',value=>value.services[0].state=null,value=>value.generated_at=time(now-400000),value=>{delete value.incidents;value.other=[];}]) { const value=structuredClone(snapshot);mutate(value);assert.equal((await publish(value)).accepted,false); }
  await database.exec("RESET ROLE; SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false)");
  await assert.rejects(database.query('SELECT public.kws_admin_availability()'));
  await database.exec("SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false)");
  assert.equal((await database.query('SELECT public.kws_admin_availability() AS result')).rows[0].result.state,'ready');
  await database.exec("RESET ROLE; UPDATE kws_monitoring_private.availability_snapshot SET observed_at=now()-interval '5 minutes'; SET ROLE authenticated");
  assert.equal((await database.query('SELECT public.kws_admin_availability() AS result')).rows[0].result.state,'stale');
  await database.exec("RESET ROLE; DELETE FROM auth.users WHERE id='00000000-0000-4000-8000-000000000001'; SET ROLE authenticated");
  await assert.rejects(database.query('SELECT public.kws_admin_availability()'));
});
