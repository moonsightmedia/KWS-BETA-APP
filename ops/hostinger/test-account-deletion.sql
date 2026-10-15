-- Disposable data in one rolled-back transaction. Never targets real users.
BEGIN;
INSERT INTO auth.users(id, email, raw_user_meta_data, aud, role)
 VALUES ('f0000000-0000-4000-8000-000000000016', 'deletion-qa-one@example.invalid', '{}', 'authenticated', 'authenticated'),
 ('f0000000-0000-4000-8000-000000000017', 'deletion-qa-two@example.invalid', '{}', 'authenticated', 'authenticated');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'f0000000-0000-4000-8000-000000000016', true);
DO $$ DECLARE first_request jsonb; again jsonb; BEGIN
  first_request := public.kws_request_account_deletion();
  again := public.kws_request_account_deletion();
  IF first_request <> again THEN RAISE EXCEPTION 'Duplicate request or deadline reset'; END IF;
  IF first_request->>'status' <> 'pending' THEN RAISE EXCEPTION 'Wrong initial status'; END IF;
  IF (first_request->>'due_at')::timestamptz - (first_request->>'requested_at')::timestamptz <> interval '7 days' THEN RAISE EXCEPTION 'Wrong deadline'; END IF;
  IF (SELECT count(*) FROM public.account_deletion_requests) <> 1 THEN RAISE EXCEPTION 'Owner visibility'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub', 'f0000000-0000-4000-8000-000000000017', true);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.account_deletion_requests) <> 0 THEN RAISE EXCEPTION 'Foreign deletion request leaked'; END IF;
  IF has_table_privilege('authenticated', 'public.account_deletion_requests', 'INSERT')
    OR has_table_privilege('authenticated', 'public.account_deletion_requests', 'UPDATE')
    OR has_table_privilege('authenticated', 'public.account_deletion_requests', 'DELETE') THEN RAISE EXCEPTION 'Direct client modification allowed'; END IF;
  IF has_function_privilege('anon', 'public.kws_request_account_deletion()', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.kws_finish_account_deletion(uuid)', 'EXECUTE')
    OR has_function_privilege('service_role', 'public.kws_finish_account_deletion(uuid)', 'EXECUTE') THEN RAISE EXCEPTION 'Client erasure permission'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub', 'f0000000-0000-4000-8000-000000000099', true);
DO $$ BEGIN
  BEGIN PERFORM public.kws_request_account_deletion(); RAISE EXCEPTION 'Deleted-user JWT accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SAVEPOINT storage_guard;
INSERT INTO storage.objects(bucket_id, name, owner, owner_id)
 VALUES ('profile-avatars', 'f0000000-0000-4000-8000-000000000016/deletion-qa.jpg', 'f0000000-0000-4000-8000-000000000016', 'f0000000-0000-4000-8000-000000000016');
DO $$ DECLARE request_id uuid; BEGIN
 SELECT id INTO request_id FROM public.account_deletion_requests WHERE user_id = 'f0000000-0000-4000-8000-000000000016';
 BEGIN PERFORM public.kws_finish_account_deletion(request_id); RAISE EXCEPTION 'Storage guard failed';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'Erase owned storage files through the Storage API first' THEN RAISE; END IF; END;
END $$;
ROLLBACK TO SAVEPOINT storage_guard;
DO $$ DECLARE request_id uuid; result jsonb; BEGIN
 SELECT id INTO request_id FROM public.account_deletion_requests WHERE user_id = 'f0000000-0000-4000-8000-000000000016';
 result := public.kws_finish_account_deletion(request_id);
 IF result->>'completed' <> 'true' THEN RAISE EXCEPTION 'Erasure not confirmed'; END IF;
 IF EXISTS(SELECT 1 FROM auth.users WHERE id = 'f0000000-0000-4000-8000-000000000016')
   OR EXISTS(SELECT 1 FROM public.profiles WHERE id = 'f0000000-0000-4000-8000-000000000016')
   OR EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = 'f0000000-0000-4000-8000-000000000016') THEN RAISE EXCEPTION 'Personal account records remain'; END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id = 'f0000000-0000-4000-8000-000000000017') THEN RAISE EXCEPTION 'Foreign account erased'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.account_deletion_requests WHERE id = request_id AND user_id IS NULL AND status = 'completed' AND completed_at IS NOT NULL) THEN RAISE EXCEPTION 'Completion not recorded'; END IF;
END $$;
ROLLBACK;
SELECT 'ACCOUNT_DELETION_SQL_SECURITY_AND_ERASURE_VERIFIED';
