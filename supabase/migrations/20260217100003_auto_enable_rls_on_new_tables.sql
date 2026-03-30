-- Security: Automatically enable RLS on new tables created in public schema.
-- This ensures that no table is accidentally left exposed without RLS protection.
-- Based on Supabase best practices: https://supabase.com/docs/guides/database/postgres/event-triggers

-- Function to automatically enable RLS on new tables in public schema
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
    -- Only enable RLS for tables created in the public schema
    IF r.command_tag = 'CREATE TABLE' AND r.schema_name = 'public' THEN
      -- Use object_identity which includes schema.table format
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', r.object_identity);
      
      -- Log the action (optional, can be removed if not needed)
      RAISE NOTICE 'RLS automatically enabled on table: %', r.object_identity;
    END IF;
  END LOOP;
END;
$$;

-- Drop existing event trigger if it exists (idempotent)
DROP EVENT TRIGGER IF EXISTS enable_rls_on_create_table;

-- Create event trigger that fires after CREATE TABLE commands
CREATE EVENT TRIGGER enable_rls_on_create_table
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE')
  EXECUTE FUNCTION public.auto_enable_rls();

-- Grant necessary permissions (event triggers need superuser, but function can be owned by postgres)
-- Note: Event triggers are created by superuser (postgres role), so permissions are already set
