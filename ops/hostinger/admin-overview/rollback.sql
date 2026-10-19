BEGIN;
DROP FUNCTION IF EXISTS public.kws_admin_issue_events(text);
DROP FUNCTION IF EXISTS public.kws_admin_overview();
NOTIFY pgrst,'reload schema';
COMMIT;
