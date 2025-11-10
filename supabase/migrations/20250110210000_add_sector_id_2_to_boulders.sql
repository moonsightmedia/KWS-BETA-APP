-- Add optional second sector_id for boulders that span multiple sectors
-- This allows boulders to start in one sector and end in another

ALTER TABLE public.boulders
  ADD COLUMN IF NOT EXISTS sector_id_2 UUID REFERENCES public.sectors(id) ON DELETE SET NULL;

-- Add check constraint to ensure sector_id and sector_id_2 are different (if both are set)
ALTER TABLE public.boulders
  DROP CONSTRAINT IF EXISTS boulders_sector_ids_different;

ALTER TABLE public.boulders
  ADD CONSTRAINT boulders_sector_ids_different 
  CHECK (sector_id_2 IS NULL OR sector_id != sector_id_2);

-- Add index for filtering by second sector
CREATE INDEX IF NOT EXISTS idx_boulders_sector_id_2 ON public.boulders(sector_id_2) WHERE sector_id_2 IS NOT NULL;

