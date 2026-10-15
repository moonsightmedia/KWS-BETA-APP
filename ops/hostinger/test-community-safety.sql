-- All assertions run against a private restored database, all data rolled back.
BEGIN;
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('f1000000-0000-4000-8000-000000000001','safety-one@example.invalid','{"full_name":"Safety one"}'),
 ('f1000000-0000-4000-8000-000000000002','safety-two@example.invalid','{"full_name":"Safety two"}'),
 ('f1000000-0000-4000-8000-000000000003','safety-admin@example.invalid','{"full_name":"Safety admin"}');
INSERT INTO public.user_roles(user_id,role) VALUES('f1000000-0000-4000-8000-000000000003','admin') ON CONFLICT DO NOTHING;
SELECT set_config('request.jwt.claims','{"sub":"f1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
INSERT INTO public.boulder_comments(id,boulder_id,user_id,comment)
 SELECT 'f1000000-0000-4000-8000-000000000004',id,'f1000000-0000-4000-8000-000000000001','  Isolierte Freigabeprüfung  ' FROM public.boulders LIMIT 1;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.boulder_comments WHERE id='f1000000-0000-4000-8000-000000000004' AND moderation_status='pending' AND comment='Isolierte Freigabeprüfung') THEN RAISE EXCEPTION 'Pending guard failed'; END IF;
 BEGIN UPDATE public.boulder_comments SET moderation_status='approved' WHERE id='f1000000-0000-4000-8000-000000000004'; RAISE EXCEPTION 'Client approval escaped'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.kws_moderate_content('comment','f1000000-0000-4000-8000-000000000004','approve'); RAISE EXCEPTION 'Client moderation escaped'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.kws_open_content_reports(); RAISE EXCEPTION 'Admin reports escaped'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $$;
