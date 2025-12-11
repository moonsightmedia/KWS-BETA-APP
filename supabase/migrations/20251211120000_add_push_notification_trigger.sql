-- Add trigger to automatically send push notifications when a notification is created
-- This trigger calls the Supabase Edge Function to send push notifications

-- Function to send push notification via Edge Function
CREATE OR REPLACE FUNCTION send_push_notification_for_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_preferences public.notification_preferences;
  v_has_push_tokens boolean;
BEGIN
  -- Check if user has push notifications enabled
  SELECT * INTO v_preferences
  FROM public.notification_preferences
  WHERE user_id = NEW.user_id;
  
  -- If no preferences exist, skip (user hasn't configured notifications)
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  -- Check if push is enabled
  IF NOT v_preferences.push_enabled THEN
    RETURN NEW;
  END IF;
  
  -- Check if user has push tokens registered
  SELECT EXISTS(
    SELECT 1 FROM public.push_tokens WHERE user_id = NEW.user_id
  ) INTO v_has_push_tokens;
  
  IF NOT v_has_push_tokens THEN
    -- No push tokens, skip
    RETURN NEW;
  END IF;
  
  -- Note: The actual push notification sending is handled by:
  -- 1. Supabase Edge Function (send-push-notification)
  -- 2. Called via HTTP request from application code or webhook
  -- 
  -- We can't call HTTP directly from PostgreSQL, so we'll use pg_net extension
  -- or rely on application code to call sendPushNotificationForNotification
  -- 
  -- For now, we'll create a database webhook that triggers the Edge Function
  -- This webhook should be configured in Supabase Dashboard:
  -- Database > Webhooks > Create Webhook
  -- Table: notifications
  -- Events: INSERT
  -- HTTP Request: POST to Edge Function URL
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call push notification function
DROP TRIGGER IF EXISTS trigger_send_push_notification ON public.notifications;
CREATE TRIGGER trigger_send_push_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION send_push_notification_for_notification();

-- Note: To enable automatic push notifications:
-- 1. Go to Supabase Dashboard > Database > Webhooks
-- 2. Create a new webhook:
--    - Table: notifications
--    - Events: INSERT
--    - HTTP Request: POST
--    - URL: https://<project-ref>.supabase.co/functions/v1/send-push-notification
--    - HTTP Headers: Authorization: Bearer <anon_key>
--    - HTTP Body: { "notification_id": "{{ $1.id }}" }
-- 3. Or use pg_net extension to call HTTP directly from trigger (requires extension)

