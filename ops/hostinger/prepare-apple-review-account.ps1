$ErrorActionPreference='Stop'
$taskWrapper=Join-Path $env:LOCALAPPDATA 'JanoschAI\Bitwarden\Invoke-BwsDevice.ps1'
$taskReference='KWS_APPLE_REVIEW_ACCOUNT'
$taskProject='ce3eaee7-9c07-4218-b506-b49300dd383e'
$taskExistingRaw=& $taskWrapper -DeviceName codex-laptop secret list --output json
if($LASTEXITCODE -ne 0){throw 'Protected store unavailable'}
$taskExisting=@($taskExistingRaw|ConvertFrom-Json|Where-Object{$_.key -eq $taskReference})
if($taskExisting.Count -gt 1){throw 'Ambiguous review credential reference'}
if($taskExisting.Count -eq 1){
 $taskRaw=& $taskWrapper -DeviceName codex-laptop secret get $taskExisting[0].id --output json
 if($LASTEXITCODE -ne 0){throw 'Review credential unavailable'}
 $taskSecret=$taskRaw|ConvertFrom-Json
 $taskCredential=$taskSecret.value|ConvertFrom-Json
}else{
 $taskPassword=[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).Replace('+','-').Replace('/','_').TrimEnd('=')
 $taskCredential=@{email='apple-review@kletterwelt-sauerland.de';password=$taskPassword;purpose='Apple App Review only; ordinary user, synthetic profile; no mailbox provisioned'}
 $taskValue=$taskCredential|ConvertTo-Json -Compress
 # Capture the CLI response; never emit a credential or include it in a script/log.
 $taskRaw=& $taskWrapper -DeviceName codex-laptop secret create $taskReference $taskValue $taskProject --note 'Dedicated review account. No staff/admin role. Store submission requires separate consent to transmit credentials to Apple.' --output json
 if($LASTEXITCODE -ne 0){throw 'Review credential could not be stored securely'}
 $taskSecret=$taskRaw|ConvertFrom-Json
 if($taskSecret.value -ne $taskValue){throw 'Protected credential verification failed'}
}
$taskCode=@'
import sys,json,pathlib,urllib.request,urllib.parse,subprocess,socket
assert socket.gethostname().split('.')[0]=='srv2044594'
payload=json.load(sys.stdin)
assert payload['email']=='apple-review@kletterwelt-sauerland.de' and len(payload['password'])>=32
env=dict(line.split('=',1) for line in pathlib.Path('/opt/kws/supabase/runtime/.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
def api(path,data,key):
 req=urllib.request.Request('http://127.0.0.1:9090'+path,data=json.dumps(data).encode(),headers={'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json'},method='POST')
 with urllib.request.urlopen(req,timeout=30) as response:return json.load(response)
try:
 email=payload['email']; existing=subprocess.check_output(['docker','exec','supabase-db','psql','-X','-U','supabase_admin','-d','postgres','-Atqc',"SELECT count(*) FROM auth.users WHERE email='apple-review@kletterwelt-sauerland.de'"],text=True).strip()
 if existing=='0':api('/auth/v1/admin/users',{'email':email,'password':payload['password'],'email_confirm':True,'user_metadata':{'first_name':'Apple','last_name':'App Review','full_name':'Apple App Review','birth_date':'1990-01-01'}},env['SERVICE_ROLE_KEY'])
 token=api('/auth/v1/token?grant_type=password',{'email':email,'password':payload['password']},env['ANON_KEY'])
 assert token.get('access_token') and token['user']['email']==email
 user=token['user']['id']
 roles=subprocess.check_output(['docker','exec','supabase-db','psql','-X','-U','supabase_admin','-d','postgres','-Atqc',"SELECT coalesce(json_agg(role),'[]') FROM public.user_roles WHERE user_id='"+user+"'"],text=True).strip()
 assert set(json.loads(roles))<=set(['user'])
 print(json.dumps({'review_login_verified':True,'account_id':user,'ordinary_user_only':True,'no_email_sent':True}))
except Exception as failure:
 print(json.dumps({'review_account_failed':True,'error_class':type(failure).__name__}));sys.exit(1)
'@
$taskPsi=[Diagnostics.ProcessStartInfo]::new('ssh.exe')
foreach($taskArg in @('-T','-i',"$env:USERPROFILE\.ssh\id_ed25519_kws_vps_laptop",'-o','IdentitiesOnly=yes','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o',"UserKnownHostsFile=$env:USERPROFILE\.ssh\known_hosts_kws",'-o','ConnectTimeout=10','kws-admin@187.7.70.230')){$taskPsi.ArgumentList.Add($taskArg)}
$taskEncodedCode=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($taskCode))
$taskPsi.ArgumentList.Add("sudo -n python3 -c 'import base64;exec(base64.b64decode(""$taskEncodedCode""))'")
$taskPsi.UseShellExecute=$false;$taskPsi.RedirectStandardInput=$true;$taskPsi.RedirectStandardOutput=$true;$taskPsi.RedirectStandardError=$true
$taskProcess=[Diagnostics.Process]::Start($taskPsi)
$taskProcess.StandardInput.WriteLine(($taskCredential|ConvertTo-Json -Compress));$taskProcess.StandardInput.Close()
$taskResult=$taskProcess.StandardOutput.ReadToEnd();$taskDiagnostic=$taskProcess.StandardError.ReadToEnd();$taskProcess.WaitForExit()
if($taskProcess.ExitCode -ne 0){throw 'Review account preparation failed; protected credential retained for safe retry'}
$taskResult|ConvertFrom-Json|ConvertTo-Json -Compress
[pscustomobject]@{bitwarden_reference=$taskReference;secret_id=$taskSecret.id;apple_credentials_not_submitted=$true}|ConvertTo-Json -Compress
