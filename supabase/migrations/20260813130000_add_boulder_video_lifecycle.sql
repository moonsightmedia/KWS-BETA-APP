-- Durable lifecycle for Hostinger's asynchronous video pipeline.
-- Existing clients may continue to write beta_video_url / beta_video_urls directly.

ALTER TABLE public.boulders
  ADD COLUMN IF NOT EXISTS beta_video_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS beta_video_upload_session_id text,
  ADD COLUMN IF NOT EXISTS beta_video_job_id uuid,
  ADD COLUMN IF NOT EXISTS beta_video_error text,
  ADD COLUMN IF NOT EXISTS beta_video_updated_at timestamptz;

UPDATE public.boulders
SET beta_video_status = CASE
  WHEN beta_video_url IS NOT NULL THEN 'ready'
  ELSE 'none'
END,
beta_video_updated_at = COALESCE(beta_video_updated_at, now())
WHERE beta_video_status IS NULL
   OR beta_video_status NOT IN ('none', 'uploading', 'queued', 'processing', 'ready', 'failed')
   OR (beta_video_status = 'none' AND beta_video_url IS NOT NULL);

ALTER TABLE public.boulders
  DROP CONSTRAINT IF EXISTS boulders_beta_video_status_check;

ALTER TABLE public.boulders
  ADD CONSTRAINT boulders_beta_video_status_check
  CHECK (beta_video_status IN ('none', 'uploading', 'queued', 'processing', 'ready', 'failed'));

CREATE INDEX IF NOT EXISTS idx_boulders_beta_video_lifecycle
  ON public.boulders (beta_video_status, beta_video_updated_at DESC);

COMMENT ON COLUMN public.boulders.beta_video_status IS
  'Asynchronous Hostinger video lifecycle: none, uploading, queued, processing, ready, failed.';

-- Keep pre-lifecycle clients working: a direct legacy URL write still publishes
-- the already-finished rendition set. New clients use the RPCs below instead.
CREATE OR REPLACE FUNCTION public.sync_legacy_boulder_video_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND (NEW.beta_video_url IS DISTINCT FROM OLD.beta_video_url
       OR NEW.beta_video_urls IS DISTINCT FROM OLD.beta_video_urls)
     AND NEW.beta_video_status IS NOT DISTINCT FROM OLD.beta_video_status THEN
    IF NEW.beta_video_url IS NOT NULL OR NEW.beta_video_urls IS NOT NULL THEN
      NEW.beta_video_status := 'ready';
    ELSE
      NEW.beta_video_status := 'none';
      NEW.beta_video_job_id := NULL;
      NEW.beta_video_upload_session_id := NULL;
      NEW.beta_video_error := NULL;
    END IF;
    NEW.beta_video_updated_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_legacy_boulder_video_lifecycle ON public.boulders;
CREATE TRIGGER sync_legacy_boulder_video_lifecycle
  BEFORE UPDATE OF beta_video_url, beta_video_urls ON public.boulders
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_legacy_boulder_video_lifecycle();

