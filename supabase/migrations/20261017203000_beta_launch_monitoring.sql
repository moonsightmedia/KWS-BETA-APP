BEGIN;

CREATE TABLE IF NOT EXISTS public.monitoring_config (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  measurement_started_at timestamptz NOT NULL DEFAULT now(),
  reference_salt uuid NOT NULL DEFAULT gen_random_uuid()
);
INSERT INTO public.monitoring_config DEFAULT VALUES ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.monitoring_installations (
  id uuid PRIMARY KEY,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  first_usage_at timestamptz,
  first_boulder_at timestamptz,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  platform text NOT NULL CHECK (platform IN ('web','android','ios')),
  first_release text NOT NULL CHECK (length(first_release) BETWEEN 1 AND 120),
  release text NOT NULL CHECK (length(release) BETWEEN 1 AND 120),
  channel text NOT NULL CHECK (channel IN ('production','testflight','apk','development','test')),
  excluded boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS public.monitoring_sessions (
  id uuid PRIMARY KEY,
  installation_id uuid NOT NULL REFERENCES public.monitoring_installations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL,
  usage_started_at timestamptz,
  last_usage_at timestamptz,
  last_seen_at timestamptz NOT NULL,
  platform text NOT NULL CHECK (platform IN ('web','android','ios')),
  release text NOT NULL,
  channel text NOT NULL,
  foreground boolean NOT NULL DEFAULT false,
  screen text,
  boulder_id uuid,
  excluded boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS public.monitoring_issues (
  fingerprint text PRIMARY KEY,
  title text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info','warning','error','fatal')),
  first_seen_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL,
  occurrences bigint NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved')),
  fixed_release text,
  last_release text NOT NULL,
  last_platform text NOT NULL,
  regression boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS public.monitoring_events (
  event_id uuid PRIMARY KEY,
  installation_id uuid NOT NULL REFERENCES public.monitoring_installations(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.monitoring_sessions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  platform text NOT NULL,
  app_version text NOT NULL,
  release text NOT NULL,
  channel text NOT NULL,
  consent text NOT NULL CHECK (consent IN ('granted','denied')),
  excluded boolean NOT NULL DEFAULT false,
  boulder_id uuid,
  props jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (pg_column_size(props) <= 8192),
  fingerprint text REFERENCES public.monitoring_issues(fingerprint) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS public.monitoring_rate_buckets (
  key text NOT NULL,
  bucket timestamptz NOT NULL,
  count integer NOT NULL,
  PRIMARY KEY (key,bucket)
);
CREATE TABLE IF NOT EXISTS public.monitoring_notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  platform text NOT NULL CHECK (platform IN ('web','android','ios','in_app','unknown')),
  status text NOT NULL CHECK (status IN ('created','dispatch_attempt','provider_accepted','provider_rejected','client_received','opened','in_app_read','dismissed','failed','uncertain','unsupported','disabled')),
  code text,
  provider_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.monitoring_store_metrics (
  source text NOT NULL,
  metric text NOT NULL,
  definition text NOT NULL,
  metric_date date NOT NULL,
  value bigint NOT NULL CHECK (value >= 0),
  source_period_start timestamptz NOT NULL,
  source_period_end timestamptz NOT NULL,
  source_timezone text NOT NULL,
  app_identifier text NOT NULL,
  channel text NOT NULL,
  source_revision text NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source,metric,metric_date,app_identifier,channel),
  CHECK (source_period_end > source_period_start)
);
CREATE TABLE IF NOT EXISTS public.monitoring_sources (
  source text PRIMARY KEY CHECK (source IN ('sentry','stores','alerts')),
  status text NOT NULL CHECK (status IN ('not_connected','disabled','connected','partial','error','unsupported')),
  code text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_success_at timestamptz
);
INSERT INTO public.monitoring_sources (source,status) VALUES ('sentry','not_connected'),('stores','not_connected'),('alerts','not_connected') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS public.monitoring_sentry_issues (
  external_id text PRIMARY KEY,
  title text NOT NULL,
  status text NOT NULL,
  level text NOT NULL,
  first_seen_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL,
  count bigint NOT NULL,
  user_count bigint NOT NULL,
  permalink text,
  short_id text,
  project_slug text,
  imported_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.monitoring_alert_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deduplication_key text NOT NULL UNIQUE,
  fingerprint text REFERENCES public.monitoring_issues(fingerprint) ON DELETE CASCADE,
  external_id text REFERENCES public.monitoring_sentry_issues(external_id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'app' CHECK (source IN ('app','sentry')),
  event_count bigint NOT NULL DEFAULT 0,
  affected_installations bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','claimed','accepted','failed','uncertain')),
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  lease_token uuid,
  code text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((source = 'app' AND fingerprint IS NOT NULL AND external_id IS NULL) OR (source = 'sentry' AND fingerprint IS NULL AND external_id IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS public.monitoring_business_daily (
  date date NOT NULL,
  name text NOT NULL CHECK (name IN ('tick_saved','favorite_added','project_added','tracking_session_saved')),
  count bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (date,name)
);
CREATE TABLE IF NOT EXISTS public.monitoring_daily_metrics (
  date date NOT NULL,
  platform text NOT NULL,
  release text NOT NULL,
  channel text NOT NULL,
  metrics jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (date,platform,release,channel)
);
CREATE INDEX IF NOT EXISTS monitoring_events_time_idx ON public.monitoring_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS monitoring_events_received_idx ON public.monitoring_events (received_at DESC);
CREATE INDEX IF NOT EXISTS monitoring_events_issue_idx ON public.monitoring_events (fingerprint,occurred_at DESC) WHERE fingerprint IS NOT NULL;
CREATE INDEX IF NOT EXISTS monitoring_events_installation_idx ON public.monitoring_events (installation_id,occurred_at DESC);
CREATE INDEX IF NOT EXISTS monitoring_events_name_idx ON public.monitoring_events (name,occurred_at DESC);
CREATE INDEX IF NOT EXISTS monitoring_sessions_last_seen_idx ON public.monitoring_sessions (last_seen_at DESC);
CREATE INDEX IF NOT EXISTS monitoring_deliveries_time_idx ON public.monitoring_notification_deliveries (created_at DESC);
CREATE INDEX IF NOT EXISTS monitoring_alert_pending_idx ON public.monitoring_alert_queue (available_at) WHERE status IN ('pending','claimed');

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['monitoring_config','monitoring_installations','monitoring_sessions','monitoring_events','monitoring_issues','monitoring_rate_buckets','monitoring_notification_deliveries','monitoring_store_metrics','monitoring_sources','monitoring_sentry_issues','monitoring_alert_queue','monitoring_business_daily','monitoring_daily_metrics'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated,service_role',table_name);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.kws_monitoring_scrub(p_text text,p_limit integer)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT left(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(left(coalesce(p_text,''),8000),
    '(Bearer[[:space:]]+[^[:space:],;]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)','[redacted]','gi'),
    '(password|passwd|token|secret|authorization|cookie|apikey|api_key|access_token|refresh_token)["'']?[[:space:]]*[=:][[:space:]]*("[^"]*"|''[^'']*''|[^[:space:],;&]+)','[redacted]','gi'),
    '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}','[email]','g'),
    'https?://[^[:space:])>"'']+','[url]','gi'),
    '[?&#][^[:space:])>"'']+','[query]','g'),
    '[A-Za-z]:[\\/][^[:space:])>"'']+','[local-path]','gi'),
    '/(home|Users|private|var)/[^[:space:])>"'']+','[local-path]','g'),greatest(0,least(p_limit,2000)));
$$;

CREATE OR REPLACE FUNCTION public.kws_monitoring_props(p_props jsonb,p_error boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE result jsonb := '{}'::jsonb; property record; string_limit integer;
BEGIN
  IF jsonb_typeof(p_props) IS DISTINCT FROM 'object' THEN RETURN result; END IF;
  FOR property IN SELECT key,value FROM jsonb_each(p_props) LOOP
    IF property.key = 'screen' AND property.value #>> '{}' IN ('home','boulders','boulder','auth','profile','statistics','admin','other') THEN
      result := result || jsonb_build_object(property.key,property.value);
    ELSIF property.key = 'severity' AND property.value #>> '{}' IN ('info','warning','error','fatal') THEN
      result := result || jsonb_build_object(property.key,property.value);
    ELSIF property.key IN ('report_id','view_id','sector_id','notification_id') AND property.value #>> '{}' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
      result := result || jsonb_build_object(property.key,property.value);
    ELSIF property.key IN ('duration_ms','status_code','filter_count') AND jsonb_typeof(property.value) = 'number' THEN
      IF (property.value #>> '{}')::numeric BETWEEN 0 AND (CASE WHEN property.key = 'duration_ms' THEN 3600000 ELSE 1000 END) THEN
        result := result || jsonb_build_object(property.key,round((property.value #>> '{}')::numeric));
      END IF;
    ELSIF property.key IN ('code','message','stack','component','error_code','source','reason') AND jsonb_typeof(property.value) = 'string' AND (p_error OR property.key NOT IN ('message','stack')) THEN
      string_limit := CASE property.key WHEN 'message' THEN 500 WHEN 'stack' THEN 2000 WHEN 'component' THEN 100 WHEN 'reason' THEN 100 ELSE 80 END;
      result := result || jsonb_build_object(property.key,public.kws_monitoring_scrub(property.value #>> '{}',string_limit));
    END IF;
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.kws_monitoring_budget(p_key text,p_bucket timestamptz,p_limit integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE used integer;
BEGIN
  INSERT INTO public.monitoring_rate_buckets AS buckets (key,bucket,count) VALUES (p_key,p_bucket,1)
    ON CONFLICT (key,bucket) DO UPDATE SET count = buckets.count + 1 RETURNING count INTO used;
  IF used > p_limit THEN RAISE EXCEPTION 'Monitoring rate limited' USING ERRCODE = 'P4290'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.kws_monitoring_release_at_least(p_release text,p_fixed text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT p_release = p_fixed OR (
    regexp_match(p_release,'([0-9]+)\.([0-9]+)\.([0-9]+)')::numeric[] >=
    regexp_match(p_fixed,'([0-9]+)\.([0-9]+)\.([0-9]+)')::numeric[]);
$$;

CREATE OR REPLACE FUNCTION public.kws_ingest_monitoring_events(p_events jsonb,p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  item jsonb; event_uuid uuid; installation_uuid uuid; session_uuid uuid; boulder_uuid uuid;
  event_time timestamptz; event_name text; event_props jsonb; issue_key text; issue_title text;
  severity text; excluded_event boolean; same_event public.monitoring_events%ROWTYPE;
  accepted uuid[] := '{}'::uuid[]; rejected uuid[] := '{}'::uuid[];
BEGIN
  IF jsonb_typeof(p_events) IS DISTINCT FROM 'array' OR jsonb_array_length(p_events) NOT BETWEEN 1 AND 20 OR octet_length(p_events::text) > 120000 THEN
    RAISE EXCEPTION 'Invalid monitoring batch' USING ERRCODE = '22023';
  END IF;
  IF p_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Invalid monitoring account' USING ERRCODE = '42501';
  END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p_events) LOOP
    event_uuid := NULL;
    BEGIN
      event_uuid := (item->>'event_id')::uuid;
      installation_uuid := (item->>'installation_id')::uuid;
      session_uuid := (item->>'session_id')::uuid;
      boulder_uuid := nullif(item->>'boulder_id','')::uuid;
      event_time := (item->>'occurred_at')::timestamptz;
      event_name := item->>'name';
      IF event_uuid IS NULL OR installation_uuid IS NULL OR session_uuid IS NULL OR event_time IS NULL OR
        event_time NOT BETWEEN now() - interval '72 hours' AND now() + interval '5 minutes' OR
        coalesce(event_name,'') NOT IN ('first_open','session_start','app_ready','foreground','background','foreground_heartbeat','app_update_seen','screen_view','boulder_detail_view','play_requested','play_started','play_failed','play_completed','sector_open','filter_applied','search_used','signup_attempt','signup_failed','login_succeeded','login_failed','app_error','notification_opened','notification_client_received') OR
        coalesce(item->>'platform','') NOT IN ('web','android','ios') OR coalesce(item->>'consent','') NOT IN ('granted','denied') OR
        (event_name <> 'app_error' AND item->>'consent' <> 'granted') OR
        coalesce(item->>'app_version','') !~ '^[A-Za-z0-9._+-]{1,40}$' OR coalesce(item->>'release','') !~ '^[A-Za-z0-9@._+-]{1,120}$' OR
        coalesce(item->>'channel','') NOT IN ('production','testflight','apk','development','test') THEN
        RAISE EXCEPTION 'Invalid monitoring event';
      END IF;
      event_props := public.kws_monitoring_props(item->'props',event_name = 'app_error');
      IF event_name = 'app_error' AND coalesce(event_props->>'code',event_props->>'message','') = '' THEN RAISE EXCEPTION 'Missing error code'; END IF;
    EXCEPTION WHEN OTHERS THEN
      IF event_uuid IS NOT NULL THEN rejected := array_append(rejected,event_uuid); END IF;
      CONTINUE;
    END;
    PERFORM pg_advisory_xact_lock(hashtextextended(event_uuid::text,0));
    SELECT * INTO same_event FROM public.monitoring_events WHERE event_id = event_uuid;
    IF FOUND THEN
      IF same_event.installation_id = installation_uuid AND same_event.session_id = session_uuid AND same_event.user_id IS NOT DISTINCT FROM p_user_id THEN
        accepted := array_append(accepted,event_uuid);
      ELSE rejected := array_append(rejected,event_uuid); END IF;
      CONTINUE;
    END IF;
    IF EXISTS (SELECT 1 FROM public.monitoring_sessions WHERE id = session_uuid AND installation_id <> installation_uuid) OR
       EXISTS (SELECT 1 FROM public.monitoring_installations WHERE id = installation_uuid AND platform <> item->>'platform') THEN
      rejected := array_append(rejected,event_uuid); CONTINUE;
    END IF;
    PERFORM public.kws_monitoring_budget('global-minute',date_trunc('minute',now()),20000);
    PERFORM public.kws_monitoring_budget('global-day',date_trunc('day',now()),250000);
    PERFORM public.kws_monitoring_budget('installation:' || installation_uuid::text,date_trunc('minute',now()),200);
    PERFORM public.kws_monitoring_budget('installation-hour:' || installation_uuid::text,date_trunc('hour',now()),3000);
    excluded_event := item->>'channel' IN ('development','test') OR (p_user_id IS NOT NULL AND public.has_role(p_user_id,'admin'::text));
    INSERT INTO public.monitoring_installations AS installations (id,first_usage_at,first_boulder_at,platform,first_release,release,channel,excluded)
      VALUES (installation_uuid,CASE WHEN item->>'consent' = 'granted' THEN event_time END,CASE WHEN event_name = 'boulder_detail_view' THEN event_time END,item->>'platform',item->>'release',item->>'release',item->>'channel',excluded_event)
      ON CONFLICT (id) DO UPDATE SET last_seen_at = now(),release = EXCLUDED.release,channel = EXCLUDED.channel,
        first_release = CASE WHEN installations.first_usage_at IS NULL AND EXCLUDED.first_usage_at IS NOT NULL THEN EXCLUDED.first_release ELSE installations.first_release END,
        excluded = installations.excluded OR EXCLUDED.excluded,
        first_usage_at = least(installations.first_usage_at,EXCLUDED.first_usage_at),first_boulder_at = least(installations.first_boulder_at,EXCLUDED.first_boulder_at);
    INSERT INTO public.monitoring_sessions AS sessions (id,installation_id,user_id,started_at,usage_started_at,last_usage_at,last_seen_at,platform,release,channel,foreground,screen,boulder_id,excluded)
      VALUES (session_uuid,installation_uuid,p_user_id,event_time,CASE WHEN item->>'consent' = 'granted' THEN event_time END,CASE WHEN item->>'consent' = 'granted' THEN event_time END,event_time,item->>'platform',item->>'release',item->>'channel',event_name <> 'background' AND item->>'consent' = 'granted',CASE WHEN item->>'consent' = 'granted' THEN event_props->>'screen' END,CASE WHEN event_name = 'boulder_detail_view' THEN boulder_uuid END,excluded_event)
      ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id,usage_started_at = least(sessions.usage_started_at,EXCLUDED.usage_started_at),
        last_seen_at = greatest(sessions.last_seen_at,EXCLUDED.last_seen_at),last_usage_at = greatest(sessions.last_usage_at,EXCLUDED.last_usage_at),excluded = sessions.excluded OR EXCLUDED.excluded,
        foreground = CASE WHEN EXCLUDED.last_usage_at >= coalesce(sessions.last_usage_at,'-infinity'::timestamptz) THEN EXCLUDED.foreground ELSE sessions.foreground END,
        screen = CASE WHEN EXCLUDED.last_usage_at >= coalesce(sessions.last_usage_at,'-infinity'::timestamptz) THEN coalesce(EXCLUDED.screen,sessions.screen) ELSE sessions.screen END,
        boulder_id = CASE WHEN EXCLUDED.last_usage_at IS NULL OR EXCLUDED.last_usage_at < sessions.last_usage_at THEN sessions.boulder_id WHEN event_name = 'background' OR (event_props ? 'screen' AND event_props->>'screen' <> 'boulder') THEN NULL WHEN event_name = 'boulder_detail_view' THEN boulder_uuid ELSE sessions.boulder_id END;
    issue_key := NULL;
    IF event_name = 'app_error' THEN
      issue_title := coalesce(nullif(event_props->>'message',''),event_props->>'code','App error');
      severity := coalesce(event_props->>'severity','error');
      issue_key := md5(coalesce(event_props->>'code','') || '|' || coalesce(event_props->>'component','') || '|' || regexp_replace(left(issue_title,200),'[0-9]+','#','g') || '|' || regexp_replace(left(coalesce(event_props->>'stack',''),200),'[0-9]+','#','g'));
      INSERT INTO public.monitoring_issues AS issues (fingerprint,title,severity,first_seen_at,last_seen_at,last_release,last_platform)
        VALUES (issue_key,issue_title,severity,event_time,event_time,item->>'release',item->>'platform')
        ON CONFLICT (fingerprint) DO UPDATE SET occurrences = issues.occurrences + 1,
          first_seen_at = least(issues.first_seen_at,EXCLUDED.first_seen_at),last_seen_at = greatest(issues.last_seen_at,EXCLUDED.last_seen_at),
          last_release = EXCLUDED.last_release,last_platform = EXCLUDED.last_platform,
          severity = CASE WHEN EXCLUDED.severity = 'fatal' OR issues.severity = 'fatal' THEN 'fatal' WHEN EXCLUDED.severity = 'error' OR issues.severity = 'error' THEN 'error' WHEN EXCLUDED.severity = 'warning' OR issues.severity = 'warning' THEN 'warning' ELSE 'info' END,
          regression = issues.regression OR (issues.status = 'resolved' AND coalesce(public.kws_monitoring_release_at_least(EXCLUDED.last_release,issues.fixed_release),false)),
          status = CASE WHEN issues.status = 'resolved' AND coalesce(public.kws_monitoring_release_at_least(EXCLUDED.last_release,issues.fixed_release),false) THEN 'open' ELSE issues.status END;
    END IF;
    INSERT INTO public.monitoring_events (event_id,installation_id,session_id,user_id,name,occurred_at,platform,app_version,release,channel,consent,excluded,boulder_id,props,fingerprint)
      VALUES (event_uuid,installation_uuid,session_uuid,p_user_id,event_name,event_time,item->>'platform',item->>'app_version',item->>'release',item->>'channel',item->>'consent',excluded_event,boulder_uuid,event_props,issue_key);
    IF event_name IN ('notification_opened','notification_client_received') AND p_user_id IS NOT NULL AND event_props ? 'notification_id' AND EXISTS (SELECT 1 FROM public.notifications WHERE id = (event_props->>'notification_id')::uuid AND user_id = p_user_id) THEN
      PERFORM public.kws_monitoring_record_delivery((event_props->>'notification_id')::uuid,p_user_id,item->>'platform',CASE WHEN event_name = 'notification_opened' THEN 'opened' ELSE 'client_received' END);
    END IF;
    IF issue_key IS NOT NULL AND NOT excluded_event AND (severity = 'fatal' OR (SELECT count(DISTINCT installation_id) FROM public.monitoring_events WHERE fingerprint = issue_key AND NOT excluded AND received_at >= now() - interval '15 minutes') >= 5) THEN
      INSERT INTO public.monitoring_alert_queue (deduplication_key,fingerprint,event_count,affected_installations)
        SELECT issue_key || ':' || floor(extract(epoch FROM now()) / 1800)::text,issue_key,
          (SELECT count(*) FROM public.monitoring_events WHERE fingerprint = issue_key AND NOT excluded AND received_at >= now() - interval '15 minutes'),
          (SELECT count(DISTINCT installation_id) FROM public.monitoring_events WHERE fingerprint = issue_key AND NOT excluded AND received_at >= now() - interval '15 minutes')
        WHERE NOT EXISTS (SELECT 1 FROM public.monitoring_alert_queue WHERE fingerprint = issue_key AND created_at > now() - interval '30 minutes')
        ON CONFLICT (deduplication_key) DO NOTHING;
    END IF;
    accepted := array_append(accepted,event_uuid);
  END LOOP;
  RETURN jsonb_build_object('accepted_ids',to_jsonb(accepted),'rejected_ids',to_jsonb(rejected));
END;
$$;

CREATE OR REPLACE FUNCTION public.kws_monitoring_dashboard(p_days integer DEFAULT 1,p_platform text DEFAULT 'all',p_release text DEFAULT 'all')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result jsonb; period_start timestamptz; baseline timestamptz; latest timestamptz; salt text; selected_days integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin'::text) THEN RAISE EXCEPTION 'Administrator required' USING ERRCODE = '42501'; END IF;
  IF p_days NOT IN (1,7,30) OR p_platform NOT IN ('all','web','android','ios') OR length(p_release) > 120 THEN RAISE EXCEPTION 'Invalid dashboard filter' USING ERRCODE = '22023'; END IF;
  selected_days := p_days;
  period_start := (((now() AT TIME ZONE 'Europe/Berlin')::date - (selected_days - 1))::timestamp AT TIME ZONE 'Europe/Berlin');
  SELECT measurement_started_at,reference_salt::text INTO baseline,salt FROM public.monitoring_config;
  SELECT max(received_at) INTO latest FROM public.monitoring_events WHERE NOT excluded;
  WITH selected_events AS MATERIALIZED (
    SELECT * FROM public.monitoring_events WHERE occurred_at >= period_start AND occurred_at <= now() AND NOT excluded
      AND (p_platform = 'all' OR platform = p_platform) AND (p_release = 'all' OR release = p_release)
  ), usage_events AS MATERIALIZED (SELECT * FROM selected_events WHERE consent = 'granted'),
  selected_installations AS MATERIALIZED (
    SELECT * FROM public.monitoring_installations WHERE NOT excluded AND first_usage_at >= period_start AND first_usage_at <= now()
      AND (p_platform = 'all' OR platform = p_platform) AND (p_release = 'all' OR first_release = p_release)
  ), selected_sessions AS MATERIALIZED (
    SELECT * FROM public.monitoring_sessions WHERE NOT excluded AND usage_started_at >= period_start AND usage_started_at <= now()
      AND (p_platform = 'all' OR platform = p_platform) AND (p_release = 'all' OR release = p_release)
  ), issue_rows AS (
    SELECT issue.fingerprint,issue.title,issue.severity,min(event.occurred_at) AS first_seen_at,max(event.occurred_at) AS last_seen_at,
      count(*) AS occurrences,count(DISTINCT event.installation_id) AS affected_devices,max(event.release) AS release,max(event.platform) AS platform,
      issue.status,issue.fixed_release,issue.regression,'app'::text AS source,NULL::text AS permalink
    FROM public.monitoring_issues issue JOIN selected_events event ON event.fingerprint = issue.fingerprint
    GROUP BY issue.fingerprint,issue.title,issue.severity,issue.status,issue.fixed_release,issue.regression
    UNION ALL
    SELECT 'sentry:' || external_id,title,CASE WHEN level IN ('fatal','error','warning','info') THEN level ELSE 'error' END,first_seen_at,last_seen_at,
      count,user_count,NULL,NULL,status,NULL,false,'sentry',permalink
    FROM public.monitoring_sentry_issues WHERE last_seen_at >= period_start AND p_platform = 'all' AND p_release = 'all'
  ), daily_rows AS (
    SELECT days::date AS date,
      (SELECT count(*) FROM selected_installations WHERE platform <> 'web' AND (first_usage_at AT TIME ZONE 'Europe/Berlin')::date = days::date) AS first_opens,
      (SELECT count(*) FROM selected_sessions WHERE (usage_started_at AT TIME ZONE 'Europe/Berlin')::date = days::date) AS sessions,
      (SELECT count(DISTINCT event.session_id) FROM selected_events event JOIN selected_sessions session ON session.id = event.session_id WHERE event.name = 'app_error' AND coalesce(event.props->>'severity','error') IN ('error','fatal') AND (event.occurred_at AT TIME ZONE 'Europe/Berlin')::date = days::date) AS affected_sessions,
      (SELECT count(*) FROM usage_events WHERE name = 'boulder_detail_view' AND (occurred_at AT TIME ZONE 'Europe/Berlin')::date = days::date) AS boulder_views
    FROM generate_series((period_start AT TIME ZONE 'Europe/Berlin')::date,(now() AT TIME ZONE 'Europe/Berlin')::date,interval '1 day') days
  )
  SELECT jsonb_build_object(
    'schema_version',1,'generated_at',now(),'measurement_started_at',baseline,'latest_event_at',latest,
    'summary',jsonb_build_object(
      'first_opens',(SELECT count(*) FROM selected_installations WHERE platform <> 'web'),
      'web_first_opens',(SELECT count(*) FROM selected_installations WHERE platform = 'web'),
      'new_accounts',CASE WHEN p_platform = 'all' AND p_release = 'all' THEN (SELECT count(*) FROM auth.users WHERE created_at >= greatest(period_start,baseline) AND NOT public.has_role(id,'admin'::text)) END,
      'confirmed_accounts',CASE WHEN p_platform = 'all' AND p_release = 'all' THEN (SELECT count(*) FROM auth.users WHERE email_confirmed_at >= greatest(period_start,baseline) AND NOT public.has_role(id,'admin'::text)) END,
      'active_devices',(SELECT count(DISTINCT installation_id) FROM usage_events),
      'active_accounts',(SELECT count(DISTINCT user_id) FROM usage_events),
      'sessions',(SELECT count(*) FROM selected_sessions),
      'affected_sessions',(SELECT count(DISTINCT event.session_id) FROM selected_events event JOIN selected_sessions session ON session.id = event.session_id WHERE event.name = 'app_error' AND coalesce(event.props->>'severity','error') IN ('error','fatal')),
      'errors',(SELECT count(*) FROM selected_events WHERE name = 'app_error'),
      'activation_eligible',(SELECT count(*) FROM selected_installations WHERE first_usage_at <= now() - interval '24 hours'),
      'activated',(SELECT count(*) FROM selected_installations WHERE first_usage_at <= now() - interval '24 hours' AND first_boulder_at >= first_usage_at AND first_boulder_at <= first_usage_at + interval '24 hours'),
      'boulder_views',(SELECT count(*) FROM usage_events WHERE name = 'boulder_detail_view'),
      'video_started',(SELECT count(*) FROM usage_events WHERE name = 'play_started'),
      'video_failed',(SELECT count(*) FROM usage_events WHERE name = 'play_failed'),
      'ticks_saved',CASE WHEN p_platform = 'all' AND p_release = 'all' THEN (SELECT coalesce(sum(count),0) FROM public.monitoring_business_daily WHERE date >= (period_start AT TIME ZONE 'Europe/Berlin')::date AND name = 'tick_saved') END,
      'favorites_added',CASE WHEN p_platform = 'all' AND p_release = 'all' THEN (SELECT coalesce(sum(count),0) FROM public.monitoring_business_daily WHERE date >= (period_start AT TIME ZONE 'Europe/Berlin')::date AND name = 'favorite_added') END,
      'projects_added',CASE WHEN p_platform = 'all' AND p_release = 'all' THEN (SELECT coalesce(sum(count),0) FROM public.monitoring_business_daily WHERE date >= (period_start AT TIME ZONE 'Europe/Berlin')::date AND name = 'project_added') END),
    'daily',coalesce((SELECT jsonb_agg(to_jsonb(daily_rows) ORDER BY date) FROM daily_rows),'[]'::jsonb),
    'releases',coalesce((SELECT jsonb_agg(release ORDER BY release) FROM (SELECT DISTINCT release FROM public.monitoring_events WHERE received_at >= now() - interval '90 days' AND NOT excluded ORDER BY release LIMIT 100) versions),'[]'::jsonb),
    'issues',coalesce((SELECT jsonb_agg(to_jsonb(problem) ORDER BY last_seen_at DESC) FROM (SELECT * FROM issue_rows ORDER BY last_seen_at DESC LIMIT 100) problem),'[]'::jsonb),
    'activity',coalesce((SELECT jsonb_agg(to_jsonb(active) ORDER BY last_seen_at DESC) FROM (
      SELECT left(md5(session.installation_id::text || salt),12) AS installation_ref,CASE WHEN session.user_id IS NOT NULL THEN left(md5(session.user_id::text || salt),12) END AS user_ref,
        session.platform,session.release,session.last_usage_at AS last_seen_at,session.screen,session.boulder_id
      FROM public.monitoring_sessions session WHERE session.usage_started_at IS NOT NULL AND session.foreground AND NOT session.excluded AND session.last_usage_at >= now() - interval '3 minutes'
        AND (p_platform = 'all' OR session.platform = p_platform) AND (p_release = 'all' OR session.release = p_release)
        AND NOT EXISTS (SELECT 1 FROM public.monitoring_sessions newer WHERE newer.installation_id = session.installation_id AND newer.last_usage_at > session.last_usage_at)
      ORDER BY session.last_usage_at DESC LIMIT 50) active),'[]'::jsonb),
    'top_boulders',coalesce((SELECT jsonb_agg(to_jsonb(popular) ORDER BY views DESC) FROM (
      SELECT event.boulder_id AS id,coalesce(boulder.name,'Entfernter Boulder') AS name,count(*) AS views FROM usage_events event
      LEFT JOIN public.boulders boulder ON boulder.id = event.boulder_id WHERE event.name = 'boulder_detail_view' AND event.boulder_id IS NOT NULL
      GROUP BY event.boulder_id,boulder.name ORDER BY count(*) DESC LIMIT 10) popular),'[]'::jsonb),
    'deliveries',coalesce((SELECT jsonb_agg(to_jsonb(delivery) ORDER BY created_at DESC) FROM (
      SELECT id,notification_id,CASE WHEN user_id IS NOT NULL THEN left(md5(user_id::text || salt),12) END AS recipient_ref,platform,status,code,created_at
      FROM public.monitoring_notification_deliveries WHERE created_at >= period_start AND (p_platform = 'all' OR platform = p_platform) ORDER BY created_at DESC LIMIT 100) delivery),'[]'::jsonb),
    'store_metrics',coalesce((SELECT jsonb_agg(to_jsonb(metric) ORDER BY metric_date DESC) FROM (
      SELECT source,metric,definition,source_period_start,source_period_end,source_timezone,metric_date,value,app_identifier,channel,imported_at
      FROM public.monitoring_store_metrics WHERE metric_date >= (period_start AT TIME ZONE 'Europe/Berlin')::date ORDER BY metric_date DESC LIMIT 300) metric),'[]'::jsonb),
    'sources',jsonb_build_object(
      'collector',jsonb_build_object('state',CASE WHEN latest IS NULL THEN 'empty' WHEN latest < now() - interval '24 hours' THEN 'stale' ELSE 'ready' END,'last_updated_at',latest,'detail','Eigene Erfassung ab Messbeginn; Nutzungszahlen nur mit Einwilligung. Erste Beobachtungen sind keine Store-Downloads. Admin-/Testereignisse ausgeschlossen. Kontenzahlen sind nur ohne Plattform-/Releasefilter zuordenbar.'),
      'issues',jsonb_build_object('state',CASE WHEN latest IS NULL THEN 'empty' ELSE 'ready' END,'last_updated_at',(SELECT max(received_at) FROM public.monitoring_events WHERE name = 'app_error' AND NOT excluded),'detail','Eigene JS-Fehlerberichte; Sentry: ' || (SELECT status FROM public.monitoring_sources WHERE source = 'sentry') || '; E-Mail-Alarme: ' || (SELECT status FROM public.monitoring_sources WHERE source = 'alerts') || '. Sentry-Status bleibt extern führend. Historischer Feedbackbestand bleibt separat.'),
      'notifications',jsonb_build_object('state',CASE WHEN EXISTS (SELECT 1 FROM public.monitoring_notification_deliveries) THEN 'ready' ELSE 'empty' END,'last_updated_at',(SELECT max(created_at) FROM public.monitoring_notification_deliveries),'detail','Dauerhafte Zustandsereignisse ab Messbeginn. Providerannahme beweist keine Anzeige am Gerät; In-App-Status und Pushzustände bleiben getrennt.'),
      'stores',jsonb_build_object('state',CASE WHEN (SELECT status FROM public.monitoring_sources WHERE source = 'stores') = 'error' THEN 'error' WHEN NOT EXISTS (SELECT 1 FROM public.monitoring_store_metrics) THEN 'unconfigured' WHEN (SELECT max(imported_at) FROM public.monitoring_store_metrics) < now() - interval '72 hours' OR (SELECT max(source_period_end) FROM public.monitoring_store_metrics) < now() - interval '72 hours' THEN 'stale' ELSE 'ready' END,'last_updated_at',(SELECT max(imported_at) FROM public.monitoring_store_metrics),'detail','Offizielle Vertriebsdaten nur aus verbundenen/importierten Quellberichten; Erststarts und Konten werden nicht addiert.')))
  INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.kws_monitoring_issue_status(p_fingerprint text,p_status text,p_fixed_release text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin'::text) THEN RAISE EXCEPTION 'Administrator required' USING ERRCODE = '42501'; END IF;
  IF p_status NOT IN ('open','acknowledged','resolved') OR length(coalesce(p_fixed_release,'')) > 120 OR (p_status = 'resolved' AND nullif(p_fixed_release,'') IS NULL) THEN RAISE EXCEPTION 'Invalid issue status or missing fix release' USING ERRCODE = '22023'; END IF;
  UPDATE public.monitoring_issues SET status = p_status,fixed_release = CASE WHEN p_status = 'resolved' THEN p_fixed_release ELSE NULL END,regression = false WHERE fingerprint = p_fingerprint;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown local issue' USING ERRCODE = '22023'; END IF;
  RETURN jsonb_build_object('fingerprint',p_fingerprint,'status',p_status,'fixed_release',CASE WHEN p_status = 'resolved' THEN p_fixed_release END);
END;
$$;

CREATE OR REPLACE FUNCTION public.kws_monitoring_issue_events(p_fingerprint text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result jsonb; salt text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin'::text) THEN RAISE EXCEPTION 'Administrator required' USING ERRCODE = '42501'; END IF;
  SELECT reference_salt::text INTO salt FROM public.monitoring_config;
  SELECT coalesce(jsonb_agg(to_jsonb(event) ORDER BY received_at DESC),'[]'::jsonb) INTO result FROM (
    SELECT event_id,occurred_at,received_at,platform,release,left(md5(installation_id::text || salt),12) AS installation_ref,
      CASE WHEN user_id IS NOT NULL THEN left(md5(user_id::text || salt),12) END AS user_ref,left(md5(session_id::text || salt),12) AS session_ref,props
    FROM public.monitoring_events WHERE fingerprint = p_fingerprint AND NOT excluded ORDER BY received_at DESC LIMIT 50) event;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.kws_monitoring_record_delivery(p_notification_id uuid,p_user_id uuid,p_platform text,p_status text,p_code text DEFAULT NULL,p_provider_id text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE delivery_uuid uuid;
BEGIN
  IF p_platform NOT IN ('web','android','ios','in_app','unknown') OR p_status NOT IN ('created','dispatch_attempt','provider_accepted','provider_rejected','client_received','opened','in_app_read','dismissed','failed','uncertain','unsupported','disabled') THEN RAISE EXCEPTION 'Invalid delivery status' USING ERRCODE = '22023'; END IF;
  IF p_notification_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.notifications WHERE id = p_notification_id AND user_id = p_user_id) THEN p_notification_id := NULL; END IF;
  INSERT INTO public.monitoring_notification_deliveries (notification_id,user_id,platform,status,code,provider_id)
    VALUES (p_notification_id,p_user_id,p_platform,p_status,public.kws_monitoring_scrub(p_code,100),CASE WHEN p_provider_id ~ '^[A-Za-z0-9:/._-]{1,200}$' THEN p_provider_id END)
    RETURNING id INTO delivery_uuid;
  RETURN delivery_uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.kws_monitoring_notification_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.kws_monitoring_record_delivery(NEW.id,NEW.user_id,'in_app','created',NEW.type);
  ELSE
    IF NEW.read AND NOT OLD.read THEN PERFORM public.kws_monitoring_record_delivery(NEW.id,NEW.user_id,'in_app','in_app_read',NEW.type); END IF;
    IF NEW.dismissed_at IS NOT NULL AND OLD.dismissed_at IS NULL THEN PERFORM public.kws_monitoring_record_delivery(NEW.id,NEW.user_id,'in_app','dismissed',NEW.type); END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS kws_monitoring_notification_audit ON public.notifications;
CREATE TRIGGER kws_monitoring_notification_audit AFTER INSERT OR UPDATE OF read,dismissed_at ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.kws_monitoring_notification_audit();

CREATE OR REPLACE FUNCTION public.kws_monitoring_business_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE action_name text; actions text[] := '{}'::text[]; current_row jsonb := to_jsonb(NEW); previous_row jsonb;
BEGIN
  IF public.has_role((current_row->>'user_id')::uuid,'admin'::text) THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN previous_row := to_jsonb(OLD); END IF;
  IF TG_TABLE_NAME = 'boulder_ticks' THEN
    IF TG_OP = 'INSERT' OR current_row->>'status' IS DISTINCT FROM previous_row->>'status' OR current_row->>'attempt_count' IS DISTINCT FROM previous_row->>'attempt_count' THEN actions := array_append(actions,'tick_saved'); END IF;
    IF coalesce((current_row->>'is_favorite')::boolean,false) AND NOT coalesce((previous_row->>'is_favorite')::boolean,false) THEN actions := array_append(actions,'favorite_added'); END IF;
    IF coalesce((current_row->>'is_project')::boolean,false) AND NOT coalesce((previous_row->>'is_project')::boolean,false) THEN actions := array_append(actions,'project_added'); END IF;
  ELSIF TG_TABLE_NAME = 'boulder_tracking_sessions' AND TG_OP = 'INSERT' THEN
    actions := array_append(actions,'tracking_session_saved');
  END IF;
  FOREACH action_name IN ARRAY actions LOOP
    INSERT INTO public.monitoring_business_daily AS counters (date,name,count) VALUES ((now() AT TIME ZONE 'Europe/Berlin')::date,action_name,1)
      ON CONFLICT (date,name) DO UPDATE SET count = counters.count + 1;
  END LOOP;
  RETURN NEW;
END;
$$;
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['boulder_ticks','boulder_tracking_sessions'] LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS kws_monitoring_business_audit ON public.%I',table_name);
      EXECUTE format('CREATE TRIGGER kws_monitoring_business_audit AFTER INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.kws_monitoring_business_audit()',table_name);
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.kws_monitoring_import_store_metrics(p_metrics jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE item jsonb; imported integer := 0;
BEGIN
  IF jsonb_typeof(p_metrics) IS DISTINCT FROM 'array' OR jsonb_array_length(p_metrics) > 1000 OR octet_length(p_metrics::text) > 1000000 THEN RAISE EXCEPTION 'Invalid store import' USING ERRCODE = '22023'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p_metrics) LOOP
    IF coalesce(item->>'source','') || ':' || coalesce(item->>'metric','') NOT IN ('app_store:first_time_downloads','app_store:redownloads','testflight:installations','testflight:sessions','testflight:crashes','google_play:new_users','google_play:new_devices','google_play:install_events') OR
      coalesce(item->>'value','') !~ '^[0-9]{1,15}$' OR coalesce(item->>'source_revision','') !~ '^[A-Za-z0-9._-]{1,128}$' OR
      length(coalesce(item->>'definition','')) NOT BETWEEN 1 AND 500 OR length(coalesce(item->>'app_identifier','')) NOT BETWEEN 1 AND 200 OR
      coalesce(item->>'channel','') NOT IN ('app_store','testflight','google_play') OR NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = item->>'source_timezone') THEN
      RAISE EXCEPTION 'Invalid store metric' USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.monitoring_store_metrics (source,metric,definition,metric_date,value,source_period_start,source_period_end,source_timezone,app_identifier,channel,source_revision)
      VALUES (item->>'source',item->>'metric',public.kws_monitoring_scrub(item->>'definition',500),(item->>'metric_date')::date,(item->>'value')::bigint,(item->>'source_period_start')::timestamptz,(item->>'source_period_end')::timestamptz,item->>'source_timezone',public.kws_monitoring_scrub(item->>'app_identifier',200),item->>'channel',item->>'source_revision')
      ON CONFLICT (source,metric,metric_date,app_identifier,channel) DO UPDATE SET definition = EXCLUDED.definition,value = EXCLUDED.value,source_period_start = EXCLUDED.source_period_start,source_period_end = EXCLUDED.source_period_end,source_timezone = EXCLUDED.source_timezone,source_revision = EXCLUDED.source_revision,imported_at = now();
    imported := imported + 1;
  END LOOP;
  IF imported > 0 THEN UPDATE public.monitoring_sources SET status = 'connected',code = NULL,updated_at = now(),last_success_at = now() WHERE source = 'stores'; END IF;
  RETURN jsonb_build_object('imported',imported);
END;
$$;

CREATE OR REPLACE FUNCTION public.kws_monitoring_update_source(p_source text,p_status text,p_code text DEFAULT NULL,p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE safe_metadata jsonb := '{}'::jsonb; property record;
BEGIN
  IF p_source NOT IN ('sentry','stores','alerts') OR p_status NOT IN ('not_connected','disabled','connected','partial','error','unsupported') OR jsonb_typeof(p_metadata) IS DISTINCT FROM 'object' OR octet_length(p_metadata::text) > 2000 THEN RAISE EXCEPTION 'Invalid monitoring source' USING ERRCODE = '22023'; END IF;
  FOR property IN SELECT key,value FROM jsonb_each(p_metadata) LOOP
    IF property.key IN ('source','revision','metric_count','project_slug') AND jsonb_typeof(property.value) IN ('string','number','boolean') THEN safe_metadata := safe_metadata || jsonb_build_object(property.key,public.kws_monitoring_scrub(property.value #>> '{}',120)); END IF;
  END LOOP;
  UPDATE public.monitoring_sources SET status = p_status,code = public.kws_monitoring_scrub(p_code,100),metadata = safe_metadata,updated_at = now(),last_success_at = CASE WHEN p_status = 'connected' THEN now() ELSE last_success_at END WHERE source = p_source;
END;
$$;

CREATE OR REPLACE FUNCTION public.kws_monitoring_import_sentry_issues(p_issues jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE item jsonb; external_id text; imported integer := 0; previous_seen timestamptz; previous_status text;
BEGIN
  IF jsonb_typeof(p_issues) IS DISTINCT FROM 'array' OR jsonb_array_length(p_issues) > 1000 OR octet_length(p_issues::text) > 2000000 THEN RAISE EXCEPTION 'Invalid issue import' USING ERRCODE = '22023'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p_issues) LOOP
    external_id := coalesce(item->>'external_id',item->>'id');
    IF external_id IS NULL OR external_id !~ '^[A-Za-z0-9_-]{1,100}$' OR coalesce(item->>'count','') !~ '^[0-9]{1,15}$' OR coalesce(item->>'user_count','') !~ '^[0-9]{1,15}$' OR coalesce(item->>'status','') NOT IN ('unresolved','resolved','ignored') OR coalesce(item->>'level','') NOT IN ('fatal','error','warning','info','debug') THEN RAISE EXCEPTION 'Invalid Sentry issue' USING ERRCODE = '22023'; END IF;
    SELECT issues.last_seen_at,issues.status INTO previous_seen,previous_status FROM public.monitoring_sentry_issues issues WHERE issues.external_id = coalesce(item->>'external_id',item->>'id');
    INSERT INTO public.monitoring_sentry_issues AS issues (external_id,title,status,level,first_seen_at,last_seen_at,count,user_count,permalink,short_id,project_slug)
      VALUES (external_id,public.kws_monitoring_scrub(item->>'title',500),item->>'status',item->>'level',(coalesce(item->>'first_seen',item->>'first_seen_at'))::timestamptz,(coalesce(item->>'last_seen',item->>'last_seen_at'))::timestamptz,(item->>'count')::bigint,(item->>'user_count')::bigint,
        CASE WHEN item->>'permalink' ~ '^https://[A-Za-z0-9.-]+\.sentry\.io/[^?#[:space:]]*$' OR item->>'permalink' ~ '^https://sentry\.io/[^?#[:space:]]*$' THEN left(item->>'permalink',500) END,
        public.kws_monitoring_scrub(item->>'short_id',100),public.kws_monitoring_scrub(item->>'project_slug',100))
      ON CONFLICT ON CONSTRAINT monitoring_sentry_issues_pkey DO UPDATE SET title = EXCLUDED.title,status = EXCLUDED.status,level = EXCLUDED.level,first_seen_at = EXCLUDED.first_seen_at,last_seen_at = EXCLUDED.last_seen_at,count = EXCLUDED.count,user_count = EXCLUDED.user_count,permalink = EXCLUDED.permalink,short_id = EXCLUDED.short_id,project_slug = EXCLUDED.project_slug,imported_at = now();
    IF item->>'status' = 'unresolved' AND item->>'level' = 'fatal' AND (coalesce(item->>'last_seen',item->>'last_seen_at'))::timestamptz >= now() - interval '24 hours' AND
      (previous_seen IS NULL OR previous_status = 'resolved' OR (coalesce(item->>'last_seen',item->>'last_seen_at'))::timestamptz > previous_seen) THEN
      INSERT INTO public.monitoring_alert_queue (deduplication_key,external_id,source,event_count,affected_installations)
        SELECT 'sentry:' || external_id || ':' || floor(extract(epoch FROM now()) / 1800)::text,external_id,'sentry',(item->>'count')::bigint,0
        WHERE NOT EXISTS (SELECT 1 FROM public.monitoring_alert_queue queue WHERE queue.external_id = coalesce(item->>'external_id',item->>'id') AND created_at > now() - interval '30 minutes')
        ON CONFLICT (deduplication_key) DO NOTHING;
    END IF;
    imported := imported + 1;
  END LOOP;
  UPDATE public.monitoring_sources SET status = 'connected',code = NULL,updated_at = now(),last_success_at = now() WHERE source = 'sentry';
  RETURN jsonb_build_object('imported',imported);
END;
$$;

CREATE OR REPLACE FUNCTION public.kws_monitoring_claim_alerts(p_limit integer DEFAULT 20)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result jsonb;
BEGIN
  IF p_limit NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Invalid claim limit'; END IF;
  WITH candidates AS (
    SELECT id FROM public.monitoring_alert_queue WHERE attempts < 5 AND ((status = 'pending' AND available_at <= now()) OR (status = 'claimed' AND claimed_at < now() - interval '10 minutes')) ORDER BY created_at LIMIT p_limit FOR UPDATE SKIP LOCKED
  ), claimed AS (
    UPDATE public.monitoring_alert_queue queue SET status = 'claimed',claimed_at = now(),lease_token = gen_random_uuid(),attempts = attempts + 1 FROM candidates WHERE queue.id = candidates.id RETURNING queue.*
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',claimed.id,'lease_token',claimed.lease_token,'fingerprint',coalesce(claimed.fingerprint,'sentry:' || claimed.external_id),'severity',coalesce(issue.severity,sentry.level),'source',claimed.source,'count',claimed.event_count,'affected_installations',claimed.affected_installations,'first_seen_at',coalesce(issue.first_seen_at,sentry.first_seen_at),'last_seen_at',coalesce(issue.last_seen_at,sentry.last_seen_at),'safe_title',coalesce(issue.title,sentry.title))),'[]'::jsonb)
    INTO result FROM claimed LEFT JOIN public.monitoring_issues issue ON issue.fingerprint = claimed.fingerprint LEFT JOIN public.monitoring_sentry_issues sentry ON sentry.external_id = claimed.external_id;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.kws_monitoring_complete_alert(p_id uuid,p_lease_token uuid,p_status text,p_code text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF p_status NOT IN ('accepted','failed','uncertain') THEN RAISE EXCEPTION 'Invalid alert outcome'; END IF;
  UPDATE public.monitoring_alert_queue SET status = CASE WHEN p_status = 'failed' AND attempts < 5 THEN 'pending' ELSE p_status END,
    code = public.kws_monitoring_scrub(p_code,100),available_at = now() + interval '5 minutes',completed_at = CASE WHEN p_status <> 'failed' OR attempts >= 5 THEN now() END
    WHERE id = p_id AND status = 'claimed' AND lease_token = p_lease_token;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid or expired alert lease'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.kws_monitoring_retain()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE removed_events integer; removed_sessions integer;
BEGIN
  INSERT INTO public.monitoring_daily_metrics (date,platform,release,channel,metrics)
    SELECT (occurred_at AT TIME ZONE 'Europe/Berlin')::date,platform,release,channel,
      jsonb_build_object('events',count(*),'active_devices',count(DISTINCT installation_id),
        'active_accounts',count(DISTINCT user_id),'sessions',count(DISTINCT session_id),
        'boulder_views',count(*) FILTER (WHERE name = 'boulder_detail_view'),
        'video_started',count(*) FILTER (WHERE name = 'play_started'),
        'video_failed',count(*) FILTER (WHERE name = 'play_failed'),
        'errors',count(*) FILTER (WHERE name = 'app_error'))
    FROM public.monitoring_events WHERE NOT excluded AND consent = 'granted' AND occurred_at >= now() - interval '30 days'
    GROUP BY (occurred_at AT TIME ZONE 'Europe/Berlin')::date,platform,release,channel
    ON CONFLICT (date,platform,release,channel) DO UPDATE SET metrics = EXCLUDED.metrics,updated_at = now();
  DELETE FROM public.monitoring_events WHERE (name <> 'app_error' AND received_at < now() - interval '30 days') OR received_at < now() - interval '90 days';
  GET DIAGNOSTICS removed_events = ROW_COUNT;
  DELETE FROM public.monitoring_sessions session WHERE last_seen_at < now() - interval '90 days' AND NOT EXISTS (SELECT 1 FROM public.monitoring_events WHERE session_id = session.id);
  GET DIAGNOSTICS removed_sessions = ROW_COUNT;
  DELETE FROM public.monitoring_installations installation WHERE last_seen_at < now() - interval '90 days' AND NOT EXISTS (SELECT 1 FROM public.monitoring_sessions WHERE installation_id = installation.id);
  DELETE FROM public.monitoring_issues WHERE last_seen_at < now() - interval '90 days';
  DELETE FROM public.monitoring_notification_deliveries WHERE created_at < now() - interval '90 days';
  DELETE FROM public.monitoring_rate_buckets WHERE bucket < now() - interval '2 days';
  DELETE FROM public.monitoring_alert_queue WHERE created_at < now() - interval '90 days';
  DELETE FROM public.monitoring_store_metrics WHERE metric_date < current_date - 366;
  DELETE FROM public.monitoring_sentry_issues WHERE last_seen_at < now() - interval '90 days';
  DELETE FROM public.monitoring_business_daily WHERE date < current_date - 366;
  DELETE FROM public.monitoring_daily_metrics WHERE date < current_date - 366;
  RETURN jsonb_build_object('events_removed',removed_events,'sessions_removed',removed_sessions);
END;
$$;

CREATE OR REPLACE FUNCTION public.kws_monitoring_erase_account()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  DELETE FROM public.monitoring_events WHERE user_id = OLD.id;
  DELETE FROM public.monitoring_sessions WHERE user_id = OLD.id;
  DELETE FROM public.monitoring_notification_deliveries WHERE user_id = OLD.id;
  RETURN OLD;
END;
$$;
DROP TRIGGER IF EXISTS kws_monitoring_erase_account ON auth.users;
CREATE TRIGGER kws_monitoring_erase_account BEFORE DELETE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.kws_monitoring_erase_account();

DO $$
DECLARE routine record;
BEGIN
  FOR routine IN SELECT oid::regprocedure AS signature,proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND (proname LIKE 'kws_monitoring_%' OR proname = 'kws_ingest_monitoring_events') LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',routine.signature);
    IF routine.proname IN ('kws_monitoring_dashboard','kws_monitoring_issue_status','kws_monitoring_issue_events') THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',routine.signature);
    ELSIF routine.proname NOT IN ('kws_monitoring_scrub','kws_monitoring_props','kws_monitoring_budget','kws_monitoring_release_at_least','kws_monitoring_notification_audit','kws_monitoring_business_audit','kws_monitoring_erase_account') THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',routine.signature);
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst,'reload schema';
COMMIT;
