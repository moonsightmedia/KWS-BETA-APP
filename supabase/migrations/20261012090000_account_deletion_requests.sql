-- Account deletion can be requested in-app. Only the owner can submit; admins
-- can see the queue. Actual erasure is performed by the protected operator tool.
BEGIN;
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed')),
  completed_at timestamptz,
  CHECK ((status = 'completed') = (completed_at IS NOT NULL))
);
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_deletion_requests FROM anon, authenticated, service_role;
GRANT SELECT ON public.account_deletion_requests TO authenticated;
DROP POLICY IF EXISTS account_deletion_read ON public.account_deletion_requests;
CREATE POLICY account_deletion_read ON public.account_deletion_requests FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'::text));

CREATE OR REPLACE FUNCTION public.kws_request_account_deletion()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE owner_id uuid := auth.uid(); request_record public.account_deletion_requests%ROWTYPE;
BEGIN
  IF owner_id IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = owner_id) THEN
    RAISE EXCEPTION 'Eine gültige Anmeldung ist erforderlich.' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.account_deletion_requests (user_id) VALUES (owner_id)
    ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO STRICT request_record FROM public.account_deletion_requests WHERE user_id = owner_id;
  RETURN jsonb_build_object('id', request_record.id, 'requested_at', request_record.requested_at,
    'due_at', request_record.due_at, 'status', request_record.status);
END;
$$;
REVOKE ALL ON FUNCTION public.kws_request_account_deletion() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.kws_request_account_deletion() TO authenticated;

-- Not exposed to app clients, including admins. The operator must first erase
-- owned files, stop uploads, and resolve business-owned records. SET NULL alone
-- does not remove personal information from feedback/diagnostic payloads.
CREATE OR REPLACE FUNCTION public.kws_finish_account_deletion(request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE target uuid; email_address text; request_state text;
BEGIN
  SELECT user_id, status INTO target, request_state FROM public.account_deletion_requests
    WHERE id = request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown deletion request'; END IF;
  IF request_state = 'completed' THEN RETURN jsonb_build_object('completed', true); END IF;
  IF target IS NULL THEN RAISE EXCEPTION 'Missing deletion target'; END IF;
  SELECT email INTO email_address FROM auth.users WHERE id = target FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Target account no longer exists'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = target AND role::text = 'admin')
    AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id <> target AND role::text = 'admin') THEN
    RAISE EXCEPTION 'Assign another administrator before deleting the last admin';
  END IF;
  IF EXISTS (SELECT 1 FROM public.clients WHERE created_by = target)
    OR EXISTS (SELECT 1 FROM public.projects WHERE created_by = target)
    OR EXISTS (SELECT 1 FROM public.tasks WHERE created_by = target)
    OR EXISTS (SELECT 1 FROM public.task_comments WHERE created_by = target) THEN
    RAISE EXCEPTION 'Resolve business-record ownership before deletion';
  END IF;
  IF EXISTS (SELECT 1 FROM storage.objects WHERE owner = target OR owner_id = target::text) THEN
    RAISE EXCEPTION 'Erase owned storage files through the Storage API first';
  END IF;
  DELETE FROM public.feedback WHERE user_id = target OR lower(user_email) = lower(email_address);
  DELETE FROM public.boulder_operation_logs WHERE user_id = target;
  DELETE FROM public.telemetry_events WHERE user_id = target;
  DELETE FROM public.telemetry_sessions WHERE user_id = target;
  DELETE FROM public.upload_logs WHERE user_id = target;
  DELETE FROM auth.users WHERE id = target;
  UPDATE public.account_deletion_requests SET status = 'completed', completed_at = now()
    WHERE id = request_id;
  RETURN jsonb_build_object('completed', true);
END;
$$;
REVOKE ALL ON FUNCTION public.kws_finish_account_deletion(uuid) FROM PUBLIC, anon, authenticated, service_role;
COMMENT ON TABLE public.account_deletion_requests IS 'Private seven-day erasure queue; completed rows retain no account ID or email.';
-- A deleted account's unexpired JWT must not create orphaned Storage objects.
DROP POLICY IF EXISTS account_required_for_storage_insert ON storage.objects;
CREATE POLICY account_required_for_storage_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid())));
DROP POLICY IF EXISTS account_required_for_storage_update ON storage.objects;
CREATE POLICY account_required_for_storage_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid())));
NOTIFY pgrst, 'reload schema';
COMMIT;
