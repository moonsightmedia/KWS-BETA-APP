-- Telemetry for active devices and lightweight product/upload events.
-- Fail-safe for clients: inserts allowed for authenticated users; admin read-only.

CREATE TABLE IF NOT EXISTS public.telemetry_sessions (
  device_id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  platform text,
  app_version text,
  role text,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.telemetry_events (
  id bigserial PRIMARY KEY,
  device_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  boulder_id uuid,
  props jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS telemetry_sessions_last_seen_idx
  ON public.telemetry_sessions (last_seen_at DESC);

CREATE INDEX IF NOT EXISTS telemetry_events_created_at_idx
  ON public.telemetry_events (created_at DESC);

CREATE INDEX IF NOT EXISTS telemetry_events_name_boulder_idx
  ON public.telemetry_events (name, boulder_id, created_at DESC);

CREATE INDEX IF NOT EXISTS telemetry_events_name_created_idx
  ON public.telemetry_events (name, created_at DESC);

ALTER TABLE public.telemetry_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS telemetry_sessions_insert_auth ON public.telemetry_sessions;
CREATE POLICY telemetry_sessions_insert_auth
  ON public.telemetry_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS telemetry_sessions_update_auth ON public.telemetry_sessions;
CREATE POLICY telemetry_sessions_update_auth
  ON public.telemetry_sessions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS telemetry_sessions_select_admin ON public.telemetry_sessions;
CREATE POLICY telemetry_sessions_select_admin
  ON public.telemetry_sessions
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS telemetry_events_insert_auth ON public.telemetry_events;
CREATE POLICY telemetry_events_insert_auth
  ON public.telemetry_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS telemetry_events_select_admin ON public.telemetry_events;
CREATE POLICY telemetry_events_select_admin
  ON public.telemetry_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS telemetry_sessions_insert_anon ON public.telemetry_sessions;
CREATE POLICY telemetry_sessions_insert_anon
  ON public.telemetry_sessions
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

DROP POLICY IF EXISTS telemetry_sessions_update_anon ON public.telemetry_sessions;
CREATE POLICY telemetry_sessions_update_anon
  ON public.telemetry_sessions
  FOR UPDATE
  TO anon
  USING (user_id IS NULL)
  WITH CHECK (user_id IS NULL);

DROP POLICY IF EXISTS telemetry_events_insert_anon ON public.telemetry_events;
CREATE POLICY telemetry_events_insert_anon
  ON public.telemetry_events
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- Allow aborted_suspected_oom on upload_logs when a status CHECK exists.
DO $$
DECLARE
  constraint_name text;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'upload_logs'
  ) THEN
    SELECT c.conname INTO constraint_name
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'upload_logs'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%status%';

    IF constraint_name IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.upload_logs DROP CONSTRAINT %I', constraint_name);
      ALTER TABLE public.upload_logs
        ADD CONSTRAINT upload_logs_status_check
        CHECK (status IN (
          'pending',
          'compressing',
          'uploading',
          'completed',
          'failed',
          'duplicate',
          'aborted_suspected_oom'
        ));
    END IF;
  END IF;
END $$;
