-- Group the existing physical wall sectors into five customer-facing areas.
--
-- Existing sector IDs and names stay untouched because boulders, schedules,
-- map regions, QR codes and legacy URLs already reference them. The new fields
-- only add a stable customer vocabulary on top of those technical sectors.

CREATE TABLE IF NOT EXISTS public.sector_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  sort_order INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sectors
  ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES public.sector_areas(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS subarea_code TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sectors_subarea_code_format'
      AND conrelid = 'public.sectors'::regclass
  ) THEN
    ALTER TABLE public.sectors
      ADD CONSTRAINT sectors_subarea_code_format
      CHECK (subarea_code IS NULL OR subarea_code ~ '^[A-D]$');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sectors_area_subarea_pair'
      AND conrelid = 'public.sectors'::regclass
  ) THEN
    ALTER TABLE public.sectors
      ADD CONSTRAINT sectors_area_subarea_pair
      CHECK ((area_id IS NULL) = (subarea_code IS NULL));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sector_areas_active_sort
  ON public.sector_areas (is_active, sort_order, name);

CREATE INDEX IF NOT EXISTS idx_sectors_area_subarea_sort
  ON public.sectors (area_id, subarea_code, sort_order)
  WHERE is_active = true;

ALTER TABLE public.sector_areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read sector areas" ON public.sector_areas;
CREATE POLICY "Public can read sector areas"
  ON public.sector_areas
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins and setters can manage sector areas" ON public.sector_areas;
DROP POLICY IF EXISTS "Admins can manage sector areas" ON public.sector_areas;
CREATE POLICY "Admins can manage sector areas"
  ON public.sector_areas
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.sector_areas TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sector_areas TO authenticated;

INSERT INTO public.sector_areas (name, slug, sort_order, description)
VALUES
  ('Bug', 'bug', 1, 'Bug mit den flexibel planbaren Teilbereichen A bis D.'),
  ('Couch-Ecke', 'couch-ecke', 2, 'Couch-Ecke mit den Teilbereichen A und B.'),
  ('Top-Out', 'top-out', 3, 'Top-Out mit den Teilbereichen A bis D.'),
  ('Lange Platte', 'lange-platte', 4, 'Lange Platte mit den Teilbereichen A bis D.'),
  ('Grotte', 'grotte', 5, 'Grotte mit den Teilbereichen A bis D.')
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  sort_order = EXCLUDED.sort_order,
  description = EXCLUDED.description,
  is_active = true,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.update_sector_areas_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_sector_areas_updated_at ON public.sector_areas;
CREATE TRIGGER update_sector_areas_updated_at
  BEFORE UPDATE ON public.sector_areas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sector_areas_updated_at();

-- Mapping derived from the annotated hall map supplied on 2026-08-25.
-- Felsenmeer (the formerly annotated "Kurze Platte") and Atta-Hoehle are
-- intentionally both part of Bug A. This lets one logical subarea highlight
-- and schedule more than one physical wall polygon without deleting IDs.
DO $$
DECLARE
  invalid_name TEXT;
  sector_count INTEGER;
BEGIN
  -- Fresh local databases have no sector seed in this repository. Keep resets
  -- reproducible, but fail loudly on populated environments with schema drift.
  IF EXISTS (SELECT 1 FROM public.sectors) THEN
    SELECT count(*) INTO sector_count FROM public.sectors;
    IF sector_count <> 19 THEN
      RAISE EXCEPTION 'Expected 19 physical sector rows before area mapping, but found %.', sector_count;
    END IF;

    SELECT expected.legacy_name
    INTO invalid_name
    FROM unnest(ARRAY[
      'Atta-Höhle', 'Felsenmeer', 'Steuerbord', 'Bug', 'Buckbord',
      'Zwergenwand', 'Kahlwinkel',
      'Hönneportal', 'Hintere Burgmauer', 'Vollmond-klippe', 'Vordere Burgmauer',
      'Phänomenturm', 'Übergang', 'Albsteg', 'Deckenhöhle',
      'Avalonia', 'Durchbruch', 'Wandelwand', 'Bilstein'
    ]::TEXT[]) AS expected(legacy_name)
    LEFT JOIN public.sectors AS sector
      ON sector.name = expected.legacy_name
    GROUP BY expected.legacy_name
    HAVING count(sector.id) <> 1
    LIMIT 1;

    IF invalid_name IS NOT NULL THEN
      RAISE EXCEPTION 'Expected exactly one legacy sector row named %, but the mapping is incomplete or ambiguous.', invalid_name;
    END IF;
  END IF;
