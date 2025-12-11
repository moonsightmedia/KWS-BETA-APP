-- Debug script to understand why batching is not working
-- Run this in Supabase SQL Editor

-- 1. Check if the function has the batching logic
SELECT 
    CASE 
        WHEN pg_get_functiondef(p.oid) LIKE '%v_existing_notification_id%' 
        THEN '✅ Function has batching logic'
        ELSE '❌ Function missing batching logic'
    END as function_status,
    CASE 
        WHEN pg_get_functiondef(p.oid) LIKE '%INTERVAL ''10 seconds''%' 
        THEN '✅ Function checks 10 second window'
        ELSE '❌ Function missing 10 second check'
    END as time_window_check
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'notify_new_boulder';

-- 2. Check how many users have boulder_new enabled
SELECT 
    COUNT(*) as users_with_boulder_new_enabled,
    array_agg(user_id::text) as user_ids
FROM public.notification_preferences
WHERE boulder_new = true;

-- 3. Check the two duplicate notifications from 11:20:07
SELECT 
    id,
    user_id,
    type,
    message,
    data->>'boulder_count' as boulder_count,
    data->>'boulder_id' as boulder_id,
    data->>'boulder_ids' as boulder_ids,
    created_at,
    read
FROM public.notifications
WHERE created_at = '2025-12-11 11:20:07.967647+00'
ORDER BY created_at DESC;

-- 4. Check if there are any notifications created within 10 seconds of each other
SELECT 
    n1.id as notification_1_id,
    n1.user_id as user_1_id,
    n1.created_at as created_at_1,
    n2.id as notification_2_id,
    n2.user_id as user_2_id,
    n2.created_at as created_at_2,
    EXTRACT(EPOCH FROM (n2.created_at - n1.created_at)) as seconds_between
FROM public.notifications n1
JOIN public.notifications n2 ON n1.type = n2.type AND n1.user_id = n2.user_id
WHERE n1.type = 'boulder_new'
  AND n1.id < n2.id
  AND n2.created_at - n1.created_at < INTERVAL '10 seconds'
  AND n1.read = false
ORDER BY n1.created_at DESC
LIMIT 10;

-- 5. Check the trigger exists
SELECT 
    tgname as trigger_name,
    tgtype,
    tgenabled
FROM pg_trigger
WHERE tgname = 'trigger_notify_new_boulder';

