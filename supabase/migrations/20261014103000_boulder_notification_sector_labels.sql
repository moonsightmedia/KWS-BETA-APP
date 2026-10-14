-- Private deterministic formatter for the final grouped notification.
CREATE OR REPLACE FUNCTION public.format_boulder_notification_message(
  p_count integer, p_name text, p_sector_names text[]
) RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = pg_catalog AS $$
DECLARE
  names text[];
  labels text[];
  sector_count integer;
  message text;
  detail text;
BEGIN
  SELECT COALESCE(array_agg(name ORDER BY name COLLATE "C"), '{}'::text[]) INTO names
  FROM (
    SELECT DISTINCT btrim(regexp_replace(name, '[[:space:]]+', ' ', 'g')) AS name
    FROM unnest(p_sector_names) name
    WHERE NULLIF(btrim(name), '') IS NOT NULL
  ) normalized;
  sector_count := cardinality(names);
  message := CASE WHEN p_count = 1 THEN 'Ein neuer Boulder' ELSE p_count || ' neue Boulder' END;
  SELECT array_agg(CASE WHEN char_length(name) > 50 THEN left(name, 49) || '…' ELSE name END ORDER BY position)
    INTO labels FROM unnest(names) WITH ORDINALITY named(name, position);
  CASE sector_count
    WHEN 0 THEN
      message := message || ' wurde' || CASE WHEN p_count = 1 THEN '' ELSE 'n' END || ' hinzugefügt';
    WHEN 1 THEN message := message || ' im Sektor ' || labels[1];
    WHEN 2 THEN message := message || ' in den Sektoren ' || labels[1] || ' und ' || labels[2];
    WHEN 3 THEN message := message || ' in den Sektoren ' || labels[1] || ', ' || labels[2] || ' und ' || labels[3];
    ELSE message := message || ' in ' || sector_count || ' Sektoren: '
      || labels[1] || ', ' || labels[2] || ', ' || labels[3] || ' und ' || (sector_count - 3) || ' weitere';
  END CASE;
  IF p_count = 1 THEN
    detail := COALESCE(NULLIF(btrim(p_name), ''), 'Unbenannt');
    message := message || ' · ' || left(detail, LEAST(80, GREATEST(0, 237 - char_length(message))));
  END IF;
  RETURN message;
END;
$$;
REVOKE ALL ON FUNCTION public.format_boulder_notification_message(integer, text, text[])
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.flush_pending_boulder_notifications()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
DECLARE
  last_ready timestamptz;
  boulder_ids jsonb;
  sector_ids jsonb;
  sector_names text[];
  latest_id uuid;
  latest_sector uuid;
  latest_name text;
  boulder_count integer;
  recipient_count integer;
  payload jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(20261013, 1);
  SELECT max(enqueued_at) INTO last_ready FROM public.boulder_notification_queue
  WHERE delivered_at IS NULL;
  IF last_ready IS NULL THEN RETURN jsonb_build_object('boulders', 0, 'notifications', 0); END IF;
  IF last_ready > clock_timestamp() - interval '2 minutes' THEN
    RETURN jsonb_build_object('waiting', 'quiet_period');
  END IF;
  -- Legacy clients have no batch ID. Their serial queue creates the next Boulder
  -- before compression; include both thumbnail/file uploads and server jobs.
  -- Abandoned jobs stop holding delivery after 30 minutes without activity.
  IF EXISTS (
    SELECT 1 FROM public.boulders
    WHERE beta_video_status IN ('uploading', 'queued', 'processing')
      AND updated_at > clock_timestamp() - interval '30 minutes'
  ) OR EXISTS (
    SELECT 1 FROM public.upload_logs
    WHERE status IN ('pending', 'compressing', 'uploading')
      AND updated_at > clock_timestamp() - interval '30 minutes'
  ) THEN RETURN jsonb_build_object('waiting', 'active_uploads'); END IF;

  SELECT count(*), jsonb_agg(b.id::text ORDER BY q.enqueued_at, b.id)
  INTO boulder_count, boulder_ids
  FROM public.boulder_notification_queue q JOIN public.boulders b ON b.id = q.boulder_id
  WHERE q.delivered_at IS NULL AND b.status = 'haengt' AND b.beta_video_status = 'ready';
  IF boulder_count = 0 THEN
    UPDATE public.boulder_notification_queue SET delivered_at = clock_timestamp() WHERE delivered_at IS NULL;
    RETURN jsonb_build_object('boulders', 0, 'notifications', 0);
  END IF;
  SELECT b.id, b.sector_id, b.name INTO latest_id, latest_sector, latest_name
  FROM public.boulder_notification_queue q JOIN public.boulders b ON b.id = q.boulder_id
  WHERE q.delivered_at IS NULL AND b.status = 'haengt' AND b.beta_video_status = 'ready'
  ORDER BY q.enqueued_at DESC, b.id DESC LIMIT 1;
  SELECT COALESCE(jsonb_agg(sector_id ORDER BY sector_id), '[]'::jsonb) INTO sector_ids
  FROM (
    SELECT DISTINCT s.sector_id::text AS sector_id
    FROM public.boulder_notification_queue q JOIN public.boulders b ON b.id = q.boulder_id
    CROSS JOIN LATERAL (VALUES (b.sector_id), (b.sector_id_2)) s(sector_id)
    WHERE q.delivered_at IS NULL AND b.status = 'haengt' AND b.beta_video_status = 'ready'
      AND s.sector_id IS NOT NULL
  ) sectors;
  SELECT COALESCE(array_agg(s.name ORDER BY s.name COLLATE "C"), '{}'::text[]) INTO sector_names
  FROM public.sectors s WHERE s.id::text IN (SELECT jsonb_array_elements_text(sector_ids));
  payload := jsonb_build_object('boulder_count', boulder_count, 'boulder_ids', boulder_ids,
    'sector_ids', sector_ids, 'sector_names', to_jsonb(sector_names), 'latest_boulder_id', latest_id, 'latest_sector_id', latest_sector);
  IF boulder_count = 1 THEN
    payload := payload || jsonb_build_object('boulder_id', latest_id, 'sector_id', latest_sector);
  END IF;
  -- The existing INSERT push trigger sends this one final payload. Creation and
  -- queue completion share a transaction, so retries cannot enqueue duplicates.
  INSERT INTO public.notifications(user_id, type, title, message, data, action_url)
  SELECT p.user_id, 'boulder_new',
    CASE WHEN boulder_count = 1 THEN 'Neuer Boulder verfügbar' ELSE 'Neue Boulder verfügbar' END,
    public.format_boulder_notification_message(boulder_count, latest_name, sector_names),
    payload, '/boulders'
  FROM public.notification_preferences p JOIN public.profiles u ON u.id = p.user_id
  WHERE p.boulder_new IS TRUE AND p.in_app_enabled IS TRUE;
  GET DIAGNOSTICS recipient_count = ROW_COUNT;
  UPDATE public.boulder_notification_queue SET delivered_at = clock_timestamp() WHERE delivered_at IS NULL;
  RETURN jsonb_build_object('boulders', boulder_count, 'notifications', recipient_count);
END;
$$;
REVOKE ALL ON FUNCTION public.flush_pending_boulder_notifications() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.flush_pending_boulder_notifications() TO postgres;
