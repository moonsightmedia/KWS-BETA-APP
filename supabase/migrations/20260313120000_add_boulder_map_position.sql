-- Add map position columns to boulders for marking boulder location on the hall map.
-- Values are 0-100 percent of map width (map_x) and height (map_y); NULL = not set.

ALTER TABLE public.boulders
  ADD COLUMN IF NOT EXISTS map_x NUMERIC(5,2) NULL,
  ADD COLUMN IF NOT EXISTS map_y NUMERIC(5,2) NULL;

COMMENT ON COLUMN public.boulders.map_x IS 'X position on hall map (0-100 percent of map width); NULL = not set';
COMMENT ON COLUMN public.boulders.map_y IS 'Y position on hall map (0-100 percent of map height); NULL = not set';
