import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { pathToFileURL, fileURLToPath } from 'node:url';

const enginePath = process.env.KWS_MONITORING_PGLITE_PATH || fileURLToPath(new URL('../node_modules/@electric-sql/pglite/dist/index.js', import.meta.url));
const migrationUrl = new URL('../supabase/migrations/20261019110000_admin_overview_and_issue_actors.sql', import.meta.url);

test('admin overview and event attribution enforce exact identities, totals, source truth and erasure', async context => {
  const { PGlite } = await import(pathToFileURL(enginePath).href);
  const database = new PGlite();
  context.after(() => database.close());
  await database.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY,created_at timestamptz DEFAULT now(),email_confirmed_at timestamptz);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE TABLE public.user_roles (user_id uuid,role text);
    CREATE FUNCTION public.has_role(_user_id uuid,_role text) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
    GRANT USAGE ON SCHEMA auth TO authenticated;
    GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
    CREATE TABLE public.profiles (id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,first_name text,last_name text,full_name text,email text);
    CREATE TABLE public.boulders (id uuid PRIMARY KEY,name text,status text,beta_video_status text);
    CREATE TABLE public.notifications (id uuid PRIMARY KEY,user_id uuid,type text,read boolean DEFAULT false,dismissed_at timestamptz);
    CREATE TABLE public.boulder_ticks (id uuid PRIMARY KEY,user_id uuid,status text,attempt_count integer,is_favorite boolean DEFAULT false,is_project boolean DEFAULT false);
    CREATE TABLE public.sector_areas (id uuid DEFAULT gen_random_uuid(),is_active boolean);
    CREATE TABLE public.sectors (id uuid DEFAULT gen_random_uuid(),is_active boolean);
    CREATE TABLE public.sector_schedule (scheduled_at timestamptz);
    CREATE TABLE public.boulder_comments (moderation_status text);
    CREATE TABLE public.content_reports (status text);
    CREATE TABLE public.feedback (type text,status text);
    CREATE TABLE public.account_deletion_requests (status text,due_at timestamptz);
    CREATE TABLE public.upload_logs (id uuid DEFAULT gen_random_uuid(),status text,updated_at timestamptz);
  `);
  await database.exec(await readFile(new URL('../supabase/migrations/20261017203000_beta_launch_monitoring.sql', import.meta.url), 'utf8'));
  const scalar = async (query, args = []) => (await database.query(query, args)).rows[0].value;
  const signature = () => scalar("SELECT md5(string_agg(pg_get_functiondef(oid), E'\\n' ORDER BY proname)) AS value FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND (proname LIKE 'kws_monitoring_%' OR proname = 'kws_ingest_monitoring_events')");
  const originalSignature = await signature();
  const migration = await readFile(migrationUrl, 'utf8');
  await database.exec(migration);
  await database.exec(migration);
  const admin = crypto.randomUUID();
  const account = crypto.randomUUID();
  const other = crypto.randomUUID();
  const bare = crypto.randomUUID();
  const installation = crypto.randomUUID();
  const session = crypto.randomUUID();
  await database.query("INSERT INTO auth.users(id,created_at) VALUES ($1,now()-interval '2 days'),($2,now()),($3,now()-interval '2 days'),($4,now()-interval '2 days')", [admin, account, other, bare]);
  await database.query("INSERT INTO public.user_roles VALUES ($1,'admin'),($1,'admin'),($1,'setter'),($2,'setter')", [admin, account]);
  await database.query("INSERT INTO public.profiles VALUES ($1,'  Ada  ',' Test ','Ignored alternate','ada@example.test'),($2,'Different','Account',NULL,'other@example.test')", [account, other]);
  await database.query("INSERT INTO public.monitoring_installations(id,platform,first_release,release,channel) VALUES ($1,'web','test','test','production')", [installation]);
  await database.query("INSERT INTO public.monitoring_sessions(id,installation_id,user_id,started_at,last_seen_at,platform,release,channel) VALUES ($1,$2,$3,now(),now(),'web','test','production')", [session, installation, other]);
  await database.exec("INSERT INTO public.monitoring_issues(fingerprint,title,severity,first_seen_at,last_seen_at,last_release,last_platform) VALUES ('shared','Shared','error',now(),now(),'test','web'),('resolved','Resolved','error',now(),now(),'test','web'),('excluded','Excluded','error',now(),now(),'test','web'),('empty','Empty','error',now(),now(),'test','web'); UPDATE public.monitoring_issues SET status='resolved' WHERE fingerprint='resolved';");
  const addEvent = async ({ owner = account, fingerprint = 'shared', excluded = false, minutes = 0 } = {}) => {
    const event = crypto.randomUUID();
    await database.query("INSERT INTO public.monitoring_events(event_id,installation_id,session_id,user_id,name,occurred_at,received_at,platform,app_version,release,channel,consent,excluded,props,fingerprint) VALUES($1,$2,$3,$4,'app_error',now()-$5*interval '1 minute',now()-$5*interval '1 minute','web','1.0.1','test','production','denied',$6,'{}',$7)", [event, installation, session, owner, minutes, excluded, fingerprint]);
    return event;
  };
  const accountEvent = await addEvent();
  await addEvent({ owner: null, minutes: 1 });
  await addEvent({ owner: bare, minutes: 2 });
  await addEvent({ owner: other, excluded: true, minutes: 3 });
  await addEvent({ fingerprint: 'resolved' });
  await addEvent({ fingerprint: 'excluded', excluded: true });
  const selectAdmin = async () => {
    await database.exec('RESET ROLE');
    await database.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [admin]);
    await database.exec('SET ROLE authenticated');
  };
  const overview = () => scalar('SELECT public.kws_admin_overview() AS value');
  const reports = fingerprint => scalar('SELECT public.kws_admin_issue_events($1) AS value', [fingerprint]);

  await context.test('new RPCs are admin-only and do not change the monitoring installation signature', async () => {
    assert.equal(await signature(), originalSignature);
    for (const role of ['anon', 'service_role']) {
      await database.exec(`SET ROLE ${role}`);
      await assert.rejects(overview, /permission denied/);
      await assert.rejects(() => reports('shared'), /permission denied/);
      await database.exec('RESET ROLE');
    }
    await database.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [account]);
    await database.exec('SET ROLE authenticated');
    await assert.rejects(overview, /Administrator required/);
    await assert.rejects(() => reports('shared'), /Administrator required/);
    await assert.rejects(() => scalar('SELECT count(*) AS value FROM public.monitoring_events'), /permission denied/);
    await selectAdmin();
    assert.equal((await overview()).schema_version, 1);
    await assert.rejects(() => reports(null), /Invalid issue fingerprint/);
    await assert.rejects(() => reports('x'.repeat(257)), /Invalid issue fingerprint/);
    assert.deepEqual(await reports('missing'), []);
  });

  await context.test('actor is the exact event account, never current session owner or installation owner', async () => {
    const rows = await reports('shared');
    assert.equal(rows.length, 3);
    assert.deepEqual(rows[0].actor, { state: 'account', user_id: account, display_name: 'Ada Test', email: 'ada@example.test' });
    assert.equal(rows[0].event_id, accountEvent);
    assert.deepEqual(rows[1].actor, { state: 'guest', user_id: null, display_name: null, email: null });
    assert.deepEqual(rows[2].actor, { state: 'account', user_id: bare, display_name: null, email: null });
    assert.equal(rows[0].user_ref.length, 12);
    assert.equal(JSON.stringify(rows).includes('other@example.test'), false);
    await database.exec('RESET ROLE');
    const original = await scalar("SELECT pg_get_functiondef('public.kws_monitoring_issue_events(text)'::regprocedure) AS value");
    assert.equal(original.includes('actor'), false);
    await selectAdmin();
  });

  await context.test('bounded display data never truncates an email into a different contact', async () => {
    await database.exec('RESET ROLE');
    await database.query("UPDATE public.profiles SET first_name=$1,last_name=NULL,email=$2 WHERE id=$3", ['N'.repeat(240), 'a'.repeat(250) + '@example.test', account]);
    await selectAdmin();
    let actor = (await reports('shared'))[0].actor;
    assert.equal(actor.display_name.length, 200);
    assert.equal(actor.email, null);
    await database.exec('RESET ROLE');
    await database.query("UPDATE public.profiles SET first_name=' Ada ',last_name=' Test ',email='ada@example.test' WHERE id=$1", [account]);
    await selectAdmin();
    actor = (await reports('shared'))[0].actor;
    assert.equal(actor.email, 'ada@example.test');
  });

  await context.test('an inconsistent historical owner cannot expose an invented identity', async () => {
    await database.exec('RESET ROLE');
    await database.exec("SET session_replication_role = replica");
    const orphan = await addEvent({ owner: crypto.randomUUID(), minutes: 4 });
    await database.exec('SET session_replication_role = origin');
    await selectAdmin();
    const rows = await reports('shared');
    assert.deepEqual(rows.find(row => row.event_id === orphan).actor, { state: 'unassigned', user_id: null, display_name: null, email: null });
    await database.exec('RESET ROLE');
    await database.query('DELETE FROM public.monitoring_events WHERE event_id=$1', [orphan]);
    await selectAdmin();
  });

  await context.test('overview counts exact complete records without REST limits or cross-table multiplication', async () => {
    await database.exec('RESET ROLE');
    await database.exec(`
      INSERT INTO public.boulders(id,name,status,beta_video_status) VALUES
        (gen_random_uuid(),'Hanging','haengt','ready'),(gen_random_uuid(),'Processing','haengt','processing'),(gen_random_uuid(),'Failed','abgeschraubt','failed');
      INSERT INTO public.sector_areas(is_active) VALUES(true),(true),(false);
      INSERT INTO public.sectors(is_active) VALUES(true),(true),(true),(false);
      INSERT INTO public.sector_schedule VALUES(now()+interval '1 day'),(now()-interval '1 day');
      INSERT INTO public.boulder_comments VALUES('pending'),('approved'),('rejected');
      INSERT INTO public.content_reports VALUES('open'),('resolved');
      INSERT INTO public.feedback SELECT 'general','open' FROM generate_series(1,1005);
      INSERT INTO public.feedback VALUES('bug','in_progress'),('error','open'),('general','resolved'),('error','closed');
      INSERT INTO public.account_deletion_requests VALUES('pending',now()-interval '1 day'),('processing',now()+interval '1 day'),('completed',now()-interval '1 day');
      INSERT INTO public.upload_logs(status,updated_at) VALUES('failed',now()),('aborted_suspected_oom',now()-interval '1 hour'),('failed',now()-interval '25 hours'),('failed',now()+interval '1 day'),('completed',now());
      INSERT INTO public.monitoring_notification_deliveries(platform,status,created_at) VALUES
        ('in_app','created',now()),('android','provider_accepted',now()),('android','provider_rejected',now()),('ios','failed',now()),('web','opened',now()),('android','provider_accepted',now()-interval '25 hours'),('android','provider_accepted',now()+interval '1 day');
    `);
    await selectAdmin();
    const result = await overview();
    assert.deepEqual(result.users, { total: 4, new_24h: 1, admins: 1, setters: 2, deletions_pending: 2, deletions_overdue: 1 });
    assert.deepEqual(result.hall, { boulders_hanging: 2, boulders_removed: 1, areas_active: 2, sectors_active: 3, scheduled_resets: 1 });
    assert.deepEqual(result.moderation, { comments_pending: 1, reports_open: 1 });
    assert.deepEqual(result.feedback, { people_active: 1006, legacy_errors_active: 1 });
    assert.deepEqual(result.monitoring, { app_active: 1, sentry_active: null });
    assert.deepEqual(result.uploads, { failed_24h: 2, processing_now: 1, video_failed_now: 1 });
    assert.deepEqual(result.notifications, { created_24h: 1, provider_accepted_24h: 1, provider_rejected_24h: 1, failed_24h: 1, opened_24h: 1 });
    assert.equal(Date.parse(result.period_end) - Date.parse(result.period_start), 24 * 60 * 60 * 1000);
    assert.equal(result.generated_at, result.period_end);
    assert.equal(JSON.stringify(result).includes('ada@example.test'), false);
    assert.equal(JSON.stringify(result).includes(account), false);
  });

  await context.test('unavailable, partial, stale and missing Sentry snapshots never look like zero active problems', async () => {
    const updateSource = async (status, age) => {
      await database.exec('RESET ROLE');
      await database.query("UPDATE public.monitoring_sources SET status=$1,updated_at=now(),last_success_at=now()-$2*interval '1 minute' WHERE source='sentry'", [status, age]);
      await selectAdmin();
      return overview();
    };
    assert.equal((await overview()).sources.stores.state, 'unconfigured');
    for (const status of ['not_connected', 'disabled', 'error', 'partial', 'unsupported']) {
      const result = await updateSource(status, 0);
      assert.equal(result.monitoring.sentry_active, null);
      assert.equal(result.sources.sentry.status, status);
    }
    let result = await updateSource('connected', 16);
    assert.equal(result.sources.sentry.state, 'stale');
    assert.equal(result.monitoring.sentry_active, null);
    result = await updateSource('connected', -1);
    assert.equal(result.monitoring.sentry_active, null);
    result = await updateSource('connected', 0);
    assert.equal(result.monitoring.sentry_active, 0);
    await database.exec('RESET ROLE');
    await database.exec("INSERT INTO public.monitoring_sentry_issues(external_id,title,status,level,first_seen_at,last_seen_at,count,user_count) VALUES('one','Sentry','unresolved','error',now(),now(),9,0),('two','Resolved','resolved','error',now(),now(),2,0)");
    await database.exec("UPDATE public.monitoring_sources SET status='connected',last_success_at=now(),updated_at=now() WHERE source='alerts'");
    await selectAdmin();
    result = await overview();
    assert.equal(result.monitoring.sentry_active, 1);
    assert.equal(result.sources.alerts.state, 'ready');
    assert.ok(result.sources.alerts.last_success_at);
    await database.exec('RESET ROLE');
    await database.exec("DELETE FROM public.monitoring_sources WHERE source='sentry'");
    await selectAdmin();
    assert.equal((await overview()).monitoring.sentry_active, null);
    assert.equal((await overview()).sources.sentry.state, 'unconfigured');
  });

  await context.test('deleted account reports remain erased and report detail stays bounded', async () => {
    await database.exec('RESET ROLE');
    await database.query('DELETE FROM auth.users WHERE id=$1', [account]);
    await selectAdmin();
    let rows = await reports('shared');
    assert.equal(rows.length, 2);
    assert.equal(rows.some(row => row.event_id === accountEvent), false);
    assert.equal(JSON.stringify(rows).includes('ada@example.test'), false);
    await database.exec('RESET ROLE');
    for (let index = 0; index < 55; index += 1) await addEvent({ owner: null, minutes: 10 + index });
    await selectAdmin();
    rows = await reports('shared');
    assert.equal(rows.length, 50);
    assert.equal(rows[0].actor.state, 'guest');
    assert.ok(rows.every(row => !('user_id' in row) && !('installation_id' in row)));
    await database.exec('RESET ROLE');
    const rollback = await readFile(new URL('../ops/hostinger/admin-overview/rollback.sql', import.meta.url), 'utf8');
    await database.exec(rollback);
    await database.exec(rollback);
    assert.equal(await signature(), originalSignature);
    assert.ok(await scalar("SELECT to_regprocedure('public.kws_monitoring_dashboard(integer,text,text)')::text AS value"));
  });
});
