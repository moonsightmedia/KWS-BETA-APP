BEGIN;

CREATE OR REPLACE FUNCTION public.kws_admin_issue_events(p_fingerprint text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE result jsonb; salt text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin'::text) OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid()) THEN RAISE EXCEPTION 'Administrator required' USING ERRCODE = '42501'; END IF;
  IF p_fingerprint IS NULL OR length(p_fingerprint) NOT BETWEEN 1 AND 256 THEN RAISE EXCEPTION 'Invalid issue fingerprint' USING ERRCODE = '22023'; END IF;
  SELECT reference_salt::text INTO salt FROM public.monitoring_config;
  SELECT coalesce(jsonb_agg(to_jsonb(report) ORDER BY received_at DESC,event_id),'[]'::jsonb) INTO result FROM (
    SELECT event.event_id,event.occurred_at,event.received_at,event.platform,event.release,
      left(md5(event.installation_id::text || salt),12) AS installation_ref,
      CASE WHEN event.user_id IS NOT NULL THEN left(md5(event.user_id::text || salt),12) END AS user_ref,
      left(md5(event.session_id::text || salt),12) AS session_ref,event.props,
      jsonb_build_object(
        'state',CASE WHEN event.user_id IS NULL THEN 'guest' WHEN account.id IS NOT NULL THEN 'account' ELSE 'unassigned' END,
        'user_id',account.id,
        'display_name',CASE WHEN account.id IS NOT NULL THEN left(coalesce(nullif(concat_ws(' ',nullif(btrim(profile.first_name),''),nullif(btrim(profile.last_name),'')),''),nullif(btrim(profile.full_name),'')),200) END,
        'email',CASE WHEN account.id IS NOT NULL AND length(btrim(profile.email)) <= 254 THEN nullif(btrim(profile.email),'') END
      ) AS actor
    FROM (
      SELECT * FROM public.monitoring_events
      WHERE fingerprint = p_fingerprint AND name = 'app_error' AND NOT excluded
      ORDER BY received_at DESC,event_id LIMIT 50
    ) event
    LEFT JOIN auth.users account ON account.id = event.user_id
    LEFT JOIN public.profiles profile ON profile.id = account.id
  ) report;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.kws_admin_overview()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE result jsonb; snapshot_at timestamptz := statement_timestamp(); period_start timestamptz; sources jsonb; latest_event timestamptz;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin'::text) OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid()) THEN RAISE EXCEPTION 'Administrator required' USING ERRCODE = '42501'; END IF;
  period_start := snapshot_at - interval '24 hours';
  SELECT max(received_at) INTO latest_event FROM public.monitoring_events WHERE NOT excluded;
  SELECT jsonb_object_agg(source,jsonb_build_object(
    'state',CASE WHEN status = 'error' OR status = 'partial' THEN 'error'
      WHEN status <> 'connected' THEN 'unconfigured'
      WHEN last_success_at IS NULL OR last_success_at > snapshot_at OR last_success_at < snapshot_at - CASE source WHEN 'stores' THEN interval '72 hours' WHEN 'alerts' THEN interval '5 minutes' ELSE interval '15 minutes' END THEN 'stale'
      ELSE 'ready' END,
    'status',status,'last_updated_at',updated_at,'last_success_at',last_success_at
  )) INTO sources FROM (
    SELECT requested.source,coalesce(current.status,'not_connected') AS status,current.updated_at,current.last_success_at
    FROM (VALUES ('sentry'),('alerts'),('stores')) requested(source)
    LEFT JOIN public.monitoring_sources current ON current.source = requested.source
  ) source_rows;
  sources := sources || jsonb_build_object('collector',jsonb_build_object(
    'state',CASE WHEN latest_event IS NULL THEN 'empty' WHEN latest_event < snapshot_at - interval '24 hours' THEN 'stale' ELSE 'ready' END,
    'status','observed','last_updated_at',latest_event,'last_success_at',latest_event
  ));
  WITH account_counts AS (
    SELECT count(*) AS total,count(*) FILTER (WHERE created_at >= period_start AND created_at <= snapshot_at) AS new_24h FROM auth.users
  ), role_counts AS (
    SELECT count(DISTINCT role.user_id) FILTER (WHERE role.role = 'admin') AS admins,
      count(DISTINCT role.user_id) FILTER (WHERE role.role = 'setter') AS setters
    FROM public.user_roles role JOIN auth.users account ON account.id = role.user_id
  ), deletion_counts AS (
    SELECT count(*) AS pending,count(*) FILTER (WHERE due_at < snapshot_at) AS overdue
    FROM public.account_deletion_requests WHERE status IN ('pending','processing')
  ), boulder_counts AS (
    SELECT count(*) FILTER (WHERE status = 'haengt') AS hanging,
      count(*) FILTER (WHERE status = 'abgeschraubt') AS removed,
      count(*) FILTER (WHERE beta_video_status IN ('uploading','queued','processing')) AS processing,
      count(*) FILTER (WHERE beta_video_status = 'failed') AS failed
    FROM public.boulders
  ), feedback_counts AS (
    SELECT count(*) FILTER (WHERE type <> 'error') AS people,count(*) FILTER (WHERE type = 'error') AS legacy_errors
    FROM public.feedback WHERE status IN ('open','in_progress')
  ), delivery_counts AS (
    SELECT count(*) FILTER (WHERE status = 'created') AS created_count,
      count(*) FILTER (WHERE status = 'provider_accepted') AS accepted_count,
      count(*) FILTER (WHERE status = 'provider_rejected') AS rejected_count,
      count(*) FILTER (WHERE status = 'failed') AS failed_count,
      count(*) FILTER (WHERE status = 'opened') AS opened_count
    FROM public.monitoring_notification_deliveries WHERE created_at >= period_start AND created_at <= snapshot_at
  )
  SELECT jsonb_build_object(
    'schema_version',1,'generated_at',snapshot_at,'period_start',period_start,'period_end',snapshot_at,
    'users',jsonb_build_object(
      'total',account_counts.total,'new_24h',account_counts.new_24h,'admins',role_counts.admins,'setters',role_counts.setters,
      'deletions_pending',deletion_counts.pending,'deletions_overdue',deletion_counts.overdue
    ),
    'hall',jsonb_build_object(
      'boulders_hanging',boulder_counts.hanging,'boulders_removed',boulder_counts.removed,
      'areas_active',(SELECT count(*) FROM public.sector_areas WHERE is_active),
      'sectors_active',(SELECT count(*) FROM public.sectors WHERE is_active),
      'scheduled_resets',(SELECT count(*) FROM public.sector_schedule WHERE scheduled_at >= snapshot_at)
    ),
    'moderation',jsonb_build_object(
      'comments_pending',(SELECT count(*) FROM public.boulder_comments WHERE moderation_status = 'pending'),
      'reports_open',(SELECT count(*) FROM public.content_reports WHERE status = 'open')
    ),
    'feedback',jsonb_build_object(
      'people_active',feedback_counts.people,'legacy_errors_active',feedback_counts.legacy_errors
    ),
    'monitoring',jsonb_build_object(
      'app_active',(SELECT count(*) FROM public.monitoring_issues issue WHERE issue.status IN ('open','acknowledged') AND EXISTS (SELECT 1 FROM public.monitoring_events event WHERE event.fingerprint = issue.fingerprint AND event.name = 'app_error' AND NOT event.excluded)),
      'sentry_active',CASE WHEN sources->'sentry'->>'state' = 'ready' THEN (SELECT count(*) FROM public.monitoring_sentry_issues WHERE status = 'unresolved') END
    ),
    'uploads',jsonb_build_object(
      'failed_24h',(SELECT count(*) FROM public.upload_logs WHERE status IN ('failed','aborted_suspected_oom') AND updated_at >= period_start AND updated_at <= snapshot_at),
      'processing_now',boulder_counts.processing,'video_failed_now',boulder_counts.failed
    ),
    'notifications',jsonb_build_object(
      'created_24h',delivery_counts.created_count,'provider_accepted_24h',delivery_counts.accepted_count,
      'provider_rejected_24h',delivery_counts.rejected_count,'failed_24h',delivery_counts.failed_count,'opened_24h',delivery_counts.opened_count
    ),
    'sources',sources
  ) INTO result FROM account_counts CROSS JOIN role_counts CROSS JOIN deletion_counts CROSS JOIN boulder_counts CROSS JOIN feedback_counts CROSS JOIN delivery_counts;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.kws_admin_issue_events(text),public.kws_admin_overview() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.kws_admin_issue_events(text),public.kws_admin_overview() TO authenticated;

NOTIFY pgrst,'reload schema';
COMMIT;
