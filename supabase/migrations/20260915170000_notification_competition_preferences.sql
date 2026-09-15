-- Keep the existing authorization boundary and service-role boulder restriction.
-- The Wettkämpfe preference must also cover results and leaderboard updates.
-- Local preparation only: review/apply separately before release.
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_data jsonb DEFAULT '{}'::jsonb,
  p_action_url text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_notification_id uuid;
  v_preferences public.notification_preferences;
BEGIN
  -- Authorization: the server callback may only create boulder notifications;
  -- admins retain full access and setters retain their existing type allowlist.
  IF auth.role() = 'service_role' AND p_type = 'boulder_new' THEN
    NULL;
  ELSIF public.has_role(auth.uid(), 'admin') THEN
    NULL;
  ELSIF public.has_role(auth.uid(), 'setter') AND p_type IN ('boulder_new', 'schedule_reminder') THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Unauthorized to create notifications';
  END IF;

  SELECT * INTO v_preferences
  FROM public.notification_preferences
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.notification_preferences (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT * INTO v_preferences
    FROM public.notification_preferences
    WHERE user_id = p_user_id;
  END IF;

  IF NOT v_preferences.in_app_enabled THEN
    RETURN NULL;
  END IF;

  CASE p_type
    WHEN 'boulder_new' THEN
      IF NOT v_preferences.boulder_new THEN RETURN NULL; END IF;
    WHEN 'competition_update', 'competition_result', 'competition_leaderboard_change' THEN
      IF NOT v_preferences.competition_update THEN RETURN NULL; END IF;
    WHEN 'feedback_reply' THEN
      IF NOT v_preferences.feedback_reply THEN RETURN NULL; END IF;
    WHEN 'admin_announcement' THEN
      IF NOT v_preferences.admin_announcement THEN RETURN NULL; END IF;
    WHEN 'schedule_reminder' THEN
      IF NOT v_preferences.schedule_reminder THEN RETURN NULL; END IF;
    ELSE
      NULL;
  END CASE;

  INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
  VALUES (p_user_id, p_type, p_title, p_message, p_data, p_action_url)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
