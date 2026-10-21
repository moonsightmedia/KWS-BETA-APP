-- Admin usage stays excluded from analytics; real production diagnostics are visible.
-- No historical alert replay and no permission changes.
BEGIN;
CREATE OR REPLACE FUNCTION public.kws_ingest_monitoring_events(p_events jsonb,p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  item jsonb; event_uuid uuid; installation_uuid uuid; session_uuid uuid; boulder_uuid uuid;
  event_time timestamptz; event_name text; event_props jsonb; issue_key text; issue_title text;
  severity text; excluded_event boolean; excluded_usage boolean; same_event public.monitoring_events%ROWTYPE;
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
    excluded_usage := item->>'channel' IN ('development','test') OR (p_user_id IS NOT NULL AND public.has_role(p_user_id,'admin'::text));
    excluded_event := item->>'channel' IN ('development','test') OR (event_name <> 'app_error' AND excluded_usage);
    INSERT INTO public.monitoring_installations AS installations (id,first_usage_at,first_boulder_at,platform,first_release,release,channel,excluded)
      VALUES (installation_uuid,CASE WHEN item->>'consent' = 'granted' THEN event_time END,CASE WHEN event_name = 'boulder_detail_view' THEN event_time END,item->>'platform',item->>'release',item->>'release',item->>'channel',excluded_usage)
      ON CONFLICT (id) DO UPDATE SET last_seen_at = now(),release = EXCLUDED.release,channel = EXCLUDED.channel,
        first_release = CASE WHEN installations.first_usage_at IS NULL AND EXCLUDED.first_usage_at IS NOT NULL THEN EXCLUDED.first_release ELSE installations.first_release END,
        excluded = installations.excluded OR EXCLUDED.excluded,
        first_usage_at = least(installations.first_usage_at,EXCLUDED.first_usage_at),first_boulder_at = least(installations.first_boulder_at,EXCLUDED.first_boulder_at);
    INSERT INTO public.monitoring_sessions AS sessions (id,installation_id,user_id,started_at,usage_started_at,last_usage_at,last_seen_at,platform,release,channel,foreground,screen,boulder_id,excluded)
      VALUES (session_uuid,installation_uuid,p_user_id,event_time,CASE WHEN item->>'consent' = 'granted' THEN event_time END,CASE WHEN item->>'consent' = 'granted' THEN event_time END,event_time,item->>'platform',item->>'release',item->>'channel',event_name <> 'background' AND item->>'consent' = 'granted',CASE WHEN item->>'consent' = 'granted' THEN event_props->>'screen' END,CASE WHEN event_name = 'boulder_detail_view' THEN boulder_uuid END,excluded_usage)
      ON CONFLICT (id) DO UPDATE SET user_id = CASE WHEN event_name = 'app_error' THEN sessions.user_id ELSE EXCLUDED.user_id END,usage_started_at = least(sessions.usage_started_at,EXCLUDED.usage_started_at),
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
  ), usage_events AS MATERIALIZED (SELECT * FROM selected_events WHERE consent = 'granted' AND name <> 'app_error'),
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
      'collector',jsonb_build_object('state',CASE WHEN latest IS NULL THEN 'empty' WHEN latest < now() - interval '24 hours' THEN 'stale' ELSE 'ready' END,'last_updated_at',latest,'detail','Eigene Erfassung ab Messbeginn; Nutzungszahlen nur mit Einwilligung. Erste Beobachtungen sind keine Store-Downloads. Admin-Nutzung und Testereignisse ausgeschlossen; echte Admin-Fehler sichtbar. Kontenzahlen sind nur ohne Plattform-/Releasefilter zuordenbar.'),
      'issues',jsonb_build_object('state',CASE WHEN latest IS NULL THEN 'empty' ELSE 'ready' END,'last_updated_at',(SELECT max(received_at) FROM public.monitoring_events WHERE name = 'app_error' AND NOT excluded),'detail','Eigene JS-Fehlerberichte; Sentry: ' || (SELECT status FROM public.monitoring_sources WHERE source = 'sentry') || '; E-Mail-Alarme: ' || (SELECT status FROM public.monitoring_sources WHERE source = 'alerts') || '. Sentry-Status bleibt extern führend. Historischer Feedbackbestand bleibt separat.'),
      'notifications',jsonb_build_object('state',CASE WHEN EXISTS (SELECT 1 FROM public.monitoring_notification_deliveries) THEN 'ready' ELSE 'empty' END,'last_updated_at',(SELECT max(created_at) FROM public.monitoring_notification_deliveries),'detail','Dauerhafte Zustandsereignisse ab Messbeginn. Providerannahme beweist keine Anzeige am Gerät; In-App-Status und Pushzustände bleiben getrennt.'),
      'stores',jsonb_build_object('state',CASE WHEN (SELECT status FROM public.monitoring_sources WHERE source = 'stores') = 'error' THEN 'error' WHEN NOT EXISTS (SELECT 1 FROM public.monitoring_store_metrics) THEN 'unconfigured' WHEN (SELECT max(imported_at) FROM public.monitoring_store_metrics) < now() - interval '72 hours' OR (SELECT max(source_period_end) FROM public.monitoring_store_metrics) < now() - interval '72 hours' THEN 'stale' ELSE 'ready' END,'last_updated_at',(SELECT max(imported_at) FROM public.monitoring_store_metrics),'detail','Offizielle Vertriebsdaten nur aus verbundenen/importierten Quellberichten; Erststarts und Konten werden nicht addiert.')))
  INTO result;
  RETURN result;
END;
$$;

UPDATE public.monitoring_events
SET excluded = false
WHERE name = 'app_error' AND excluded
  AND channel IN ('production','testflight','apk')
  AND user_id IS NOT NULL AND public.has_role(user_id,'admin'::text);
COMMIT;
