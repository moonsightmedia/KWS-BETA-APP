-- Analyze failed video uploads
-- Run this in Supabase SQL Editor to see detailed error information

-- 1. Get all failed video uploads from the last 24 hours
SELECT 
  id,
  upload_session_id,
  file_name,
  file_size,
  status,
  progress,
  error_message,
  error_details->>'message' as detailed_error,
  error_details->>'statusCode' as http_status,
  error_details->>'networkError' as is_network_error,
  error_details->>'timeout' as is_timeout,
  retry_count,
  device_info->>'isMobile' as is_mobile,
  device_info->>'isIOS' as is_ios,
  device_info->>'isAndroid' as is_android,
  network_info->>'onLine' as was_online,
  network_info->>'effectiveType' as connection_type,
  started_at,
  completed_at,
  created_at
FROM upload_logs
WHERE 
  file_type = 'video'
  AND status = 'failed'
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- 2. Count errors by type
SELECT 
  CASE 
    WHEN error_message LIKE '%Network%' OR error_message LIKE '%network%' OR error_message LIKE '%fetch%' THEN 'Network Error'
    WHEN error_message LIKE '%timeout%' OR error_message LIKE '%Timeout%' THEN 'Timeout'
    WHEN error_message LIKE '%Failed to parse%' THEN 'Parse Error'
    WHEN error_message LIKE '%Upload failed%' THEN 'Server Error'
    WHEN error_message LIKE '%CDN-Upload fehlgeschlagen%' THEN 'CDN Error'
    ELSE 'Other Error'
  END as error_type,
  COUNT(*) as count,
  STRING_AGG(DISTINCT error_message, ' | ') as sample_errors
FROM upload_logs
WHERE 
  file_type = 'video'
  AND status = 'failed'
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY error_type
ORDER BY count DESC;

-- 3. Check for common patterns
SELECT 
  'Total Failed' as metric,
  COUNT(*) as count
FROM upload_logs
WHERE 
  file_type = 'video'
  AND status = 'failed'
  AND created_at >= NOW() - INTERVAL '24 hours'

UNION ALL

SELECT 
  'Network Errors' as metric,
  COUNT(*) as count
FROM upload_logs
WHERE 
  file_type = 'video'
  AND status = 'failed'
  AND created_at >= NOW() - INTERVAL '24 hours'
  AND (
    error_message LIKE '%Network%' 
    OR error_message LIKE '%network%' 
    OR error_message LIKE '%fetch%'
    OR (error_details->>'networkError')::boolean = true
  )

UNION ALL

SELECT 
  'Timeouts' as metric,
  COUNT(*) as count
FROM upload_logs
WHERE 
  file_type = 'video'
  AND status = 'failed'
  AND created_at >= NOW() - INTERVAL '24 hours'
  AND (
    error_message LIKE '%timeout%' 
    OR error_message LIKE '%Timeout%'
    OR (error_details->>'timeout')::boolean = true
  )

UNION ALL

SELECT 
  'Parse Errors' as metric,
  COUNT(*) as count
FROM upload_logs
WHERE 
  file_type = 'video'
  AND status = 'failed'
  AND created_at >= NOW() - INTERVAL '24 hours'
  AND error_message LIKE '%Failed to parse%'

UNION ALL

SELECT 
  'Server Errors (4xx/5xx)' as metric,
  COUNT(*) as count
FROM upload_logs
WHERE 
  file_type = 'video'
  AND status = 'failed'
  AND created_at >= NOW() - INTERVAL '24 hours'
  AND error_details->>'statusCode' IS NOT NULL;

-- 4. Check device/browser distribution of failures
SELECT 
  device_info->>'isMobile' as is_mobile,
  device_info->>'isIOS' as is_ios,
  device_info->>'isAndroid' as is_android,
  device_info->>'isChrome' as is_chrome,
  device_info->>'isSafari' as is_safari,
  COUNT(*) as failure_count
FROM upload_logs
WHERE 
  file_type = 'video'
  AND status = 'failed'
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY 
  device_info->>'isMobile',
  device_info->>'isIOS',
  device_info->>'isAndroid',
  device_info->>'isChrome',
  device_info->>'isSafari'
ORDER BY failure_count DESC;

-- 5. Check file size distribution of failed uploads
SELECT 
  CASE 
    WHEN file_size < 10 * 1024 * 1024 THEN '< 10MB'
    WHEN file_size < 20 * 1024 * 1024 THEN '10-20MB'
    WHEN file_size < 50 * 1024 * 1024 THEN '20-50MB'
    WHEN file_size < 100 * 1024 * 1024 THEN '50-100MB'
    ELSE '> 100MB'
  END as size_range,
  COUNT(*) as failure_count,
  AVG(file_size / 1024.0 / 1024.0) as avg_size_mb
FROM upload_logs
WHERE 
  file_type = 'video'
  AND status = 'failed'
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY size_range
ORDER BY failure_count DESC;


