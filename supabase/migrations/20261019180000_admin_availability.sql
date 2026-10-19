BEGIN;

CREATE SCHEMA IF NOT EXISTS kws_monitoring_private;
REVOKE ALL ON SCHEMA kws_monitoring_private FROM PUBLIC,anon,authenticated;
CREATE TABLE kws_monitoring_private.availability_key (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  signing_key bytea NOT NULL CHECK (octet_length(signing_key)=32)
);
CREATE TABLE kws_monitoring_private.availability_snapshot (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  observed_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  snapshot jsonb NOT NULL
);
ALTER TABLE kws_monitoring_private.availability_key ENABLE ROW LEVEL SECURITY;
ALTER TABLE kws_monitoring_private.availability_snapshot ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA kws_monitoring_private FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.kws_publish_availability(p_snapshot text,p_signature text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE signing_key bytea; payload jsonb; observed timestamptz; component jsonb; entry jsonb; changed integer;
BEGIN
  IF p_snapshot IS NULL OR octet_length(p_snapshot)>32768 OR p_signature IS NULL OR p_signature !~ '^[a-f0-9]{64}$' THEN
    RETURN jsonb_build_object('accepted',false);
  END IF;
  SELECT key.signing_key INTO signing_key FROM kws_monitoring_private.availability_key key WHERE singleton;
  IF signing_key IS NULL OR extensions.digest(decode(p_signature,'hex'),'sha256') <> extensions.digest(extensions.hmac(convert_to(p_snapshot,'UTF8'),signing_key,'sha256'),'sha256') THEN
    RETURN jsonb_build_object('accepted',false);
  END IF;
  payload := p_snapshot::jsonb;
  IF jsonb_typeof(payload)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(payload))<>4
    OR NOT payload ?& ARRAY['schema_version','generated_at','services','incidents']
    OR payload->>'schema_version'<>'1' OR jsonb_typeof(payload->'services')<>'array' OR jsonb_array_length(payload->'services')<>3
    OR jsonb_typeof(payload->'incidents')<>'array' OR jsonb_array_length(payload->'incidents')>12 THEN RAISE EXCEPTION 'Invalid snapshot'; END IF;
  observed := (payload->>'generated_at')::timestamptz;
  IF observed IS NULL OR observed < statement_timestamp()-interval '3 minutes' OR observed > statement_timestamp()+interval '30 seconds' THEN RAISE EXCEPTION 'Invalid snapshot time'; END IF;
  IF (SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(payload->'services'))<>3 THEN RAISE EXCEPTION 'Invalid services'; END IF;
  FOR component IN SELECT value FROM jsonb_array_elements(payload->'services') LOOP
    IF jsonb_typeof(component)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(component))<>5
      OR component->>'id' NOT IN ('app','api','video') OR component->>'state' NOT IN ('operational','outage','checking','unknown')
      OR component->>'alert_mode' NOT IN ('live','shadow','silent')
      OR NOT component ?& ARRAY['id','state','checked_at','latency_ms','alert_mode']
      OR (component->>'checked_at')::timestamptz>observed+interval '30 seconds'
      OR (component->>'latency_ms' IS NOT NULL AND (jsonb_typeof(component->'latency_ms')<>'number' OR component->>'latency_ms' !~ '^\d{1,6}$' OR (component->>'latency_ms')::integer>300000)) THEN RAISE EXCEPTION 'Invalid service'; END IF;
    IF component->>'id' IS NULL OR component->>'state' IS NULL OR component->>'alert_mode' IS NULL THEN RAISE EXCEPTION 'Missing service'; END IF;
  END LOOP;
  FOR entry IN SELECT value FROM jsonb_array_elements(payload->'incidents') LOOP
    IF jsonb_typeof(entry)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(entry))<>5
      OR NOT entry ?& ARRAY['service','state','started_at','ended_at','cause']
      OR entry->>'service' NOT IN ('app','api','video') OR entry->>'state' NOT IN ('open','resolved')
      OR entry->>'cause' NOT IN ('http_status','redirect','timeout','dns','tls','connection','destination_policy','other')
      OR entry->>'service' IS NULL OR entry->>'state' IS NULL OR entry->>'cause' IS NULL
      OR entry->>'started_at' IS NULL OR (entry->>'started_at')::timestamptz>observed
      OR (entry->>'ended_at')::timestamptz>observed
      OR (entry->>'ended_at')::timestamptz<(entry->>'started_at')::timestamptz
      OR ((entry->>'state'='resolved') <> (entry->>'ended_at' IS NOT NULL)) THEN RAISE EXCEPTION 'Invalid incident'; END IF;
  END LOOP;
  INSERT INTO kws_monitoring_private.availability_snapshot(singleton,observed_at,snapshot) VALUES(true,observed,payload)
  ON CONFLICT(singleton) DO UPDATE SET observed_at=excluded.observed_at,received_at=statement_timestamp(),snapshot=excluded.snapshot
  WHERE availability_snapshot.observed_at<excluded.observed_at;
  GET DIAGNOSTICS changed=ROW_COUNT;
  RETURN jsonb_build_object('accepted',true,'updated',changed=1);
EXCEPTION WHEN invalid_text_representation OR invalid_datetime_format OR datetime_field_overflow OR raise_exception OR numeric_value_out_of_range THEN
  RETURN jsonb_build_object('accepted',false);
END;
$$;

CREATE FUNCTION public.kws_admin_availability()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE payload jsonb; observed timestamptz;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin'::text) OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=auth.uid()) THEN RAISE EXCEPTION 'Administrator required' USING ERRCODE='42501'; END IF;
  SELECT snapshot,observed_at INTO payload,observed FROM kws_monitoring_private.availability_snapshot WHERE singleton;
  RETURN jsonb_build_object('schema_version',1,'server_time',statement_timestamp(),'state',CASE WHEN payload IS NULL THEN 'unconfigured' WHEN observed<statement_timestamp()-interval '3 minutes' THEN 'stale' ELSE 'ready' END,'snapshot',payload);
END;
$$;
REVOKE ALL ON FUNCTION public.kws_publish_availability(text,text),public.kws_admin_availability() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.kws_publish_availability(text,text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.kws_admin_availability() TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
