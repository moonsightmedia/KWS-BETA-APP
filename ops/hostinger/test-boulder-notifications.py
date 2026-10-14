"""Exercise the migration in a disposable DB with a local push recorder only."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import socket
import subprocess
import urllib.request
import uuid

FIXTURE = """
CREATE TABLE public.profiles(id uuid PRIMARY KEY);
CREATE TABLE public.sectors(id uuid PRIMARY KEY, name text);
INSERT INTO public.sectors VALUES ('11111111-1111-1111-1111-111111111111','Zwergenwand'),
 ('22222222-2222-2222-2222-222222222222','Bug A');
CREATE TABLE public.boulders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text,
  sector_id uuid, sector_id_2 uuid, status text DEFAULT 'haengt',
  beta_video_status text DEFAULT 'processing', beta_video_job_id uuid DEFAULT gen_random_uuid(),
  updated_at timestamptz DEFAULT clock_timestamp());
CREATE TABLE public.upload_logs(status text, updated_at timestamptz DEFAULT clock_timestamp());
CREATE TABLE public.notification_preferences(user_id uuid REFERENCES public.profiles(id),
  boulder_new boolean, in_app_enabled boolean, push_enabled boolean);
CREATE TABLE public.notifications(id uuid DEFAULT gen_random_uuid(), user_id uuid,
  type text, title text, message text, data jsonb, action_url text, read boolean DEFAULT false);
CREATE TABLE public.recorded_pushes(data jsonb, message text);
CREATE FUNCTION public.record_push() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM public.notification_preferences WHERE user_id=NEW.user_id AND push_enabled) THEN
    INSERT INTO public.recorded_pushes VALUES(NEW.data, NEW.message);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER record_push AFTER INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.record_push();
