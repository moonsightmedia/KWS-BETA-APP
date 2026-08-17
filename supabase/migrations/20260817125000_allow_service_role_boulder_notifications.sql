-- Allow the trusted Hostinger service-role callback to create the boulder-new
-- notifications fired when an asynchronously processed video becomes ready.
-- The service role is restricted to this one notification type; setter/admin
-- behavior remains unchanged.

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
    WHEN 'competition_update' THEN
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

-- Notification delivery must never roll back the video-ready transition. Keep
-- the existing per-user batching behavior, but isolate each recipient in a
-- subtransaction so an individual notification failure is non-blocking.
CREATE OR REPLACE FUNCTION public.notify_new_boulder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_existing_notification_id uuid;
  v_boulder_count integer;
  v_boulder_ids jsonb;
  v_sector_ids jsonb;
  v_message text;
BEGIN
  FOR v_user_id IN
    SELECT user_id
    FROM public.notification_preferences
    WHERE boulder_new = true
  LOOP
    BEGIN
      SELECT id INTO v_existing_notification_id
      FROM public.notifications
      WHERE user_id = v_user_id
        AND type = 'boulder_new'
        AND read = false
        AND created_at > now() - interval '10 seconds'
      ORDER BY created_at DESC
      LIMIT 1;

      IF v_existing_notification_id IS NOT NULL THEN
        SELECT
          COALESCE((data->>'boulder_count')::integer, 1),
          COALESCE(data->'boulder_ids', jsonb_build_array()),
          COALESCE(data->'sector_ids', jsonb_build_array())
        INTO v_boulder_count, v_boulder_ids, v_sector_ids
        FROM public.notifications
        WHERE id = v_existing_notification_id;

        v_boulder_count := v_boulder_count + 1;
        v_boulder_ids := v_boulder_ids || jsonb_build_array(NEW.id::text);

        IF NOT (v_sector_ids @> jsonb_build_array(NEW.sector_id::text)) THEN
          v_sector_ids := v_sector_ids || jsonb_build_array(NEW.sector_id::text);
        END IF;

        IF v_boulder_count = 1 THEN
          v_message := 'Ein neuer Boulder wurde hinzugefügt: ' || COALESCE(NEW.name, 'Unbenannt');
        ELSE
          v_message := v_boulder_count || ' neue Boulder wurden hinzugefügt';
        END IF;

        UPDATE public.notifications
        SET message = v_message,
            data = jsonb_build_object(
              'boulder_count', v_boulder_count,
              'boulder_ids', v_boulder_ids,
              'sector_ids', v_sector_ids,
              'latest_boulder_id', NEW.id,
              'latest_sector_id', NEW.sector_id
            )
        WHERE id = v_existing_notification_id;
      ELSE
        PERFORM public.create_notification(
          v_user_id,
          'boulder_new',
          'Neuer Boulder verfügbar',
          'Ein neuer Boulder wurde hinzugefügt: ' || COALESCE(NEW.name, 'Unbenannt'),
          jsonb_build_object(
            'boulder_id', NEW.id,
            'boulder_count', 1,
            'boulder_ids', jsonb_build_array(NEW.id::text),
            'sector_id', NEW.sector_id,
            'sector_ids', jsonb_build_array(NEW.sector_id::text),
            'latest_boulder_id', NEW.id,
            'latest_sector_id', NEW.sector_id
          ),
          '/boulders'
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Boulder notification skipped: % %', SQLSTATE, SQLERRM;
    END;
  END LOOP;

  RETURN NEW;
END;
$$;
