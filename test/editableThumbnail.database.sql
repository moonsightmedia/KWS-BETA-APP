-- Run after migration against an isolated database. Every synthetic change is
-- rolled back, including boulder triggers. No real account data is changed.
BEGIN;
DO $$
DECLARE
  setter_id uuid; customer_id uuid; test_id uuid := gen_random_uuid();
  origin text := 'https://video.kletterwelt-sauerland.de/videos/synthetic/original.png';
  variant text := 'https://video.kletterwelt-sauerland.de/videos/synthetic/variant.png';
  other text := 'https://video.kletterwelt-sauerland.de/videos/synthetic/other.png';
  digest text := repeat('a',64);
BEGIN
  SELECT user_id INTO setter_id FROM public.user_roles WHERE role::text IN ('admin','setter') LIMIT 1;
  SELECT id INTO customer_id FROM auth.users WHERE id <> setter_id AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=auth.users.id AND role::text IN ('admin','setter')) LIMIT 1;
  ASSERT setter_id IS NOT NULL AND customer_id IS NOT NULL, 'Use a fixture database with setter and customer accounts';
  INSERT INTO public.boulders(id,name,color,volume_only,status,thumbnail_url,sector_id)
  VALUES(test_id,'Synthetic thumbnail rollback test','Grün',false,'abgeschraubt',origin,(SELECT id FROM public.sectors LIMIT 1));
  PERFORM set_config('request.jwt.claims',json_build_object('sub',setter_id,'role','authenticated')::text,true);
  SET LOCAL ROLE authenticated;
  ASSERT public.save_boulder_thumbnail(test_id,origin,variant,origin,digest,'{"selected":["one"]}', 'Grün',null,false);
  ASSERT (SELECT count(*)=1 FROM public.boulder_thumbnail_sources WHERE boulder_id=test_id AND thumbnail_url=variant AND original_url=origin);
  ASSERT public.save_boulder_thumbnail(test_id,origin,variant,origin,digest,'{"selected":["one"]}', 'Grün',null,false), 'Lost response replay must succeed';
  BEGIN
    PERFORM public.save_boulder_thumbnail(test_id,origin,other,origin,digest,NULL,'Grün',null,false);
    RAISE EXCEPTION 'Stale image was overwritten';
  EXCEPTION WHEN serialization_failure THEN NULL; END;
  BEGIN
    PERFORM public.save_boulder_thumbnail(test_id,variant,other,origin,digest,NULL,'Rot',null,false);
    RAISE EXCEPTION 'Stale color was accepted';
  EXCEPTION WHEN serialization_failure THEN NULL; END;
  BEGIN
    PERFORM public.save_boulder_thumbnail(test_id,variant,'https://evil.invalid/image.png',origin,digest,NULL,'Grün',null,false);
    RAISE EXCEPTION 'Foreign URL was accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN
    UPDATE public.boulder_thumbnail_sources SET original_url=other WHERE boulder_id=test_id;
    RAISE EXCEPTION 'Direct source mutation was permitted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims',json_build_object('sub',customer_id,'role','authenticated')::text,true);
  SET LOCAL ROLE authenticated;
  ASSERT (SELECT count(*)=0 FROM public.boulder_thumbnail_sources WHERE boulder_id=test_id), 'Customer must not read editor sources';
  BEGIN
    PERFORM public.save_boulder_thumbnail(test_id,variant,other,origin,digest,NULL,'Grün',null,false);
    RAISE EXCEPTION 'Customer wrote thumbnail';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;
  SET LOCAL ROLE anon;
  BEGIN
    PERFORM public.save_boulder_thumbnail(test_id,variant,other,origin,digest,NULL,'Grün',null,false);
    RAISE EXCEPTION 'Anonymous wrote thumbnail';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM count(*) FROM public.boulder_thumbnail_sources;
    RAISE EXCEPTION 'Anonymous read editor source';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;
  ASSERT (SELECT thumbnail_url=variant FROM public.boulders WHERE id=test_id), 'Rejected requests changed thumbnail';
END $$;
ROLLBACK;
