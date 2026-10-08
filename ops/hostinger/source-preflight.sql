-- Read-only metadata/counts for Dashboard SQL Editor or psql.
-- This is a preliminary inventory, not a database backup or final snapshot.
WITH table_counts AS (
  SELECT n.nspname AS schema_name, c.relname AS table_name,
    ((xpath('/row/n/text()', query_to_xml(
      format('SELECT count(*) AS n FROM %I.%I', n.nspname,c.relname),
      false,true,'')))[1]::text)::bigint AS row_count
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname IN ('public','auth','storage','vault','supabase_functions')
    AND c.relkind IN ('r','p') AND NOT c.relispartition
)
SELECT jsonb_build_object(
  'version',current_setting('server_version'),
  'database_bytes',pg_database_size(current_database()),
  'inspected_as',current_user,
  'schemas',(SELECT jsonb_agg(nspname ORDER BY nspname) FROM pg_namespace
    WHERE nspname NOT LIKE 'pg_%' AND nspname<>'information_schema'),
  'extensions',(SELECT jsonb_agg(jsonb_build_object('name',extname,'version',extversion) ORDER BY extname) FROM pg_extension),
  'table_counts',(SELECT jsonb_agg(to_jsonb(t) ORDER BY schema_name,table_name) FROM table_counts t),
  'password_users',(SELECT count(*) FROM auth.users WHERE encrypted_password IS NOT NULL AND encrypted_password<>''),
  'email_confirmed_users',(SELECT count(*) FROM auth.users WHERE email_confirmed_at IS NOT NULL),
  'publications',(SELECT jsonb_agg(pubname ORDER BY pubname) FROM pg_publication)
) AS preliminary_inventory;
