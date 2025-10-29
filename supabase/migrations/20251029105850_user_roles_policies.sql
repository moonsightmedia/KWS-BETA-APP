-- Create user_roles RLS policies after has_role() exists

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_roles' AND policyname='user_roles select self or admin'
  ) THEN
    CREATE POLICY "user_roles select self or admin" ON public.user_roles
      FOR SELECT TO authenticated
      USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_roles' AND policyname='user_roles admin insert'
  ) THEN
    CREATE POLICY "user_roles admin insert" ON public.user_roles
      FOR INSERT TO authenticated
      WITH CHECK (public.has_role(auth.uid(),'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_roles' AND policyname='user_roles admin update'
  ) THEN
    CREATE POLICY "user_roles admin update" ON public.user_roles
      FOR UPDATE TO authenticated
      USING (public.has_role(auth.uid(),'admin'))
      WITH CHECK (public.has_role(auth.uid(),'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_roles' AND policyname='user_roles admin delete'
  ) THEN
    CREATE POLICY "user_roles admin delete" ON public.user_roles
      FOR DELETE TO authenticated
      USING (public.has_role(auth.uid(),'admin'));
  END IF;
END $$;


