-- Update boulder notification trigger to always fire on new boulder insert
-- Remove the status condition so notifications are sent for all new boulders

-- Drop the existing trigger
DROP TRIGGER IF EXISTS trigger_notify_new_boulder ON public.boulders;

-- Recreate the trigger without the WHEN condition
-- This ensures notifications are sent for ALL new boulders, regardless of status
CREATE TRIGGER trigger_notify_new_boulder
  AFTER INSERT ON public.boulders
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_boulder();

