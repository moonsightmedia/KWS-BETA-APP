-- Allow boulders to carry an optional second color and a partner-boulder flag.

ALTER TABLE public.boulders
  ADD COLUMN IF NOT EXISTS color_2 TEXT,
  ADD COLUMN IF NOT EXISTS is_partner_boulder BOOLEAN DEFAULT FALSE;

UPDATE public.boulders
SET is_partner_boulder = FALSE
WHERE is_partner_boulder IS NULL;

ALTER TABLE public.boulders
  ALTER COLUMN is_partner_boulder SET DEFAULT FALSE,
  ALTER COLUMN is_partner_boulder SET NOT NULL;

ALTER TABLE public.boulders
  DROP CONSTRAINT IF EXISTS boulders_colors_different;

ALTER TABLE public.boulders
  ADD CONSTRAINT boulders_colors_different
  CHECK (
    color_2 IS NULL
    OR (NULLIF(TRIM(color_2), '') IS NOT NULL AND color <> color_2)
  );

CREATE INDEX IF NOT EXISTS idx_boulders_color_2
  ON public.boulders(color_2)
  WHERE color_2 IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_boulders_is_partner_boulder
  ON public.boulders(is_partner_boulder)
  WHERE is_partner_boulder = TRUE;

COMMENT ON COLUMN public.boulders.color_2 IS 'Optional second grip color for mixed-color boulders.';
COMMENT ON COLUMN public.boulders.is_partner_boulder IS 'Marks a boulder as partner boulder.';