CREATE FUNCTION public.check_result(ok boolean, name text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %', name; END IF;
RAISE NOTICE 'PASS: %', name; END; $$;
INSERT INTO public.profiles SELECT gen_random_uuid() FROM generate_series(1,4);
INSERT INTO public.notification_preferences
SELECT id, n<>4, n<>3, n<>2 FROM (SELECT id,row_number() OVER() n FROM public.profiles) users;
"""

TESTS = """
CREATE TRIGGER trigger_notify_boulder_video_ready AFTER UPDATE OF beta_video_status ON public.boulders
FOR EACH ROW WHEN (OLD.beta_video_status IS DISTINCT FROM 'ready' AND NEW.beta_video_status='ready'
  AND NEW.beta_video_job_id IS NOT NULL) EXECUTE FUNCTION public.notify_new_boulder();
INSERT INTO public.boulders(name,sector_id,sector_id_2)
SELECT 'Boulder '||n, '11111111-1111-1111-1111-111111111111'::uuid,
 '22222222-2222-2222-2222-222222222222'::uuid FROM generate_series(1,8) n;
UPDATE public.boulders SET beta_video_status='ready';
SELECT public.check_result((SELECT count(*) FROM public.boulder_notification_queue)=8, 'eight callbacks queued');
SELECT public.check_result((SELECT count(*) FROM public.notifications)=0, 'no premature notification');
SELECT public.check_result(public.flush_pending_boulder_notifications()->>'waiting'='quiet_period', 'wait after last callback');
UPDATE public.boulders SET beta_video_status='processing' WHERE name='Boulder 1';
UPDATE public.boulders SET beta_video_status='ready' WHERE name='Boulder 1';
SELECT public.check_result((SELECT count(*) FROM public.boulder_notification_queue)=8, 'duplicate callback deduplicated');
UPDATE public.boulder_notification_queue SET enqueued_at=clock_timestamp()-interval '3 minutes';
INSERT INTO public.boulders(name) VALUES('Still processing');
SELECT public.check_result(public.flush_pending_boulder_notifications()->>'waiting'='active_uploads', 'wait for server processing');
UPDATE public.boulders SET beta_video_status='failed' WHERE name='Still processing';
INSERT INTO public.upload_logs(status) VALUES('compressing');
SELECT public.check_result(public.flush_pending_boulder_notifications()->>'waiting'='active_uploads', 'wait for client compression');
UPDATE public.upload_logs SET updated_at=clock_timestamp()-interval '31 minutes';
SELECT public.check_result(public.flush_pending_boulder_notifications()->>'boulders'='8', 'eight boulders aggregated after activity settles');
SELECT public.check_result((SELECT count(*) FROM public.notifications)=2, 'one notification for each eligible user');
SELECT public.check_result((SELECT count(*) FROM public.recorded_pushes)=1, 'one push for subscribed recipient');
SELECT public.check_result((SELECT bool_and(message='8 neue Boulder wurden hinzugefügt' AND data->>'boulder_count'='8'
 AND jsonb_array_length(data->'boulder_ids')=8 AND jsonb_array_length(data->'sector_ids')=2) FROM public.notifications), 'final count and all sector IDs');
SELECT public.check_result(public.flush_pending_boulder_notifications()->>'notifications'='0', 'worker retry does not resend');
UPDATE public.boulders SET beta_video_status='processing' WHERE name='Boulder 1';
UPDATE public.boulders SET beta_video_status='ready' WHERE name='Boulder 1';
SELECT public.check_result((SELECT count(*) FROM public.boulder_notification_queue WHERE delivered_at IS NULL)=0, 'published boulder does not notify again');
INSERT INTO public.boulders(name) VALUES('Single later');
UPDATE public.boulders SET beta_video_status='ready' WHERE name='Single later';
UPDATE public.boulder_notification_queue SET enqueued_at=clock_timestamp()-interval '3 minutes' WHERE delivered_at IS NULL;
SELECT public.check_result(public.flush_pending_boulder_notifications()->>'boulders'='1', 'later single upload forms new group');
SELECT public.check_result((SELECT count(*) FROM public.notifications WHERE title='Neuer Boulder verfügbar'
 AND data->>'boulder_count'='1' AND data ? 'boulder_id')=2, 'single message remains singular');
INSERT INTO public.boulders(name) VALUES('Hidden before dispatch');
UPDATE public.boulders SET beta_video_status='ready' WHERE name='Hidden before dispatch';
UPDATE public.boulders SET status='entfernt' WHERE name='Hidden before dispatch';
UPDATE public.boulder_notification_queue SET enqueued_at=clock_timestamp()-interval '3 minutes' WHERE delivered_at IS NULL;
SELECT public.check_result(public.flush_pending_boulder_notifications()->>'notifications'='0', 'hidden boulder excluded');
SELECT public.check_result(NOT has_table_privilege('authenticated','public.boulder_notification_queue','SELECT')
 AND NOT has_function_privilege('authenticated','public.flush_pending_boulder_notifications()','EXECUTE')
 AND NOT has_function_privilege('service_role','public.flush_pending_boulder_notifications()','EXECUTE'), 'queue and dispatch not exposed by API');
INSERT INTO public.boulders(name) VALUES('Concurrent 1'),('Concurrent 2');
UPDATE public.boulders SET beta_video_status='ready' WHERE name LIKE 'Concurrent%';
UPDATE public.boulder_notification_queue SET enqueued_at=clock_timestamp()-interval '3 minutes' WHERE delivered_at IS NULL;
"""


def command(database, user='supabase_admin'):
    assert re.fullmatch('kws_push_test_[0-9a-f]{12}', database)
    return ['docker', 'exec', '-i', 'supabase-db', 'psql', '-X', '-U', user, '-d', database,
            '-At', '-v', 'ON_ERROR_STOP=1']


def run(database, query):
    result = subprocess.run(command(database), input=query, capture_output=True, text=True, timeout=30)
    if result.returncode:
        raise RuntimeError(result.stderr[-3000:])  # This DB contains synthetic fixtures only.
    return result.stdout.strip()


SECTOR_TESTS = """
SELECT public.check_result(public.format_boulder_notification_message(1,'Test',ARRAY['Zwergenwand'])
 = 'Ein neuer Boulder im Sektor Zwergenwand · Test', 'single sector text');
SELECT public.check_result(public.format_boulder_notification_message(8,NULL,ARRAY['Zwergenwand','Bug A'])
 = '8 neue Boulder in den Sektoren Bug A und Zwergenwand', 'two sector text');
SELECT public.check_result(public.format_boulder_notification_message(8,NULL,ARRAY['C','A','B'])
 = '8 neue Boulder in den Sektoren A, B und C', 'three sector text');
SELECT public.check_result(public.format_boulder_notification_message(12,NULL,ARRAY['E','D','C','B','A'])
 = '12 neue Boulder in 5 Sektoren: A, B, C und 2 weitere', 'many sector text');
SELECT public.check_result(public.format_boulder_notification_message(8,NULL,ARRAY[' Zwergenwand ','Zwergenwand',''])
 = '8 neue Boulder im Sektor Zwergenwand', 'deduplicate sector labels');
SELECT public.check_result(public.format_boulder_notification_message(8,NULL,NULL)
 = '8 neue Boulder wurden hinzugefügt', 'missing sector fallback');
SELECT public.check_result(char_length(public.format_boulder_notification_message(1,repeat('X',500),
 ARRAY[repeat('A',150),repeat('B',150),repeat('C',150),repeat('D',150)]))<=240, 'long push text bounded');
SELECT public.check_result((SELECT bool_and(data->'sector_names'='["Bug A","Zwergenwand"]'::jsonb)
 FROM public.notifications WHERE data->>'boulder_count'='8'), 'all named sectors in actual grouped payload');
SELECT public.check_result(NOT has_function_privilege('authenticated',
 'public.format_boulder_notification_message(integer,text,text[])','EXECUTE'), 'formatter stays private');
"""


def test(migration, sector_migration=''):
    assert os.geteuid() == 0 and socket.gethostname().split('.')[0] == 'srv2044594'
    database = 'kws_push_test_' + uuid.uuid4().hex[:12]
    subprocess.run(['docker','exec','supabase-db','createdb','-U','supabase_admin','--template=template0',database], check=True)
    try:
        expectations=TESTS
        if sector_migration:
            expectations=TESTS.replace("message='8 neue Boulder wurden hinzugefügt'",
                                      "message='8 neue Boulder in den Sektoren Bug A und Zwergenwand'")
        run(database, FIXTURE + migration + sector_migration + expectations)
        if sector_migration: run(database, SECTOR_TESTS)
        # Two simultaneous workers must produce only one set of notifications.
        workers = [subprocess.Popen(command(database), stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                    stderr=subprocess.PIPE, text=True) for _ in range(2)]
        for worker in workers:
            worker.stdin.write('SELECT public.flush_pending_boulder_notifications();\n')
            worker.stdin.close()
        outputs=[]
        for worker in workers:
            outputs.append(json.loads(worker.stdout.read().strip()))
            diagnostics=worker.stderr.read()
            assert worker.wait(timeout=30)==0, diagnostics
        assert sorted(item['notifications'] for item in outputs)==[0,2]
        assert run(database,'SELECT count(*) FROM public.recorded_pushes;')=='3'
        # A rolled-back dispatch remains pending and can be retried once.
        run(database,"INSERT INTO public.boulders(name) VALUES('Rollback'); UPDATE public.boulders SET beta_video_status='ready' WHERE name='Rollback'; UPDATE public.boulder_notification_queue SET enqueued_at=clock_timestamp()-interval '3 minutes' WHERE delivered_at IS NULL;")
        run(database,'BEGIN; SELECT public.flush_pending_boulder_notifications(); ROLLBACK;')
        assert run(database,'SELECT count(*) FROM public.recorded_pushes;')=='3'
        assert json.loads(run(database,'SELECT public.flush_pending_boulder_notifications();'))['boulders']==1
        assert run(database,'SELECT count(*) FROM public.recorded_pushes;')=='4'
        local_worker=subprocess.run(command(database,'postgres'),input='SELECT public.flush_pending_boulder_notifications();',capture_output=True,text=True,timeout=30)
        assert local_worker.returncode==0 and json.loads(local_worker.stdout.strip())['notifications']==0
        print(json.dumps({'passed':28 if sector_migration else 19,'concurrent_workers_once':True,'rollback_retry_once':True,'local_worker_role':True,'sector_texts':bool(sector_migration),'real_pushes_sent':0}))
    finally:
        subprocess.run(['docker','exec','supabase-db','dropdb','-U','supabase_admin',database], check=True)


if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--migration', required=True)
    parser.add_argument('--sha256', required=True)
    parser.add_argument('--sector-migration')
    parser.add_argument('--sector-sha256')
    args=parser.parse_args()
    raw=Path(args.migration).read_bytes()
    assert hashlib.sha256(raw).hexdigest()==args.sha256
    sectors=b''
    if args.sector_migration:
        sectors=Path(args.sector_migration).read_bytes()
        assert hashlib.sha256(sectors).hexdigest()==args.sector_sha256
    test(raw.decode(), sectors.decode())
