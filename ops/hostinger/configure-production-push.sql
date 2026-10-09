-- Apply only after exact source restore comparison, as an intentional change.
-- The service key is seeded separately into encrypted Vault by protected code.
CREATE OR REPLACE FUNCTION public.trigger_send_push_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $push$
DECLARE
  device_tokens jsonb;
  internal_key text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.notification_preferences
    WHERE user_id = NEW.user_id AND push_enabled IS TRUE
  ) THEN
    RETURN NEW;
  END IF;

  SELECT jsonb_agg(jsonb_build_object('token', token, 'platform', platform))
  INTO device_tokens
  FROM (
    SELECT token, platform FROM public.push_tokens
    WHERE user_id = NEW.user_id AND platform IN ('android', 'ios', 'web')
    ORDER BY token LIMIT 100
  ) devices;
  IF device_tokens IS NULL THEN RETURN NEW; END IF;

  SELECT decrypted_secret INTO STRICT internal_key
  FROM vault.decrypted_secrets WHERE name = 'kws_internal_push_service_key';

  PERFORM net.http_post(
    url := 'http://kws-api-internal:80/functions/v1/send-push-notification',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'Authorization', 'Bearer ' || internal_key),
    body := jsonb_build_object(
      'tokens', device_tokens,
      'payload', jsonb_build_object(
        'title', left(NEW.title, 200),
        'body', left(NEW.message, 3000),
        'data', COALESCE(NEW.data, '{}'::jsonb),
        'action_url', CASE WHEN NEW.action_url ~ '^/[^/]' THEN NEW.action_url ELSE '/' END
      )
    ),
    timeout_milliseconds := 10000
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Neither tokens nor provider errors belong in application logs.
  RAISE WARNING 'KWS push enqueue failed';
  RETURN NEW;
END;
$push$;
REVOKE ALL ON FUNCTION public.trigger_send_push_notification() FROM PUBLIC, anon, authenticated;
