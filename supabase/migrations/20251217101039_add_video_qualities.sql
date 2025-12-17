-- Add beta_video_urls JSONB column to boulders table
-- This allows storing multiple video quality URLs (HD, SD, Low) for adaptive streaming

ALTER TABLE public.boulders
  ADD COLUMN IF NOT EXISTS beta_video_urls JSONB;

-- Migration: Copy existing beta_video_url values to beta_video_urls.hd for backward compatibility
UPDATE public.boulders
SET beta_video_urls = jsonb_build_object('hd', beta_video_url)
WHERE beta_video_url IS NOT NULL AND beta_video_urls IS NULL;

-- Add index for performance (optional, but helpful for queries filtering by video URLs)
CREATE INDEX IF NOT EXISTS idx_boulders_beta_video_urls ON public.boulders USING GIN (beta_video_urls) WHERE beta_video_urls IS NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN public.boulders.beta_video_urls IS 'JSON object containing video URLs for different quality levels: { "hd": "url", "sd": "url", "low": "url" }';

