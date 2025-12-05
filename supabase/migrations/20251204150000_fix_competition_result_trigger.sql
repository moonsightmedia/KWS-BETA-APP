-- Fix competition result notification trigger
-- The trigger was using boulder_id which doesn't exist in competition_results table
-- This migration updates the trigger to use boulder_number instead

-- Drop and recreate the trigger function with correct field references
CREATE OR REPLACE FUNCTION notify_competition_result()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
  v_boulder_name text;
  v_boulder_color text;
BEGIN
  -- Get user_id from participant
  SELECT user_id INTO v_user_id
  FROM public.competition_participants
  WHERE id = NEW.participant_id;
  
  -- Get boulder name and color from competition_boulders using boulder_number
  SELECT b.name, cb.color INTO v_boulder_name, v_boulder_color
  FROM public.competition_boulders cb
  LEFT JOIN public.boulders b ON b.id = cb.boulder_id
  WHERE cb.boulder_number = NEW.boulder_number
  LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    PERFORM public.create_notification(
      v_user_id,
      'competition_result',
      'Neues Wettkampf-Ergebnis',
      'Dein Ergebnis für Boulder ' || NEW.boulder_number || COALESCE(' (' || v_boulder_color || ')', '') || ' wurde gespeichert.',
      jsonb_build_object(
        'boulder_number', NEW.boulder_number,
        'result_type', NEW.result_type,
        'attempts', NEW.attempts,
        'points', NEW.points
      ),
      '/competition'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The trigger itself should already exist, but we ensure it's using the updated function
-- No need to drop/recreate the trigger, just ensure the function is updated

