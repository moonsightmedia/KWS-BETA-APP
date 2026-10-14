"""Verify sector-label parity and historical updates without real pushes."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import socket
import subprocess
import uuid

FIXTURE = """
CREATE TABLE public.sector_areas(id uuid PRIMARY KEY, name text, slug text);
CREATE TABLE public.sectors(id uuid PRIMARY KEY, name text, area_id uuid, subarea_code text);
INSERT INTO public.sector_areas VALUES('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','Bug','bug');
INSERT INTO public.sectors VALUES
 ('11111111-1111-1111-1111-111111111111','Buckbord','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','D'),
 ('22222222-2222-2222-2222-222222222222','Bug','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','C'),
 ('33333333-3333-3333-3333-333333333333','Felsenmeer','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','A');
CREATE TABLE public.profiles(id uuid PRIMARY KEY);
INSERT INTO public.profiles VALUES('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
CREATE TABLE public.notification_preferences(user_id uuid, boulder_new boolean, in_app_enabled boolean);
INSERT INTO public.notification_preferences VALUES('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',true,true);
CREATE TABLE public.boulders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text,
 sector_id uuid,sector_id_2 uuid,status text DEFAULT 'haengt',beta_video_status text DEFAULT 'ready',
 updated_at timestamptz DEFAULT clock_timestamp()-interval '4 minutes');
CREATE TABLE public.boulder_notification_queue(boulder_id uuid PRIMARY KEY,enqueued_at timestamptz,delivered_at timestamptz);
CREATE TABLE public.upload_logs(status text,updated_at timestamptz);
CREATE TABLE public.notifications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,type text,
 title text,message text,data jsonb,action_url text,read boolean DEFAULT false,
 read_at timestamptz,created_at timestamptz DEFAULT '2026-10-14T08:00:00Z');
INSERT INTO public.notifications(id,type,message,data,action_url,read,read_at) VALUES
 ('10000000-0000-0000-0000-000000000001','boulder_new','8 neue Boulder in den Sektoren Buckbord und Bug',
 '{"boulder_count":8,"boulder_ids":["kept-id"],"sector_ids":["11111111-1111-1111-1111-111111111111","22222222-2222-2222-2222-222222222222"],"sector_names":["Buckbord","Bug"]}',
 '/boulders?notification=kept',true,'2026-10-14T09:00:00Z'),
 ('10000000-0000-0000-0000-000000000002','boulder_new','Ein neuer Boulder im Sektor Felsenmeer · Originalname',
 '{"boulder_id":"removed","sector_id":"33333333-3333-3333-3333-333333333333"}', '/boulders',false,null),
 ('10000000-0000-0000-0000-000000000003','feedback_reply','Buckbord stays in user feedback','{}','/profile',false,null),
 ('10000000-0000-0000-0000-000000000004','boulder_new','Unknown metadata stays unchanged','{"sector_ids":null,"boulder_ids":"bad"}','/boulders',false,null);
