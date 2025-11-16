  -- Add thumbnail_url column to boulders table
  -- This allows storing a separate thumbnail image URL for each boulder
  -- The thumbnail typically shows the starting holds of the boulder

  ALTER TABLE public.boulders
    ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

  -- Add index for performance (optional, but helpful for queries filtering by thumbnail)
  CREATE INDEX IF NOT EXISTS idx_boulders_thumbnail_url ON public.boulders(thumbnail_url) WHERE thumbnail_url IS NOT NULL;

  -- Add comment to document the column
  COMMENT ON COLUMN public.boulders.thumbnail_url IS 'URL to the thumbnail image showing the starting holds of the boulder';