SELECT set_config('request.jwt.claims','{"sub":"f1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.boulder_comments WHERE id='f1000000-0000-4000-8000-000000000004') THEN RAISE EXCEPTION 'Unapproved comment leaked'; END IF; END; $$;
SELECT set_config('request.jwt.claims','{"sub":"f1000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
SELECT public.kws_moderate_content('comment','f1000000-0000-4000-8000-000000000004','approve');
SELECT set_config('request.jwt.claims','{"sub":"f1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM public.boulder_comments WHERE id='f1000000-0000-4000-8000-000000000004') THEN RAISE EXCEPTION 'Approved comment missing'; END IF; END; $$;
SELECT public.kws_block_user('f1000000-0000-4000-8000-000000000001',true);
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.boulder_comments WHERE id='f1000000-0000-4000-8000-000000000004') THEN RAISE EXCEPTION 'Blocked comment leaked'; END IF; END; $$;
SELECT public.kws_block_user('f1000000-0000-4000-8000-000000000001',false);
SELECT public.kws_report_content('comment','f1000000-0000-4000-8000-000000000004','harassment','Isolierter Test');
SELECT public.kws_report_content('comment','f1000000-0000-4000-8000-000000000004','harassment','Doppelte Meldung');
DO $$ BEGIN IF (SELECT count(*) FROM public.content_reports WHERE target_id='f1000000-0000-4000-8000-000000000004')<>1 THEN RAISE EXCEPTION 'Report is not idempotent'; END IF; END; $$;
SELECT set_config('request.jwt.claims','{"sub":"f1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.content_reports WHERE target_id='f1000000-0000-4000-8000-000000000004') THEN RAISE EXCEPTION 'Reporter identity leaked'; END IF; END; $$;
SELECT set_config('request.jwt.claims','{"sub":"f1000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
SELECT public.kws_moderate_content('profile','f1000000-0000-4000-8000-000000000001','ban','Isolierter Test');
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.kws_open_content_reports()) r WHERE r->>'content_text'='Isolierte Freigabeprüfung' AND r->>'target_id'='f1000000-0000-4000-8000-000000000004') THEN RAISE EXCEPTION 'Reported context missing'; END IF; END; $$;
SELECT set_config('request.jwt.claims','{"sub":"f1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
DO $$ BEGIN
 IF public.kws_community_allowed(auth.uid()) THEN RAISE EXCEPTION 'Ban ignored'; END IF;
 BEGIN INSERT INTO public.boulder_comments(boulder_id,user_id,comment) SELECT id,auth.uid(),'Darf nicht veröffentlicht werden' FROM public.boulders LIMIT 1; RAISE EXCEPTION 'Banned write escaped'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $$;
SELECT set_config('request.jwt.claims','{"sub":"f1000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
SELECT public.kws_moderate_content('profile','f1000000-0000-4000-8000-000000000001','unban');
SELECT public.kws_moderate_content('boulder',(SELECT boulder_id FROM public.boulder_comments WHERE id='f1000000-0000-4000-8000-000000000004'),'hide');
SELECT set_config('request.jwt.claims','{"sub":"f1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.boulder_comments WHERE id='f1000000-0000-4000-8000-000000000004') THEN RAISE EXCEPTION 'Hidden boulder comment leaked'; END IF; END; $$;
SELECT set_config('request.jwt.claims','{"sub":"f1000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
SELECT public.kws_moderate_content('boulder',(SELECT boulder_id FROM public.boulder_comments WHERE id='f1000000-0000-4000-8000-000000000004'),'restore');
SELECT public.kws_moderate_content('comment','f1000000-0000-4000-8000-000000000004','hide');
SELECT set_config('request.jwt.claims','{"sub":"f1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.boulder_comments WHERE id='f1000000-0000-4000-8000-000000000004') THEN RAISE EXCEPTION 'Hidden comment leaked'; END IF; END; $$;
RESET ROLE;
DELETE FROM public.boulder_comments WHERE id='f1000000-0000-4000-8000-000000000004';
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.hidden_content WHERE target_id='f1000000-0000-4000-8000-000000000004') THEN RAISE EXCEPTION 'Hidden identity cleanup failed'; END IF; END; $$;
SELECT set_config('request.jwt.claims','{"sub":"f1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE boulder uuid; BEGIN
 SELECT id INTO boulder FROM public.boulders LIMIT 1;
 FOR n IN 1..10 LOOP
   INSERT INTO public.boulder_comments(boulder_id,user_id,comment) VALUES(boulder,'f1000000-0000-4000-8000-000000000001','Spamgrenzen-Prüfung');
 END LOOP;
 BEGIN
   INSERT INTO public.boulder_comments(boulder_id,user_id,comment) VALUES(boulder,'f1000000-0000-4000-8000-000000000001','Elfter Kommentar');
   RAISE EXCEPTION 'Comment rate limit escaped';
 EXCEPTION WHEN OTHERS THEN
   IF SQLERRM NOT LIKE 'Zu viele Kommentare%' THEN RAISE; END IF;
 END;
END; $$;
SELECT set_config('request.jwt.claims','{"sub":"f1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
DO $$ DECLARE boulder uuid; BEGIN
 FOR boulder IN SELECT id FROM public.boulders ORDER BY id LIMIT 19 LOOP
   PERFORM public.kws_report_content('boulder',boulder,'other','Spamgrenzen-Prüfung');
 END LOOP;
 IF (SELECT count(*) FROM public.content_reports) <> 20 THEN RAISE EXCEPTION 'Report fixture bound invalid'; END IF;
 SELECT id INTO boulder FROM public.boulders ORDER BY id OFFSET 19 LIMIT 1;
 BEGIN
   PERFORM public.kws_report_content('boulder',boulder,'other','Einundzwanzigste Meldung');
   RAISE EXCEPTION 'Report rate limit escaped';
 EXCEPTION WHEN OTHERS THEN
   IF SQLERRM NOT LIKE 'Zu viele Meldungen%' THEN RAISE; END IF;
 END;
END; $$;
RESET ROLE;
ROLLBACK;
SELECT 'COMMUNITY_SAFETY_TRANSACTION_VERIFIED';
