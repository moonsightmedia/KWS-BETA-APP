-- Check if the batch notification migration has been applied
-- Run this in Supabase SQL Editor to verify the migration status

-- Check if notify_new_boulder function exists and has the batching logic
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'notify_new_boulder';

-- Check if the function contains batching logic (looks for v_existing_notification_id)
SELECT 
    CASE 
        WHEN pg_get_functiondef(p.oid) LIKE '%v_existing_notification_id%' 
        THEN '✅ Migration applied - Function contains batching logic'
        ELSE '❌ Migration NOT applied - Function missing batching logic'
    END as migration_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'notify_new_boulder';

-- Check recent notifications to see if batching is working
SELECT 
    id,
    type,
    message,
    data->>'boulder_count' as boulder_count,
    data->>'boulder_ids' as boulder_ids,
    created_at
FROM public.notifications
WHERE type = 'boulder_new'
ORDER BY created_at DESC
LIMIT 10;

