-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('boulder_new', 'competition_update', 'feedback_reply', 'admin_announcement', 'schedule_reminder', 'competition_result', 'competition_leaderboard_change')),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  action_url text
);

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  in_app_enabled boolean NOT NULL DEFAULT true,
  push_enabled boolean NOT NULL DEFAULT false,
  boulder_new boolean NOT NULL DEFAULT true,
  competition_update boolean NOT NULL DEFAULT true,
  feedback_reply boolean NOT NULL DEFAULT true,
  admin_announcement boolean NOT NULL DEFAULT true,
  schedule_reminder boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create push_tokens table
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  device_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(token)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON public.push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON public.push_tokens(token);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can read their own notifications"
  ON public.notifications
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can create notifications for any user"
  ON public.notifications
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Setters can create boulder notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'setter') AND 
    (type = 'boulder_new' OR type = 'schedule_reminder')
  );

CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
  ON public.notifications
  FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for notification_preferences
CREATE POLICY "Users can read their own preferences"
  ON public.notification_preferences
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own preferences"
  ON public.notification_preferences
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own preferences"
  ON public.notification_preferences
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for push_tokens
CREATE POLICY "Users can manage their own push tokens"
  ON public.push_tokens
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function to create a notification
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
  -- Check if user has preferences enabled for this type
  SELECT * INTO v_preferences
  FROM public.notification_preferences
  WHERE user_id = p_user_id;
  
  -- If no preferences exist, create default ones
  IF NOT FOUND THEN
    INSERT INTO public.notification_preferences (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    SELECT * INTO v_preferences
    FROM public.notification_preferences
    WHERE user_id = p_user_id;
  END IF;
  
  -- Check if this notification type is enabled
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
      -- Allow other types by default
      NULL;
  END CASE;
  
  -- Create the notification
  INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
  VALUES (p_user_id, p_type, p_title, p_message, p_data, p_action_url)
  RETURNING id INTO v_notification_id;
  
  -- Note: Push notification sending is handled by:
  -- 1. Database trigger (trigger_send_push_notification) which calls send_push_notification_for_notification()
  -- 2. The trigger checks if push is enabled and if user has tokens
  -- 3. Actual sending is done via Supabase Edge Function (send-push-notification)
  -- 4. Edge Function can be triggered via database webhook or application code
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.notifications
  SET read = true, read_at = now()
  WHERE id = p_notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS void AS $$
BEGIN
  UPDATE public.notifications
  SET read = true, read_at = now()
  WHERE user_id = auth.uid() AND read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread count
CREATE OR REPLACE FUNCTION public.get_unread_count()
RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.notifications
  WHERE user_id = auth.uid() AND read = false;
  
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create admin notification (can send to all or specific users)
CREATE OR REPLACE FUNCTION public.create_admin_notification(
  p_title text,
  p_message text,
  p_user_ids uuid[] DEFAULT NULL,
  p_action_url text DEFAULT NULL
) RETURNS integer AS $$
DECLARE
  v_user_id uuid;
  v_count integer := 0;
BEGIN
  -- Only admins can call this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can create admin notifications';
  END IF;
  
  -- If user_ids provided, send to those users only
  IF p_user_ids IS NOT NULL THEN
    FOREACH v_user_id IN ARRAY p_user_ids
    LOOP
      PERFORM public.create_notification(
        v_user_id,
        'admin_announcement',
        p_title,
        p_message,
        '{}'::jsonb,
        p_action_url
      );
      v_count := v_count + 1;
    END LOOP;
  ELSE
    -- Send to all users
    FOR v_user_id IN SELECT id FROM public.profiles
    LOOP
      PERFORM public.create_notification(
        v_user_id,
        'admin_announcement',
        p_title,
        p_message,
        '{}'::jsonb,
        p_action_url
      );
      v_count := v_count + 1;
    END LOOP;
  END IF;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger to update updated_at on notification_preferences
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Trigger to update last_used_at on push_tokens
CREATE OR REPLACE FUNCTION update_push_tokens_last_used_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_used_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_push_tokens_last_used_at
  BEFORE UPDATE ON public.push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_push_tokens_last_used_at();

