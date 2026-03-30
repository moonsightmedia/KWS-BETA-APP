-- Create hall maps for interactive sector-based hall navigation

CREATE TABLE IF NOT EXISTS public.hall_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sector_map_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hall_map_id UUID NOT NULL REFERENCES public.hall_maps(id) ON DELETE CASCADE,
  sector_id UUID NOT NULL REFERENCES public.sectors(id) ON DELETE CASCADE,
  shape_type TEXT NOT NULL DEFAULT 'polygon' CHECK (shape_type IN ('polygon')),
  points_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  label_x NUMERIC(5,2),
  label_y NUMERIC(5,2),
  z_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hall_maps_single_active
  ON public.hall_maps (is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_sector_map_regions_hall_map_id
  ON public.sector_map_regions (hall_map_id);

CREATE INDEX IF NOT EXISTS idx_sector_map_regions_sector_id
  ON public.sector_map_regions (sector_id);

ALTER TABLE public.hall_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sector_map_regions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read hall maps" ON public.hall_maps;
CREATE POLICY "Authenticated can read hall maps"
  ON public.hall_maps
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins and setters can manage hall maps" ON public.hall_maps;
CREATE POLICY "Admins and setters can manage hall maps"
  ON public.hall_maps
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'setter'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'setter'));

DROP POLICY IF EXISTS "Authenticated can read sector map regions" ON public.sector_map_regions;
CREATE POLICY "Authenticated can read sector map regions"
  ON public.sector_map_regions
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins and setters can manage sector map regions" ON public.sector_map_regions;
CREATE POLICY "Admins and setters can manage sector map regions"
  ON public.sector_map_regions
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'setter'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'setter'));

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'hall-maps') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('hall-maps', 'hall-maps', true);
  END IF;
END $$;

DROP POLICY IF EXISTS "hall-maps read" ON storage.objects;
CREATE POLICY "hall-maps read"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'hall-maps');

DROP POLICY IF EXISTS "hall-maps insert" ON storage.objects;
CREATE POLICY "hall-maps insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'hall-maps'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'setter'))
  );

DROP POLICY IF EXISTS "hall-maps update" ON storage.objects;
CREATE POLICY "hall-maps update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'hall-maps'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'setter'))
  )
  WITH CHECK (
    bucket_id = 'hall-maps'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'setter'))
  );

DROP POLICY IF EXISTS "hall-maps delete" ON storage.objects;
CREATE POLICY "hall-maps delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'hall-maps'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'setter'))
  );
