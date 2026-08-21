-- Store the concrete second grip color for boulders marked as dual-color.
-- The generic attribute remains the product flag; color_2 carries its value.
ALTER TABLE public.boulders
  ADD COLUMN IF NOT EXISTS color_2 TEXT;

UPDATE public.boulders
SET color_2 = NULL
WHERE color_2 IS NOT NULL
  AND btrim(color_2) = '';

ALTER TABLE public.boulders
  DROP CONSTRAINT IF EXISTS boulders_colors_different;

ALTER TABLE public.boulders
  ADD CONSTRAINT boulders_colors_different
  CHECK (
    color_2 IS NULL OR (
      btrim(color_2) <> '' AND
      color_2 <> color
    )
  );

CREATE INDEX IF NOT EXISTS idx_boulders_color_2
  ON public.boulders(color_2)
  WHERE color_2 IS NOT NULL;

COMMENT ON COLUMN public.boulders.color_2 IS
  'Optional concrete second grip color for a boulder with the dual_color attribute.';

-- Keep existing rows with a stored second color discoverable through the
-- generic attribute system. assigned_by remains NULL for this migration.
INSERT INTO public.boulder_attribute_assignments (boulder_id, attribute_id, assigned_by)
SELECT b.id, attribute.id, NULL
FROM public.boulders AS b
CROSS JOIN LATERAL (
  SELECT id
  FROM public.boulder_attributes
  WHERE key = 'dual_color'
  LIMIT 1
) AS attribute
WHERE b.color_2 IS NOT NULL
ON CONFLICT (boulder_id, attribute_id) DO NOTHING;
