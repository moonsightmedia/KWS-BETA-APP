BEGIN;

CREATE TABLE IF NOT EXISTS public.monitoring_live_presence (
  instance_id uuid PRIMARY KEY,
  installation_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  sequence bigint NOT NULL CHECK (sequence > 0),
  active boolean NOT NULL,
  platform text NOT NULL CHECK (platform IN ('web','android','ios')),
  release text NOT NULL CHECK (length(release) BETWEEN 1 AND 120),
  screen text NOT NULL CHECK (screen IN ('home','boulders','boulder','auth','profile','statistics','admin','other')),
  boulder_id uuid,
  updated_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  excluded boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS monitoring_live_presence_expiry ON public.monitoring_live_presence (expires_at);
ALTER TABLE public.monitoring_live_presence ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.monitoring_live_presence FROM PUBLIC,anon,authenticated;

CREATE TABLE IF NOT EXISTS public.monitoring_live_revision (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  revision uuid NOT NULL DEFAULT gen_random_uuid()
);
INSERT INTO public.monitoring_live_revision DEFAULT VALUES ON CONFLICT DO NOTHING;
ALTER TABLE public.monitoring_live_revision ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.monitoring_live_revision FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.monitoring_live_revision TO authenticated;
DROP POLICY IF EXISTS monitoring_live_admin ON public.monitoring_live_revision;
CREATE POLICY monitoring_live_admin ON public.monitoring_live_revision FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::text));

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'monitoring_live_revision'
  ) THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.monitoring_live_revision; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.kws_monitoring_presence(p_presence jsonb,p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public,pg_temp AS $$
DECLARE
  instance_uuid uuid; installation_uuid uuid; sequence_value bigint; active_value boolean;
  boulder_uuid uuid; existing public.monitoring_live_presence%ROWTYPE;
  excluded_value boolean;
BEGIN
  instance_uuid := (p_presence->>'instance_id')::uuid;
  installation_uuid := (p_presence->>'installation_id')::uuid;
  sequence_value := (p_presence->>'sequence')::bigint;
  active_value := (p_presence->>'active')::boolean;
  boulder_uuid := nullif(p_presence->>'boulder_id','')::uuid;
  IF instance_uuid IS NULL OR installation_uuid IS NULL OR sequence_value IS NULL OR sequence_value < 1 OR sequence_value > 9007199254740991 OR active_value IS NULL
    OR coalesce(p_presence->>'platform','') NOT IN ('web','android','ios')
    OR coalesce(p_presence->>'release','') !~ '^[A-Za-z0-9@._+-]{1,120}$'
    OR coalesce(p_presence->>'channel','') NOT IN ('production','testflight','apk','development','test')
    OR coalesce(p_presence->>'screen','') NOT IN ('home','boulders','boulder','auth','profile','statistics','admin','other') THEN
    RAISE EXCEPTION 'Invalid presence' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(instance_uuid::text,8));
  SELECT * INTO existing FROM public.monitoring_live_presence WHERE instance_id = instance_uuid;
  IF FOUND AND (existing.installation_id <> installation_uuid OR existing.sequence >= sequence_value) THEN
    RETURN jsonb_build_object('accepted',false);
  END IF;
  PERFORM public.kws_monitoring_budget('presence-global',date_trunc('minute',now()),20000);
  PERFORM public.kws_monitoring_budget('presence-installation:' || installation_uuid::text,date_trunc('minute',now()),120);
  excluded_value := p_presence->>'channel' IN ('development','test') OR (p_user_id IS NOT NULL AND public.has_role(p_user_id,'admin'::text));
  IF boulder_uuid IS NOT NULL AND (p_presence->>'screen' <> 'boulder' OR NOT EXISTS (SELECT 1 FROM public.boulders WHERE id = boulder_uuid)) THEN boulder_uuid := NULL; END IF;
  INSERT INTO public.monitoring_live_presence (instance_id,installation_id,user_id,sequence,active,platform,release,screen,boulder_id,updated_at,expires_at,excluded)
  VALUES (instance_uuid,installation_uuid,p_user_id,sequence_value,active_value,p_presence->>'platform',p_presence->>'release',CASE WHEN active_value THEN p_presence->>'screen' ELSE 'other' END,
    CASE WHEN active_value THEN boulder_uuid END,now(),now() + interval '45 seconds',excluded_value)
  ON CONFLICT (instance_id) DO UPDATE SET user_id = EXCLUDED.user_id,sequence = EXCLUDED.sequence,active = EXCLUDED.active,
    platform = EXCLUDED.platform,release = EXCLUDED.release,screen = EXCLUDED.screen,boulder_id = EXCLUDED.boulder_id,
    updated_at = EXCLUDED.updated_at,expires_at = EXCLUDED.expires_at,excluded = EXCLUDED.excluded;
  DELETE FROM public.monitoring_live_presence WHERE expires_at < now() - interval '10 minutes';
  IF NOT excluded_value OR (existing.instance_id IS NOT NULL AND NOT existing.excluded) THEN
    UPDATE public.monitoring_live_revision SET revision = gen_random_uuid() WHERE singleton;
  END IF;
  RETURN jsonb_build_object('accepted',true);
