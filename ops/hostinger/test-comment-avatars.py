"""Check photo visibility in a disposable database, never write production."""
import argparse,hashlib,json,os,socket,subprocess,uuid
from pathlib import Path

def main():
    assert os.geteuid()==0 and socket.gethostname().split('.')[0]=='srv2044594'
    p=argparse.ArgumentParser();p.add_argument('--migration',required=True);p.add_argument('--sha256',required=True);a=p.parse_args()
    migration=Path(a.migration).read_bytes();assert hashlib.sha256(migration).hexdigest()==a.sha256
    db='kws_comment_avatar_test_'+uuid.uuid4().hex[:12]
    def sql(text,database=db):
        r=subprocess.run(['docker','exec','-i','supabase-db','psql','-XAt','-U','supabase_admin','-d',database,'-v','ON_ERROR_STOP=1','-1','-f','-'],input=text,capture_output=True,text=True,timeout=45)
        if r.returncode:raise RuntimeError(r.stderr)
        return r.stdout
    visible=sql("SELECT pg_get_functiondef('public.kws_content_visible(text,uuid,uuid)'::regprocedure);",'postgres')+';\n'
    subprocess.run(['docker','exec','supabase-db','createdb','-U','supabase_admin','-T','template0',db],check=True,capture_output=True)
    try:
        sql("""
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE FUNCTION public.has_role(uuid,text) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT coalesce(current_setting('fixture.admin',true),'false')='true' $$;
CREATE TABLE public.profiles(id uuid PRIMARY KEY,avatar_url text,email text);
CREATE TABLE public.boulder_comments(id uuid PRIMARY KEY,boulder_id uuid,user_id uuid,moderation_status text);
CREATE TABLE public.hidden_content(kind text,target_id uuid);
CREATE TABLE public.community_bans(user_id uuid);
CREATE TABLE public.community_blocks(owner_id uuid,blocked_id uuid);
INSERT INTO public.profiles VALUES ('11111111-1111-4111-8111-111111111111','own-photo','private-own@example.invalid'),('22222222-2222-4222-8222-222222222222','peer-photo','private-peer@example.invalid');
INSERT INTO public.boulder_comments VALUES ('44444444-4444-4444-8444-444444444444','33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','pending'),('55555555-5555-4555-8555-555555555555','33333333-3333-4333-8333-333333333333','22222222-2222-4222-8222-222222222222','approved');
"""+visible+migration.decode())
        actor='11111111-1111-4111-8111-111111111111';peer='22222222-2222-4222-8222-222222222222';boulder='33333333-3333-4333-8333-333333333333';passed=0
        def check(expression,expected,prep='',who=actor,admin=False):
            nonlocal passed
            text=prep+";SET request.jwt.claim.sub='"+who+"';SET fixture.admin='"+str(admin).lower()+"';SELECT "+expression+';'
            assert sql(text).strip().splitlines()[-1]==expected,'Photo check '+str(passed+1)
            passed+=1
        call=f"public.get_comment_author_avatars('{boulder}',ARRAY['{actor}','{peer}']::uuid[])";count=f'(SELECT count(*) FROM {call})'
        check(count,'2');check(count,'0',who='')
        check(count,'1',f"UPDATE public.boulder_comments SET moderation_status='pending' WHERE user_id='{peer}'")
        check(count,'1',f"UPDATE public.boulder_comments SET moderation_status='rejected' WHERE user_id='{peer}'")
        check(count,'2',admin=True)
        check(f"(SELECT count(*) FROM public.get_comment_author_avatars('99999999-9999-4999-8999-999999999999',ARRAY['{peer}']::uuid[]))",'0')
        check(f"(SELECT count(*) FROM public.get_comment_author_avatars('{boulder}',ARRAY['99999999-9999-4999-8999-999999999999']::uuid[]))",'0')
        check(count,'1',f"UPDATE public.boulder_comments SET moderation_status='approved';INSERT INTO public.community_blocks VALUES ('{actor}','{peer}')")
        check(count,'1',f"DELETE FROM public.community_blocks;INSERT INTO public.community_bans VALUES ('{peer}')")
        check(f"(SELECT count(*) FROM {call} WHERE id='{peer}' AND avatar_url IS NULL)",'1',admin=True)
        check(count,'1',"DELETE FROM public.community_bans;INSERT INTO public.hidden_content VALUES ('comment','55555555-5555-4555-8555-555555555555')")
        check(count,'0',f"DELETE FROM public.hidden_content;INSERT INTO public.hidden_content VALUES ('boulder','{boulder}')")
        check(f"(SELECT count(*) FROM {call} WHERE id='{peer}' AND avatar_url IS NULL)",'1',f"DELETE FROM public.hidden_content;INSERT INTO public.hidden_content VALUES ('profile','{peer}')")
        check(f"(SELECT count(*) FROM public.get_comment_author_avatars('{boulder}',ARRAY['{peer}','{peer}']::uuid[]))",'1')
        check(f"(SELECT count(*) FROM public.get_comment_author_avatars('{boulder}',array_fill('99999999-9999-4999-8999-999999999999'::uuid,ARRAY[100])||ARRAY['{peer}']::uuid[]))",'0')
        for role,result in [('anon','f'),('authenticated','t'),('service_role','f')]:check(f"has_function_privilege('{role}','public.get_comment_author_avatars(uuid,uuid[])','EXECUTE')",result)
        check("pg_get_function_result('public.get_comment_author_avatars(uuid,uuid[])'::regprocedure)",'TABLE(id uuid, avatar_url text)')
        print(json.dumps({'passed':passed,'visible_comments_only':True,'no_private_profile_fields':True,'production_writes':0}))
    finally:subprocess.run(['docker','exec','supabase-db','dropdb','-U','supabase_admin',db],check=True,capture_output=True)

if __name__=='__main__':main()
