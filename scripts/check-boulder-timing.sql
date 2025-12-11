-- Check the timing of boulder creation to see if they were created within 10 seconds
-- This helps understand why batching didn't work

-- Find the boulder that matches the notification
SELECT 
    b.id as boulder_id,
    b.name as boulder_name,
    b.created_at as boulder_created_at,
    n.id as notification_id,
    n.user_id,
    n.created_at as notification_created_at,
    n.data->>'boulder_count' as boulder_count,
    EXTRACT(EPOCH FROM (n.created_at - b.created_at)) as seconds_between_boulder_and_notification
FROM public.boulders b
LEFT JOIN public.notifications n ON n.data->>'boulder_id' = b.id::text
WHERE b.id = 'cc000123-805c-42d8-9c32-a8ddcfa3b956'
ORDER BY n.created_at DESC;

-- Check all recent boulders and their notification timing
SELECT 
    b.id as boulder_id,
    b.name as boulder_name,
    b.created_at as boulder_created_at,
    COUNT(n.id) as notification_count,
    array_agg(n.id::text) as notification_ids,
    array_agg(n.user_id::text) as user_ids,
    array_agg(n.data->>'boulder_count') as boulder_counts
FROM public.boulders b
LEFT JOIN public.notifications n ON n.data->>'boulder_id' = b.id::text AND n.type = 'boulder_new'
WHERE b.created_at > NOW() - INTERVAL '1 hour'
GROUP BY b.id, b.name, b.created_at
ORDER BY b.created_at DESC
LIMIT 10;

-- Check if multiple boulders were created within 10 seconds
SELECT 
    b1.id as boulder_1_id,
    b1.name as boulder_1_name,
    b1.created_at as boulder_1_created_at,
    b2.id as boulder_2_id,
    b2.name as boulder_2_name,
    b2.created_at as boulder_2_created_at,
    EXTRACT(EPOCH FROM (b2.created_at - b1.created_at)) as seconds_between_boulders
FROM public.boulders b1
JOIN public.boulders b2 ON b1.id < b2.id
WHERE b1.created_at > NOW() - INTERVAL '1 hour'
  AND b2.created_at - b1.created_at < INTERVAL '10 seconds'
ORDER BY b1.created_at DESC
LIMIT 10;

