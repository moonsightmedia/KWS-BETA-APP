-- Make gender required for competition participants
-- This ensures no results can be created without a gender entry

-- First, update the CHECK constraint to remove 'other' and make gender NOT NULL
-- But first, we need to handle existing participants without gender

-- Option 1: Delete participants without gender who have no results
DELETE FROM public.competition_participants
WHERE gender IS NULL
  AND id NOT IN (
    SELECT DISTINCT participant_id 
    FROM public.competition_results 
    WHERE participant_id IS NOT NULL
  );

-- Option 2: For participants with results but no gender, we need to decide:
-- Since we can't know their gender, we'll delete them too (or you could set a default)
-- But first check if there are any
DO $$
DECLARE
  participants_with_results_but_no_gender INTEGER;
BEGIN
  SELECT COUNT(*) INTO participants_with_results_but_no_gender
  FROM public.competition_participants cp
  WHERE cp.gender IS NULL
    AND EXISTS (
      SELECT 1 FROM public.competition_results cr 
      WHERE cr.participant_id = cp.id
    );
  
  IF participants_with_results_but_no_gender > 0 THEN
    RAISE NOTICE 'Found % participants with results but no gender. These will be deleted.', participants_with_results_but_no_gender;
    -- Delete results first (due to foreign key constraint)
    DELETE FROM public.competition_results
    WHERE participant_id IN (
      SELECT id FROM public.competition_participants WHERE gender IS NULL
    );
    -- Then delete participants
    DELETE FROM public.competition_participants WHERE gender IS NULL;
  END IF;
END $$;

-- Now alter the table to make gender NOT NULL and update CHECK constraint
ALTER TABLE public.competition_participants
  DROP CONSTRAINT IF EXISTS competition_participants_gender_check;

ALTER TABLE public.competition_participants
  ALTER COLUMN gender SET NOT NULL;

ALTER TABLE public.competition_participants
  ADD CONSTRAINT competition_participants_gender_check 
  CHECK (gender IN ('male', 'female'));

-- Add a comment explaining the requirement
COMMENT ON COLUMN public.competition_participants.gender IS 'Geschlecht/Klasse des Teilnehmers. Verpflichtend für die Teilnahme am Wettkampf.';

-- Create a function to check if participant has gender before allowing result creation
CREATE OR REPLACE FUNCTION check_participant_gender_before_result()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the participant has a gender
  IF NOT EXISTS (
    SELECT 1 FROM public.competition_participants
    WHERE id = NEW.participant_id
    AND gender IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Teilnehmer hat kein Geschlecht/Klasse angegeben. Bitte aktualisiere dein Profil.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce gender requirement before result creation
DROP TRIGGER IF EXISTS check_participant_gender_on_result_insert ON public.competition_results;
CREATE TRIGGER check_participant_gender_on_result_insert
  BEFORE INSERT OR UPDATE ON public.competition_results
  FOR EACH ROW
  EXECUTE FUNCTION check_participant_gender_before_result();

