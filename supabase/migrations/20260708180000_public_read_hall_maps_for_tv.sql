-- Allow public read-only TV schedule screens to render the active hall map.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'hall_maps'
      AND policyname = 'Public can read hall maps'
  ) THEN
    CREATE POLICY "Public can read hall maps"
      ON public.hall_maps
      FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sector_map_regions'
      AND policyname = 'Public can read sector map regions'
  ) THEN
    CREATE POLICY "Public can read sector map regions"
      ON public.sector_map_regions
      FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;
