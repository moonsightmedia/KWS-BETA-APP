-- Trigger function for new boulder notifications
CREATE OR REPLACE FUNCTION notify_new_boulder()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Notify all users (or only setter/admins based on preferences)
  -- For now, notify all users who have boulder_new enabled
  FOR v_user_id IN 
    SELECT user_id 
    FROM public.notification_preferences 
    WHERE boulder_new = true
  LOOP
    PERFORM public.create_notification(
      v_user_id,
      'boulder_new',
      'Neuer Boulder verfügbar',
      'Ein neuer Boulder wurde hinzugefügt: ' || COALESCE(NEW.name, 'Unbenannt'),
      jsonb_build_object('boulder_id', NEW.id, 'sector_id', NEW.sector_id),
      '/boulders'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new boulders
DROP TRIGGER IF EXISTS trigger_notify_new_boulder ON public.boulders;
CREATE TRIGGER trigger_notify_new_boulder
  AFTER INSERT ON public.boulders
  FOR EACH ROW
  WHEN (NEW.status = 'haengt')
  EXECUTE FUNCTION notify_new_boulder();

-- Trigger function for feedback status change notifications
CREATE OR REPLACE FUNCTION notify_feedback_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_feedback_creator_id uuid;
BEGIN
  -- Only notify if status changed to 'resolved' or 'closed'
  -- and the user_id exists (not anonymous feedback)
  IF NEW.user_id IS NOT NULL AND 
     OLD.status IS DISTINCT FROM NEW.status AND
     (NEW.status = 'resolved' OR NEW.status = 'closed') THEN
    
    v_feedback_creator_id := NEW.user_id;
    
    IF v_feedback_creator_id IS NOT NULL THEN
      PERFORM public.create_notification(
        v_feedback_creator_id,
        'feedback_reply',
        'Feedback-Update',
        CASE 
          WHEN NEW.status = 'resolved' THEN 'Dein Feedback wurde als gelöst markiert.'
          WHEN NEW.status = 'closed' THEN 'Dein Feedback wurde geschlossen.'
          ELSE 'Dein Feedback wurde aktualisiert.'
        END,
        jsonb_build_object('feedback_id', NEW.id, 'status', NEW.status),
        '/profile'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for feedback status changes
DROP TRIGGER IF EXISTS trigger_notify_feedback_status_change ON public.feedback;
CREATE TRIGGER trigger_notify_feedback_status_change
  AFTER UPDATE ON public.feedback
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_feedback_status_change();

-- Trigger function for competition result notifications
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

-- Trigger for competition results
DROP TRIGGER IF EXISTS trigger_notify_competition_result ON public.competition_results;
CREATE TRIGGER trigger_notify_competition_result
  AFTER INSERT OR UPDATE ON public.competition_results
  FOR EACH ROW
  EXECUTE FUNCTION notify_competition_result();

-- Function to notify about leaderboard changes (can be called manually or via cron)
CREATE OR REPLACE FUNCTION notify_leaderboard_change(
  p_competition_id uuid,
  p_user_id uuid
)
RETURNS void AS $$
DECLARE
  v_user_rank integer;
  v_previous_rank integer;
BEGIN
  -- Get current rank
  SELECT rank INTO v_user_rank
  FROM public.competition_leaderboard
  WHERE competition_id = p_competition_id AND user_id = p_user_id;
  
  -- For now, just notify about leaderboard update
  -- In a more advanced version, you could compare with previous rank
  IF v_user_rank IS NOT NULL THEN
    PERFORM public.create_notification(
      p_user_id,
      'competition_leaderboard_change',
      'Ranglisten-Update',
      'Die Wettkampf-Rangliste wurde aktualisiert. Dein aktueller Rang: ' || v_user_rank || '.',
      jsonb_build_object('competition_id', p_competition_id, 'rank', v_user_rank),
      '/competition'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Leaderboard change notifications should be triggered manually or via cron
-- when leaderboard is recalculated, not on every result change
-- This prevents notification spam

