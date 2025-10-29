-- Create enum for boulder status and add column to boulders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t WHERE t.typname = 'boulder_status'
  ) THEN
    CREATE TYPE public.boulder_status AS ENUM ('haengt', 'abgeschraubt');
  END IF;
END $$;

ALTER TABLE public.boulders
  ADD COLUMN IF NOT EXISTS status public.boulder_status NOT NULL DEFAULT 'haengt';

-- Optional index for filtering by status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_boulders_status'
  ) THEN
    CREATE INDEX idx_boulders_status ON public.boulders(status);
  END IF;
END $$;


