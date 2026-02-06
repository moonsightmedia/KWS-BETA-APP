-- Set user_id from auth.uid() when null so client can send user_id: null and RLS still allows insert
CREATE OR REPLACE FUNCTION public.boulder_operation_logs_set_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS boulder_operation_logs_set_user_id_trigger ON public.boulder_operation_logs;
CREATE TRIGGER boulder_operation_logs_set_user_id_trigger
  BEFORE INSERT ON public.boulder_operation_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.boulder_operation_logs_set_user_id();
