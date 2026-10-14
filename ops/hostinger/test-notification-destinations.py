"""Exercise the real push trigger in a disposable DB; no real FCM requests."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import socket
import subprocess
import uuid

FIXTURE = """
CREATE SCHEMA vault;
CREATE SCHEMA net;
CREATE TABLE vault.decrypted_secrets(name text, decrypted_secret text);
INSERT INTO vault.decrypted_secrets VALUES ('kws_internal_push_service_key','isolated-test-value');
CREATE TABLE public.notification_preferences(user_id uuid, push_enabled boolean);
CREATE TABLE public.push_tokens(user_id uuid, token text, platform text);
CREATE TABLE public.notifications(id uuid DEFAULT gen_random_uuid(), user_id uuid, type text,
  title text, message text, data jsonb, action_url text);
CREATE TABLE public.recorded_requests(body jsonb);
CREATE FUNCTION net.http_post(url text, headers jsonb, body jsonb, timeout_milliseconds integer)
RETURNS bigint LANGUAGE plpgsql AS $$ BEGIN
  INSERT INTO public.recorded_requests VALUES(body); RETURN 1;
END; $$;
CREATE FUNCTION public.check_result(ok boolean, name text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %', name; END IF;
RAISE NOTICE 'PASS: %', name; END; $$;
"""

TESTS = """
CREATE TRIGGER test_push AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.trigger_send_push_notification();
INSERT INTO public.notification_preferences VALUES ('11111111-1111-1111-1111-111111111111',false);
INSERT INTO public.notifications(user_id,type,title,message,data,action_url)
VALUES ('11111111-1111-1111-1111-111111111111','boulder_new','New','New','{}','/boulders');
SELECT public.check_result((SELECT count(*) FROM public.recorded_requests)=0,'disabled preferences stay disabled');
UPDATE public.notification_preferences SET push_enabled=true;
INSERT INTO public.notifications(user_id,type,title,message,data,action_url)
VALUES ('11111111-1111-1111-1111-111111111111','boulder_new','New','New','{}','/boulders');
SELECT public.check_result((SELECT count(*) FROM public.recorded_requests)=0,'no device means no push');
INSERT INTO public.push_tokens VALUES('11111111-1111-1111-1111-111111111111','isolated-device','android');
INSERT INTO public.notifications(id,user_id,type,title,message,data,action_url)
VALUES ('22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111',
 'boulder_new','800 neue Boulder','Neue Boulder in Bug und Grotte',
 jsonb_build_object('boulder_count',800,'boulder_ids',(SELECT jsonb_agg(gen_random_uuid()) FROM generate_series(1,800))),'/boulders');
SELECT public.check_result((SELECT count(*) FROM public.recorded_requests)=1,'one batch stays one push');
SELECT public.check_result((SELECT body->'payload'->>'action_url' FROM public.recorded_requests)=
 '/boulders?notification=22222222-2222-2222-2222-222222222222','exact short batch destination');
SELECT public.check_result((SELECT body->'payload'->'data'->>'notification_id' FROM public.recorded_requests)=
 '22222222-2222-2222-2222-222222222222','owner record reference included');
SELECT public.check_result((SELECT body->'payload'->'data'->>'notification_type' FROM public.recorded_requests)=
 'boulder_new','push topic included');
SELECT public.check_result((SELECT octet_length((body->'payload')::text) FROM public.recorded_requests)<1024,
 '800 IDs cannot overflow the bounded push');
SELECT public.check_result((SELECT jsonb_array_length(data->'boulder_ids') FROM public.notifications
 WHERE id='22222222-2222-2222-2222-222222222222')=800,'complete selection stays in inbox record');
INSERT INTO public.notifications(user_id,type,title,message,data,action_url)
VALUES ('11111111-1111-1111-1111-111111111111','feedback_reply','Reply','Reply','{"feedback_id":"kept"}','/profile');
SELECT public.check_result(EXISTS(SELECT 1 FROM public.recorded_requests WHERE body->'payload'->>'action_url'='/profile'
 AND body->'payload'->'data'->>'feedback_id'='kept'),'other notification destinations and data preserved');
SELECT public.check_result(NOT has_function_privilege('authenticated','public.trigger_send_push_notification()','EXECUTE')
 AND NOT has_function_privilege('anon','public.trigger_send_push_notification()','EXECUTE'),'private function permissions preserved');
"""


def main(path, expected):
    assert os.geteuid() == 0 and socket.gethostname().split('.')[0] == 'srv2044594'
    raw = path.read_bytes()
    assert hashlib.sha256(raw).hexdigest() == expected
    database = 'kws_notification_link_test_' + uuid.uuid4().hex[:12]
    subprocess.run(['docker', 'exec', 'supabase-db', 'createdb', '-U', 'supabase_admin', '--template=template0', database], check=True)
    try:
        result = subprocess.run(['docker', 'exec', '-i', 'supabase-db', 'psql', '-XAt', '-U', 'supabase_admin',
                                 '-d', database, '-v', 'ON_ERROR_STOP=1', '-1', '-f', '-'],
                                input=FIXTURE + raw.decode() + TESTS, text=True, capture_output=True, timeout=60)
        if result.returncode:
            raise RuntimeError(result.stderr)
        assert result.stderr.count('PASS:') == 10
        print(json.dumps({'passed': 10, 'isolated_database': True, 'real_pushes_sent': 0,
                          'large_batch_bounded': True, 'complete_inbox_selection_preserved': True}))
    finally:
        subprocess.run(['docker', 'exec', 'supabase-db', 'dropdb', '-U', 'supabase_admin', database], check=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--migration', required=True)
    parser.add_argument('--sha256', required=True)
    args = parser.parse_args()
    main(Path(args.migration), args.sha256)