CREATE TABLE public.recorded_pushes(data jsonb);
CREATE FUNCTION public.trigger_send_push_notification() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN INSERT INTO public.recorded_pushes VALUES(NEW.data); RETURN NEW; END $$;
CREATE TRIGGER fixture_push AFTER INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.trigger_send_push_notification();
CREATE TABLE public.recorded_updates(id uuid);
CREATE FUNCTION public.record_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN INSERT INTO public.recorded_updates VALUES(NEW.id); RETURN NEW; END $$;
CREATE TRIGGER fixture_update AFTER UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.record_update();
"""


def main(directory, migration_sha, cases_sha):
    assert os.geteuid() == 0 and socket.gethostname().split('.')[0] == 'srv2044594'
    migration = (directory / 'migration.sql').read_bytes()
    cases_raw = (directory / 'cases.json').read_bytes()
    assert hashlib.sha256(migration).hexdigest() == migration_sha
    assert hashlib.sha256(cases_raw).hexdigest() == cases_sha
    cases = json.loads(cases_raw)
    database = 'kws_sector_name_test_' + uuid.uuid4().hex[:12]

    def sql(text, db=database):
        result = subprocess.run(['docker','exec','-i','supabase-db','psql','-XAt','-U','supabase_admin',
                                 '-d',db,'-v','ON_ERROR_STOP=1','-1','-f','-'], input=text,
                                check=True, capture_output=True, text=True, timeout=60)
        return result.stdout.strip()

    definitions = sql("SELECT pg_get_functiondef('public.format_boulder_notification_message(integer,text,text[])'::regprocedure);", 'postgres')
    definitions += ';\n' + sql("SELECT pg_get_functiondef('public.flush_pending_boulder_notifications()'::regprocedure);", 'postgres') + ';\n'
    subprocess.run(['docker','exec','supabase-db','createdb','-U','supabase_admin','--template=template0',database],check=True)
    checks = 0
    try:
        sql(FIXTURE + definitions + '\n' + migration.decode())
        literal = lambda value: 'NULL' if value is None else "'" + str(value).replace("'", "''") + "'"
        for case in cases:
            source = case['source']
            area = source.get('area') or {}
            args = [source['name'],area.get('name'),area.get('slug'),source.get('subarea_code')]
            actual = sql('SELECT public.boulder_notification_sector_label(' + ','.join(map(literal,args)) + ');')
            assert actual == case['expected'], (source,actual,case['expected'])
            checks += 1
        expectations = [
            ("SELECT message FROM public.notifications WHERE id='10000000-0000-0000-0000-000000000001'", '8 neue Boulder in den Sektoren Bug C und Bug D'),
            ("SELECT data->'sector_names' FROM public.notifications WHERE id='10000000-0000-0000-0000-000000000001'", '["Bug C", "Bug D"]'),
            ("SELECT read AND read_at='2026-10-14T09:00:00Z' AND created_at='2026-10-14T08:00:00Z' AND action_url='/boulders?notification=kept' AND data->'boulder_ids'='[\"kept-id\"]'::jsonb FROM public.notifications WHERE id='10000000-0000-0000-0000-000000000001'", 't'),
            ("SELECT message FROM public.notifications WHERE id='10000000-0000-0000-0000-000000000002'", 'Ein neuer Boulder im Sektor Kurze Platte · Originalname'),
            ("SELECT message FROM public.notifications WHERE type='feedback_reply'", 'Buckbord stays in user feedback'),
            ("SELECT message FROM public.notifications WHERE id='10000000-0000-0000-0000-000000000004'", 'Unknown metadata stays unchanged'),
            ('SELECT count(*) FROM public.recorded_pushes', '0'),
            ('SELECT count(*) FROM public.recorded_updates', '2'),
            ("SELECT has_function_privilege('authenticated','public.boulder_notification_sector_names(jsonb)','EXECUTE')", 'f'),
        ]
        for query, expected in expectations:
            assert sql(query) == expected, query
            checks += 1
        sql(migration.decode())
        assert sql('SELECT count(*) FROM public.recorded_updates') == '2'
        checks += 1
        sql("INSERT INTO public.boulders(name,sector_id,sector_id_2) VALUES ('Future','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222'); INSERT INTO public.boulder_notification_queue SELECT id,clock_timestamp()-interval '4 minutes',NULL FROM public.boulders;")
        assert json.loads(sql('SELECT public.flush_pending_boulder_notifications();'))['notifications'] == 1
        assert sql("SELECT message FROM public.notifications WHERE title='Neuer Boulder verfügbar'") == 'Ein neuer Boulder in den Sektoren Bug C und Bug D · Future'
        assert sql('SELECT count(*) FROM public.recorded_pushes') == '1'
        assert json.loads(sql('SELECT public.flush_pending_boulder_notifications();'))['notifications'] == 0
        checks += 4
        print(json.dumps({'passed':checks,'app_resolver_parity_cases':len(cases),'historical_updates_without_push':True,
                          'future_batch_uses_public_labels':True,'repeat_migration_no_writes':True,'real_pushes_sent':0}))
    finally:
        subprocess.run(['docker','exec','supabase-db','dropdb','-U','supabase_admin',database],check=True)


if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--directory',required=True)
    parser.add_argument('--migration-sha',required=True)
    parser.add_argument('--cases-sha',required=True)
    args=parser.parse_args()
    main(Path(args.directory),args.migration_sha,args.cases_sha)
