-- Ready callbacks enqueue private events. A trusted server worker publishes one
-- notification per recipient after the upload activity has settled.
CREATE TABLE public.boulder_notification_queue (
  boulder_id uuid PRIMARY KEY REFERENCES public.boulders(id) ON DELETE CASCADE,
  enqueued_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  delivered_at timestamptz
);
CREATE INDEX boulder_notification_queue_pending
  ON public.boulder_notification_queue(enqueued_at) WHERE delivered_at IS NULL;
ALTER TABLE public.boulder_notification_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.boulder_notification_queue FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.notify_new_boulder()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.status <> 'haengt' OR NEW.beta_video_status <> 'ready' THEN RETURN NEW; END IF;
  -- The same lock serializes ready callbacks with the worker's snapshot.
  PERFORM pg_advisory_xact_lock(20261013, 1);
  INSERT INTO public.boulder_notification_queue(boulder_id) VALUES (NEW.id)
  ON CONFLICT (boulder_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'KWS boulder notification enqueue failed';
  RETURN NEW;
END;
$$;
ALTER FUNCTION public.notify_new_boulder() OWNER TO supabase_admin;
REVOKE ALL ON FUNCTION public.notify_new_boulder() FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.flush_pending_boulder_notifications()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
DECLARE
  last_ready timestamptz;
  boulder_ids jsonb;
  sector_ids jsonb;
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
  payload := jsonb_build_object('boulder_count', boulder_count, 'boulder_ids', boulder_ids,
    'sector_ids', sector_ids, 'latest_boulder_id', latest_id, 'latest_sector_id', latest_sector);
  IF boulder_count = 1 THEN
    payload := payload || jsonb_build_object('boulder_id', latest_id, 'sector_id', latest_sector);
  END IF;
  -- The existing INSERT push trigger sends this one final payload. Creation and
  -- queue completion share a transaction, so retries cannot enqueue duplicates.
  INSERT INTO public.notifications(user_id, type, title, message, data, action_url)
  SELECT p.user_id, 'boulder_new',
    CASE WHEN boulder_count = 1 THEN 'Neuer Boulder verfügbar' ELSE 'Neue Boulder verfügbar' END,
    CASE WHEN boulder_count = 1 THEN 'Ein neuer Boulder wurde hinzugefügt: ' || COALESCE(latest_name, 'Unbenannt')
      ELSE boulder_count || ' neue Boulder wurden hinzugefügt' END,
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