END $$;
REVOKE ALL ON FUNCTION public.kws_monitoring_presence(jsonb,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.kws_monitoring_presence(jsonb,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.kws_monitoring_live(p_platform text DEFAULT 'all',p_release text DEFAULT 'all')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public,pg_temp AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::text) THEN RAISE EXCEPTION 'Administrator required' USING ERRCODE = '42501'; END IF;
  IF p_platform IS NULL OR p_platform NOT IN ('all','web','android','ios') OR p_release IS NULL OR length(p_release) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'Invalid filter' USING ERRCODE = '22023';
  END IF;
  WITH active AS MATERIALIZED (
    SELECT *,CASE WHEN user_id IS NOT NULL THEN 'account:' || user_id::text ELSE 'guest:' || installation_id::text END AS actor
    FROM public.monitoring_live_presence
    WHERE active AND NOT excluded AND expires_at > now()
      AND (p_platform = 'all' OR platform = p_platform) AND (p_release = 'all' OR release = p_release)
  ), boulder_counts AS (
    SELECT active.boulder_id AS id,boulders.name,count(DISTINCT actor)::integer AS viewers
    FROM active JOIN public.boulders ON boulders.id = active.boulder_id
    GROUP BY active.boulder_id,boulders.name
  ) SELECT jsonb_build_object(
    'schema_version',1,'generated_at',now(),'expires_at',coalesce((SELECT min(expires_at) FROM active),now() + interval '45 seconds'),
    'online', (SELECT count(DISTINCT actor) FROM active),
    'accounts',(SELECT count(DISTINCT user_id) FROM active),
    'guests',(SELECT count(DISTINCT installation_id) FROM active WHERE user_id IS NULL),
    'devices',(SELECT count(DISTINCT installation_id) FROM active),
    'viewing_boulders',(SELECT count(DISTINCT actor) FROM active WHERE boulder_id IS NOT NULL),
    'boulders',coalesce((SELECT jsonb_agg(to_jsonb(boulder_counts) ORDER BY viewers DESC,name,id) FROM boulder_counts),'[]'::jsonb)
  ) INTO result;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.kws_monitoring_live(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.kws_monitoring_live(text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.kws_monitoring_live_cleanup()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public,pg_temp AS $$
  DELETE FROM public.monitoring_live_presence WHERE expires_at < now() - interval '10 minutes';
$$;
REVOKE ALL ON FUNCTION public.kws_monitoring_live_cleanup() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.kws_monitoring_live_cleanup() TO service_role;

CREATE OR REPLACE FUNCTION public.kws_monitoring_retain()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE removed_events integer; removed_sessions integer;
BEGIN
  PERFORM public.kws_monitoring_live_cleanup();
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
NOTIFY pgrst,'reload schema';
COMMIT;
