-- Add 'setter' to app_role enum if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'setter'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'setter';
  END IF;
END $$;


