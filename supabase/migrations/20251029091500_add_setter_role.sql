-- Add 'setter' to app_role enum if not exists (must be committed before use)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'setter'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'setter';
  END IF;
END $$;

-- NOTE: Policies that reference 'setter' are in a separate migration file

