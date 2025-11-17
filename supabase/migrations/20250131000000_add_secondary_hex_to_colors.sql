-- Add secondary_hex column to colors table for two-color grips
-- This allows creating colors like "Grün-Gelb" with two colors

-- Add secondary_hex column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'colors' 
    AND column_name = 'secondary_hex'
  ) THEN
    ALTER TABLE public.colors ADD COLUMN secondary_hex TEXT;
    COMMENT ON COLUMN public.colors.secondary_hex IS 'Optional second color hex code for two-color grips (e.g., Grün-Gelb)';
  END IF;
END $$;