CREATE OR REPLACE FUNCTION public.begin_boulder_video_upload(
  p_boulder_id uuid,
  p_upload_session_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_boulder public.boulders%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL
     OR NOT (public.has_role(auth.uid(), 'setter') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Only setters and admins may begin a boulder video upload'
      USING ERRCODE = '42501';
  END IF;

  IF p_upload_session_id IS NULL
     OR p_upload_session_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'Invalid upload session id' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_boulder
  FROM public.boulders
  WHERE id = p_boulder_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Resuming the same durable upload must never erase a job binding that the
  -- Hostinger callback has already registered or completed.
  IF v_boulder.beta_video_upload_session_id IS NOT DISTINCT FROM lower(p_upload_session_id)
     AND v_boulder.beta_video_status IN ('uploading', 'queued', 'processing', 'ready', 'failed') THEN
    RETURN true;
  END IF;

  UPDATE public.boulders
  SET beta_video_status = 'uploading',
      beta_video_upload_session_id = lower(p_upload_session_id),
      beta_video_job_id = NULL,
      beta_video_error = NULL,
      beta_video_updated_at = now()
  WHERE id = p_boulder_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_boulder_video_job(
  p_boulder_id uuid,
  p_upload_session_id text,
  p_job_id uuid,
  p_status text,
  p_hd_url text DEFAULT NULL,
  p_sd_url text DEFAULT NULL,
  p_low_url text DEFAULT NULL,
  p_error text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_boulder public.boulders%ROWTYPE;
  v_family text;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Only service_role may synchronize video jobs' USING ERRCODE = '42501';
  END IF;

  IF p_upload_session_id IS NULL
     OR p_upload_session_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     OR p_job_id IS NULL
     OR p_status IS NULL
     OR p_status NOT IN ('queued', 'processing', 'completed', 'failed') THEN
    RAISE EXCEPTION 'Invalid video job payload' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_boulder
  FROM public.boulders
  WHERE id = p_boulder_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- A different client session or a replaced job must never be overwritten by
  -- a delayed Hostinger callback. A terminal result cannot be downgraded.
  IF v_boulder.beta_video_upload_session_id IS DISTINCT FROM lower(p_upload_session_id)
     OR (v_boulder.beta_video_job_id IS NOT NULL AND v_boulder.beta_video_job_id IS DISTINCT FROM p_job_id)
     OR (p_status IN ('queued', 'processing') AND v_boulder.beta_video_status IN ('ready', 'failed')) THEN
    RETURN false;
  END IF;

  IF p_status IN ('queued', 'processing') THEN
    UPDATE public.boulders
    SET beta_video_status = p_status,
        beta_video_job_id = p_job_id,
        beta_video_error = NULL,
        beta_video_updated_at = now()
    WHERE id = p_boulder_id;
    RETURN true;
  END IF;

  IF p_status = 'failed' THEN
    IF v_boulder.beta_video_status = 'ready' THEN
      RETURN false;
    END IF;

    UPDATE public.boulders
    SET beta_video_status = 'failed',
        beta_video_job_id = p_job_id,
        beta_video_error = NULLIF(left(COALESCE(p_error, 'Video processing failed'), 1000), ''),
        beta_video_updated_at = now()
    WHERE id = p_boulder_id;
    RETURN true;
  END IF;

  -- completed: accept only the exact three rendition URLs generated by the
  -- Hostinger video origin, all belonging to the same server-side media family.
  IF p_hd_url IS NULL
     OR p_sd_url IS NULL
     OR p_low_url IS NULL
     OR p_hd_url !~ '^https://video\\.kletterwelt-sauerland\\.de/videos/[A-Za-z0-9_-]{1,128}/[A-Za-z0-9._-]+_hd\\.mp4$'
     OR p_sd_url !~ '^https://video\\.kletterwelt-sauerland\\.de/videos/[A-Za-z0-9_-]{1,128}/[A-Za-z0-9._-]+_sd\\.mp4$'
     OR p_low_url !~ '^https://video\\.kletterwelt-sauerland\\.de/videos/[A-Za-z0-9_-]{1,128}/[A-Za-z0-9._-]+_low\\.mp4$' THEN
    RAISE EXCEPTION 'Invalid completed video rendition URLs' USING ERRCODE = '22023';
  END IF;

  v_family := regexp_replace(p_hd_url, '_hd\\.mp4$', '');
  IF regexp_replace(p_sd_url, '_sd\\.mp4$', '') <> v_family
     OR regexp_replace(p_low_url, '_low\\.mp4$', '') <> v_family THEN
    RAISE EXCEPTION 'Video renditions do not belong to one media family' USING ERRCODE = '22023';
  END IF;

  UPDATE public.boulders
  SET beta_video_status = 'ready',
      beta_video_job_id = p_job_id,
      beta_video_error = NULL,
      beta_video_url = p_hd_url,
      beta_video_urls = jsonb_build_object('hd', p_hd_url, 'sd', p_sd_url, 'low', p_low_url),
      beta_video_updated_at = now()
  WHERE id = p_boulder_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_boulder_video_upload(
  p_boulder_id uuid,
  p_upload_session_id text,
  p_error text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_boulder public.boulders%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL
     OR NOT (public.has_role(auth.uid(), 'setter') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Only setters and admins may fail a boulder video upload'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_boulder
  FROM public.boulders
  WHERE id = p_boulder_id
  FOR UPDATE;

  IF NOT FOUND
     OR v_boulder.beta_video_upload_session_id IS DISTINCT FROM lower(p_upload_session_id)
     OR v_boulder.beta_video_job_id IS NOT NULL
     OR v_boulder.beta_video_status <> 'uploading' THEN
    RETURN false;
  END IF;

  UPDATE public.boulders
  SET beta_video_status = 'failed',
      beta_video_error = NULLIF(left(COALESCE(p_error, 'Upload failed before server queue'), 1000), ''),
      beta_video_updated_at = now()
  WHERE id = p_boulder_id;

  RETURN true;
END;
$$;

-- Batch creation starts with a private placeholder before the video session is
-- assigned. If preparation fails that placeholder must not remain uploading
-- forever. Once a session or server job exists, only the session-bound RPC
-- above may change the lifecycle.
CREATE OR REPLACE FUNCTION public.fail_pending_boulder_video_upload(
  p_boulder_id uuid,
  p_error text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_boulder public.boulders%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL
     OR NOT (public.has_role(auth.uid(), 'setter') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Only setters and admins may fail a pending boulder video upload'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_boulder
  FROM public.boulders
  WHERE id = p_boulder_id
  FOR UPDATE;

  IF NOT FOUND
     OR v_boulder.beta_video_status <> 'uploading'
     OR v_boulder.beta_video_upload_session_id IS NOT NULL
     OR v_boulder.beta_video_job_id IS NOT NULL THEN
    RETURN false;
  END IF;

  UPDATE public.boulders
  SET beta_video_status = 'failed',
      beta_video_error = NULLIF(left(COALESCE(p_error, 'Upload preparation failed'), 1000), ''),
      beta_video_updated_at = now()
  WHERE id = p_boulder_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.begin_boulder_video_upload(uuid, text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.begin_boulder_video_upload(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.fail_boulder_video_upload(uuid, text, text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.fail_boulder_video_upload(uuid, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.fail_pending_boulder_video_upload(uuid, text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.fail_pending_boulder_video_upload(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.sync_boulder_video_job(uuid, text, uuid, text, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_boulder_video_job(uuid, text, uuid, text, text, text, text, text)
  TO service_role;

REVOKE ALL ON FUNCTION public.sync_legacy_boulder_video_lifecycle() FROM PUBLIC, anon, authenticated;

-- Setter/admin need visibility into processing failures; regular app users and
-- guests only see normally visible rows whose video is ready (or has no video).
DROP POLICY IF EXISTS "Anonymous can read hanging boulders" ON public.boulders;
CREATE POLICY "Anonymous can read hanging boulders"
  ON public.boulders FOR SELECT TO anon
  USING (status = 'haengt' AND beta_video_status IN ('none', 'ready'));

DROP POLICY IF EXISTS "Authenticated can read all boulders" ON public.boulders;
CREATE POLICY "Authenticated can read published boulders or manage video jobs"
  ON public.boulders FOR SELECT TO authenticated
  USING (
    (status = 'haengt' AND beta_video_status IN ('none', 'ready'))
    OR public.has_role(auth.uid(), 'setter')
    OR public.has_role(auth.uid(), 'admin')
  );

-- The historical insert notification trigger is intentionally disabled. Notify
-- only when the video becomes publishable, and only if the helper still exists.
DROP TRIGGER IF EXISTS trigger_notify_boulder_video_ready ON public.boulders;
DO $$
BEGIN
  IF to_regprocedure('public.notify_new_boulder()') IS NOT NULL THEN
    CREATE TRIGGER trigger_notify_boulder_video_ready
      AFTER UPDATE OF beta_video_status ON public.boulders
      FOR EACH ROW
      WHEN (
        OLD.beta_video_status IS DISTINCT FROM 'ready'
        AND NEW.beta_video_status = 'ready'
        AND NEW.beta_video_job_id IS NOT NULL
      )
      EXECUTE FUNCTION public.notify_new_boulder();
  END IF;
END;
$$;
