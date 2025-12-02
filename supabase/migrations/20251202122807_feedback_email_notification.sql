-- Function to notify admins about new feedback
-- This can be extended later to actually send emails via Edge Function or external service

CREATE OR REPLACE FUNCTION notify_admins_on_feedback()
RETURNS TRIGGER AS $$
BEGIN
  -- For now, this function just logs the feedback
  -- In production, this can be extended to:
  -- 1. Call a Supabase Edge Function to send email
  -- 2. Use an external email service API
  -- 3. Send notifications via Supabase Realtime
  
  -- Log the feedback creation (for debugging)
  RAISE NOTICE 'New feedback created: % (Type: %, Priority: %)', NEW.title, NEW.type, NEW.priority;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the notification function when feedback is inserted
-- Only create if table exists and trigger doesn't exist yet
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'feedback'
  ) THEN
    -- Drop trigger if it exists (to allow re-running migration)
    DROP TRIGGER IF EXISTS feedback_notify_admins ON feedback;
    
    -- Create trigger
    CREATE TRIGGER feedback_notify_admins
      AFTER INSERT ON feedback
      FOR EACH ROW
      EXECUTE FUNCTION notify_admins_on_feedback();
  END IF;
END $$;

-- Note: To actually send emails, you can:
-- 1. Create a Supabase Edge Function that sends emails via Resend/SendGrid/etc.
-- 2. Call that function from this trigger using pg_net or http extension
-- 3. Or use Supabase's built-in email service if available

