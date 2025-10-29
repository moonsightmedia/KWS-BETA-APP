-- Policies referencing enum value 'setter' (apply after enum value exists)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='boulders' AND policyname='Setters can insert boulders'
  ) THEN
    CREATE POLICY "Setters can insert boulders"
      ON public.boulders FOR INSERT TO authenticated
      WITH CHECK (public.has_role(auth.uid(), 'setter') OR public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Optional update policy (commented out)
-- DO $$
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='boulders' AND policyname='Setters can update boulders'
--   ) THEN
--     CREATE POLICY "Setters can update boulders"
--       ON public.boulders FOR UPDATE TO authenticated
--       USING (public.has_role(auth.uid(), 'setter') OR public.has_role(auth.uid(), 'admin'));
--   END IF;
-- END $$;

-- Update storage policies to include 'setter'
DO $$
BEGIN
  -- insert
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='beta-videos insert'
  ) THEN
    DROP POLICY "beta-videos insert" ON storage.objects;
  END IF;
  CREATE POLICY "beta-videos insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'beta-videos' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'setter')));

  -- update
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='beta-videos update'
  ) THEN
    DROP POLICY "beta-videos update" ON storage.objects;
  END IF;
  CREATE POLICY "beta-videos update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'beta-videos' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'setter')));

  -- delete
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='beta-videos delete'
  ) THEN
    DROP POLICY "beta-videos delete" ON storage.objects;
  END IF;
  CREATE POLICY "beta-videos delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'beta-videos' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'setter')));
END $$;


