-- Disable automatic boulder notification trigger
-- Notifications will now be created manually by the frontend (BatchUpload component)
-- This ensures reliable batching and prevents duplicate notifications

-- Drop the trigger that automatically creates notifications
DROP TRIGGER IF EXISTS trigger_notify_new_boulder ON public.boulders;

-- Note: The notify_new_boulder() function is kept for potential future use,
-- but the trigger is disabled so notifications are only created manually by the frontend

