-- Additive hierarchy extension; no rows, IDs, map polygons or Boulder links change.
-- Main areas already exist in sector_areas with admin-only writes (RLS).
-- A logical subarea is the (area_id, subarea_code) pair shared by physical sectors.
-- It is created together with its first sector; no separate empty-group record needed.
BEGIN;
ALTER TABLE public.sectors DROP CONSTRAINT IF EXISTS sectors_subarea_code_format;
ALTER TABLE public.sectors ADD CONSTRAINT sectors_subarea_code_format
  CHECK (subarea_code IS NULL OR subarea_code ~ '^[A-Z][A-Z0-9]{0,2}$');
-- Keep sectors_area_subarea_pair and area_id FK intact, including ON DELETE RESTRICT.
COMMENT ON COLUMN public.sectors.subarea_code IS
  'Logical subarea within area_id: 1–3 uppercase letters/digits, starting with a letter (A, E, AA, B2). Multiple physical sectors may share one pair.';
COMMIT;
