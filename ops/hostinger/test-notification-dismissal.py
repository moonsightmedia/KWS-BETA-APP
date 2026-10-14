"""Exercise reversible inbox updates in a disposable database, never production."""
import argparse, hashlib, json, os, socket, subprocess, uuid
from pathlib import Path

def main():
    assert os.geteuid() == 0 and socket.gethostname().split('.')[0] == 'srv2044594'
    parser = argparse.ArgumentParser()
    parser.add_argument('--migration', required=True)
    parser.add_argument('--sha256', required=True)
    args = parser.parse_args()
    migration = Path(args.migration).read_bytes()
    assert hashlib.sha256(migration).hexdigest() == args.sha256
    db = 'kws_dismissal_test_' + uuid.uuid4().hex[:12]
    def sql(text, database=db):
        result = subprocess.run(['docker', 'exec', '-i', 'supabase-db', 'psql', '-XAt', '-U', 'supabase_admin', '-d', database, '-v', 'ON_ERROR_STOP=1', '-1', '-f', '-'], input=text, capture_output=True, text=True, timeout=45)
        if result.returncode: raise RuntimeError(result.stderr)
        return result.stdout
    subprocess.run(['docker','exec','supabase-db','createdb','-U','supabase_admin','-T','template0',db],check=True,capture_output=True)
    try:
        sql("""
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth TO authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
CREATE TABLE public.notifications(id text PRIMARY KEY,user_id uuid,read boolean DEFAULT false,read_at timestamptz,created_at timestamptz DEFAULT now(),message text,data jsonb);
INSERT INTO public.notifications(id,user_id,message,data) VALUES ('own','11111111-1111-4111-8111-111111111111','Original','{"boulder_ids":["kept"]}'),('foreign','22222222-2222-4222-8222-222222222222','Foreign','{}');
CREATE TABLE public.push_calls(id text);
CREATE FUNCTION public.record_push() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN INSERT INTO public.push_calls VALUES(NEW.id); RETURN NEW; END $$;
CREATE TRIGGER push_insert AFTER INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.record_push();
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_read ON public.notifications FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY owner_update ON public.notifications FOR UPDATE TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
GRANT USAGE ON SCHEMA public TO authenticated; GRANT SELECT,UPDATE ON public.notifications TO authenticated;
""" + migration.decode() + migration.decode())
        sql("""
SET ROLE authenticated;
SET request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
DO $$ BEGIN
 IF (SELECT count(*) FROM public.notifications WHERE dismissed_at IS NULL)<>1 THEN RAISE EXCEPTION 'Owner visibility/default'; END IF;
 UPDATE public.notifications SET dismissed_at=now() WHERE id='own';
 IF (SELECT count(*) FROM public.notifications WHERE read=false AND dismissed_at IS NULL)<>0 THEN RAISE EXCEPTION 'Hidden counter'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.notifications WHERE id='own' AND NOT read AND read_at IS NULL AND message='Original' AND data='{"boulder_ids":["kept"]}') THEN RAISE EXCEPTION 'Other fields changed'; END IF;
 UPDATE public.notifications SET dismissed_at=NULL WHERE id='own';
 IF (SELECT count(*) FROM public.notifications WHERE read=false AND dismissed_at IS NULL)<>1 THEN RAISE EXCEPTION 'Undo'; END IF;
 UPDATE public.notifications SET read=true,read_at=now() WHERE id='own';
 IF NOT EXISTS(SELECT 1 FROM public.notifications WHERE id='own' AND read AND read_at IS NOT NULL) THEN RAISE EXCEPTION 'Read'; END IF;
 UPDATE public.notifications SET read=false,read_at=NULL WHERE id='own';
 IF NOT EXISTS(SELECT 1 FROM public.notifications WHERE id='own' AND NOT read AND read_at IS NULL) THEN RAISE EXCEPTION 'Unread'; END IF;
 UPDATE public.notifications SET dismissed_at=now() WHERE id='foreign';
 IF FOUND THEN RAISE EXCEPTION 'Foreign owner update'; END IF;
 BEGIN
  UPDATE public.notifications SET user_id='22222222-2222-4222-8222-222222222222' WHERE id='own';
  RAISE EXCEPTION 'Owner transfer unexpectedly allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.push_calls) THEN RAISE EXCEPTION 'Update sent push'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.notifications WHERE id='foreign' AND dismissed_at IS NULL AND NOT read) THEN RAISE EXCEPTION 'Foreign record changed'; END IF;
END $$;
""")
        print(json.dumps({'passed':10,'owner_rls':True,'undo_preserves_read_and_data':True,'real_pushes_sent':0}))
    finally:
        subprocess.run(['docker','exec','supabase-db','dropdb','-U','supabase_admin',db],check=True,capture_output=True)

if __name__ == '__main__': main()
