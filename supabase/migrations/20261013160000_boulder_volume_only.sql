-- Structural setter declaration, independent of colors and community ratings.
-- Existing SELECT and setter/admin write policies remain unchanged.
ALTER TABLE public.boulders
  ADD COLUMN IF NOT EXISTS volume_only boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.boulders.volume_only IS
  'True when this boulder consists exclusively of volumes, without additional holds. Colors remain selectable.';
NOTIFY pgrst, 'reload schema';