END;
$$;

WITH sector_mapping (legacy_name, area_slug, subarea_code, sector_sort_order) AS (
  VALUES
    ('Atta-Höhle', 'bug', 'A', 1),
    ('Felsenmeer', 'bug', 'A', 2),
    ('Steuerbord', 'bug', 'B', 3),
    ('Bug', 'bug', 'C', 4),
    ('Buckbord', 'bug', 'D', 5),

    ('Zwergenwand', 'couch-ecke', 'A', 1),
    ('Kahlwinkel', 'couch-ecke', 'B', 2),

    ('Hönneportal', 'top-out', 'A', 1),
    ('Hintere Burgmauer', 'top-out', 'B', 2),
    ('Vollmond-klippe', 'top-out', 'C', 3),
    ('Vordere Burgmauer', 'top-out', 'D', 4),

    ('Phänomenturm', 'lange-platte', 'A', 1),
    ('Übergang', 'lange-platte', 'B', 2),
    ('Albsteg', 'lange-platte', 'C', 3),
    ('Deckenhöhle', 'lange-platte', 'D', 4),

    ('Avalonia', 'grotte', 'A', 1),
    ('Durchbruch', 'grotte', 'B', 2),
    ('Wandelwand', 'grotte', 'C', 3),
    ('Bilstein', 'grotte', 'D', 4)
), resolved_mapping AS (
  SELECT
    mapping.legacy_name,
    mapping.subarea_code,
    mapping.sector_sort_order,
    area.id AS area_id
  FROM sector_mapping AS mapping
  JOIN public.sector_areas AS area
    ON area.slug = mapping.area_slug
)
UPDATE public.sectors AS sector
SET
  area_id = mapping.area_id,
  subarea_code = mapping.subarea_code,
  sort_order = mapping.sector_sort_order,
  is_active = true,
  updated_at = now()
FROM resolved_mapping AS mapping
WHERE sector.name = mapping.legacy_name;

-- The existing boulder foreign keys stay unchanged. Validate that every
-- currently referenced wall now resolves to a complete customer-facing label,
-- and refresh the cached counts from the actual primary/secondary relations.
DO $$
DECLARE
  invalid_sector_name TEXT;
  invalid_boulder_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM public.sectors) THEN
    SELECT sector.name
    INTO invalid_sector_name
    FROM public.sectors AS sector
    WHERE sector.area_id IS NULL OR sector.subarea_code IS NULL
    LIMIT 1;

    IF invalid_sector_name IS NOT NULL THEN
      RAISE EXCEPTION 'Physical sector % has no complete area/subarea assignment.', invalid_sector_name;
    END IF;
  END IF;

  IF to_regclass('public.boulders') IS NOT NULL THEN
    SELECT boulder.id
    INTO invalid_boulder_id
    FROM public.boulders AS boulder
    LEFT JOIN public.sectors AS primary_sector
      ON primary_sector.id = boulder.sector_id
    LEFT JOIN public.sectors AS secondary_sector
      ON secondary_sector.id = boulder.sector_id_2
    WHERE primary_sector.area_id IS NULL
      OR primary_sector.subarea_code IS NULL
      OR (
        boulder.sector_id_2 IS NOT NULL
        AND (secondary_sector.area_id IS NULL OR secondary_sector.subarea_code IS NULL)
      )
    LIMIT 1;

    IF invalid_boulder_id IS NOT NULL THEN
      RAISE EXCEPTION 'Boulder % still references a sector without a complete area/subarea assignment.', invalid_boulder_id;
    END IF;

    UPDATE public.sectors AS sector
    SET boulder_count = (
      SELECT count(DISTINCT boulder.id)
      FROM public.boulders AS boulder
      WHERE (boulder.status IS NULL OR boulder.status = 'haengt')
        AND (boulder.sector_id = sector.id OR boulder.sector_id_2 = sector.id)
    );
  END IF;
END;
$$;

COMMENT ON TABLE public.sector_areas IS
  'Customer-facing hall areas such as Bug or Grotte. Physical wall sectors remain in public.sectors.';

COMMENT ON COLUMN public.sectors.area_id IS
  'Customer-facing parent area. Existing sector rows remain the physical/map-compatible leaves.';

COMMENT ON COLUMN public.sectors.subarea_code IS
  'Short operational label inside an area, normally A-D. Multiple physical sectors may share one logical label.';
