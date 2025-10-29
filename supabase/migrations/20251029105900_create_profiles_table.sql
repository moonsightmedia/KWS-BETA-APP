-- Create profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='profiles'
  ) THEN
    CREATE TABLE public.profiles (
      id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      email text UNIQUE,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END $$;

-- Ensure RLS enabled (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='profiles'
  ) THEN
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create policies if missing (no IF NOT EXISTS supported in CREATE POLICY)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles select self or admin'
  ) THEN
    CREATE POLICY "profiles select self or admin" ON public.profiles
      FOR SELECT TO authenticated
      USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles update self or admin'
  ) THEN
    CREATE POLICY "profiles update self or admin" ON public.profiles
      FOR UPDATE TO authenticated
      USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'))
      WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles insert self'
  ) THEN
    CREATE POLICY "profiles insert self" ON public.profiles
      FOR INSERT TO authenticated
      WITH CHECK (id = auth.uid());
  END IF;
END $$;


