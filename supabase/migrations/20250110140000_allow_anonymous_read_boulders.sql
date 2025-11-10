-- Allow anonymous users (guests) to read boulders with status 'haengt'
-- This enables the guest view to display active boulders

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='boulders' AND policyname='Anonymous can read hanging boulders'
  ) THEN
    CREATE POLICY "Anonymous can read hanging boulders"
      ON public.boulders FOR SELECT TO anon
      USING (status = 'haengt');
  END IF;
END $$;

-- Also allow authenticated users to read all boulders (if not already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='boulders' AND policyname='Authenticated can read all boulders'
  ) THEN
    CREATE POLICY "Authenticated can read all boulders"
      ON public.boulders FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

-- Allow anonymous users to read sectors (needed for guest view filters)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='sectors' AND policyname='Anonymous can read sectors'
  ) THEN
    CREATE POLICY "Anonymous can read sectors"
      ON public.sectors FOR SELECT TO anon
      USING (true);
  END IF;
END $$;

-- Allow authenticated users to read sectors (if not already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='sectors' AND policyname='Authenticated can read sectors'
  ) THEN
    CREATE POLICY "Authenticated can read sectors"
      ON public.sectors FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

