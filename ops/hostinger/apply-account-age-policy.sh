#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $(id -u) == 0 && $(hostname -s) == srv2044594 ]] || exit 1
python3 - <<'PY'
from pathlib import Path
import datetime,json,secrets,subprocess,time,urllib.request,urllib.error
root=Path('/opt/kws/release-readiness')
runtime=Path('/opt/kws/supabase/runtime')
sql_file=root/'20261012080000_account_minimum_age.sql'
assert sql_file.is_file()
def sql(query):
    r=subprocess.run(['docker','exec','-i','supabase-db','psql','-U','supabase_admin','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],input=query,text=True,capture_output=True)
    if r.returncode: raise RuntimeError('SQL failed; inspect protected deployment log')
    return r.stdout.strip()
before=int(sql('SELECT count(*) FROM auth.users;'))
stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d_%H%M%S')
config_path=runtime/'docker-compose.production.json'
config=json.loads(config_path.read_text())
env=config.setdefault('services',{}).setdefault('auth',{}).setdefault('environment',{})
old_uri=env.get('GOTRUE_HOOK_BEFORE_USER_CREATED_URI')
assert not old_uri or old_uri=='pg-functions://postgres/public/kws_account_signup_eligibility', 'Existing signup hook requires explicit composition'
recipient=subprocess.check_output(['age-keygen','-y','/root/.config/kws-migration/age-key.txt'],text=True).strip()
subprocess.run(['age','-r',recipient,'-o',str(root/('compose-before-age-'+stamp+'.age')),str(config_path)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
sql(sql_file.read_text())
checks=sql("""BEGIN; SET LOCAL ROLE supabase_auth_admin;
SELECT jsonb_build_object(
 'missing_rejected',public.kws_account_signup_eligibility('{}') ? 'error',
 'invalid_rejected',public.kws_account_signup_eligibility('{"user":{"user_metadata":{"birth_date":"2010-02-29"}}}') ? 'error',
 'younger_rejected',public.kws_account_signup_eligibility(jsonb_build_object('user',jsonb_build_object('user_metadata',jsonb_build_object('birth_date',((now() AT TIME ZONE 'Europe/Berlin')::date-interval '16 years'+interval '1 day')::date::text)))) ? 'error',
 'birthday_accepted',NOT(public.kws_account_signup_eligibility(jsonb_build_object('user',jsonb_build_object('user_metadata',jsonb_build_object('birth_date',((now() AT TIME ZONE 'Europe/Berlin')::date-interval '16 years')::date::text)))) ? 'error'));
ROLLBACK;""")
tests=json.loads(checks)
assert all(tests.values()), 'Signup hook calendar tests failed'
assert sql("SELECT NOT has_function_privilege('anon','public.kws_account_signup_eligibility(jsonb)','EXECUTE') AND NOT has_function_privilege('authenticated','public.kws_account_signup_eligibility(jsonb)','EXECUTE');")=='t'
env.update({'GOTRUE_HOOK_BEFORE_USER_CREATED_ENABLED':'true','GOTRUE_HOOK_BEFORE_USER_CREATED_URI':'pg-functions://postgres/public/kws_account_signup_eligibility'})
config_path.write_text(json.dumps(config)+'\n');config_path.chmod(0o600)
compose=['docker','compose','-f','docker-compose.yml','-f','docker-compose.local.yml','-f','docker-compose.production.json']
try:
    with (root/'age-auth-recreate.log').open('w') as log:
        subprocess.run(compose+['up','-d','--no-deps','auth'],cwd=runtime,check=True,stdout=log,stderr=log)
    for _ in range(30):
        state=subprocess.check_output(['docker','inspect','supabase-auth','--format','{{.State.Health.Status}}'],text=True).strip()
        if state=='healthy': break
        time.sleep(1)
    assert state=='healthy', 'Auth health check failed'
    auth_env=json.loads(subprocess.check_output(['docker','inspect','supabase-auth','--format','{{json .Config.Env}}'],text=True))
    assert 'GOTRUE_HOOK_BEFORE_USER_CREATED_ENABLED=true' in auth_env
    runtime_env=dict(line.split('=',1) for line in (runtime/'.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
    # Deliberately ineligible synthetic request: it must create no account or email.
    payload={'email':'kws-age-probe-'+stamp+'@example.invalid','password':secrets.token_urlsafe(24),'data':{'birth_date':(datetime.date.today()-datetime.timedelta(days=365*15)).isoformat()}}
    request=urllib.request.Request('https://beta-api.kletterwelt-sauerland.de/auth/v1/signup',data=json.dumps(payload).encode(),headers={'Content-Type':'application/json','apikey':runtime_env['ANON_KEY']},method='POST')
    try:
        urllib.request.urlopen(request,timeout=15)
        raise AssertionError('Ineligible account unexpectedly accepted')
    except urllib.error.HTTPError as error:
        rejected=json.loads(error.read())
        safe_message=str(rejected.get('message') or rejected.get('msg') or rejected.get('error_description') or '')
        if error.code!=403 or 'ab 16' not in safe_message:
            print(json.dumps({'signup_rejection_status':error.code,'signup_rejection_code':rejected.get('code'),'signup_rejection_message':safe_message}))
            raise AssertionError('Public auth hook rejection not verified')
    after=int(sql('SELECT count(*) FROM auth.users;'))
    assert before==after, 'Account count changed during policy validation'
    proof={'configured_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'minimum_age':16,'sql_tests':tests,'public_signup_underage_rejected':True,'auth_healthy':True,'existing_users_unchanged':True,'user_count':after,'web_release_pending':True}
    (root/'ACCOUNT-AGE-VERIFIED.json').write_text(json.dumps(proof)+'\n')
    print(json.dumps(proof))
except Exception:
    # Restore only this auth config change; keep the harmless restricted SQL hook.
    restore=root/'compose-age-rollback.json'
    subprocess.run(['age','-d','-i','/root/.config/kws-migration/age-key.txt','-o',str(restore),str(root/('compose-before-age-'+stamp+'.age'))],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    config_path.write_bytes(restore.read_bytes());restore.unlink();config_path.chmod(0o600)
    with (root/'age-auth-rollback.log').open('w') as log:
        subprocess.run(compose+['up','-d','--no-deps','auth'],cwd=runtime,check=True,stdout=log,stderr=log)
    raise
PY
