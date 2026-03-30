-- Fix auto_enable_rls event trigger to use fully qualified object_identity safely

CREATE OR REPLACE FUNCTION public.auto_enable_rls()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF r.command_tag = 'CREATE TABLE' AND r.schema_name = 'public' THEN
      EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', r.object_identity);
      RAISE NOTICE 'RLS automatically enabled on table: %', r.object_identity;
    END IF;
  END LOOP;
END;
$$;