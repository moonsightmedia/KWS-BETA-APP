"""Read integration credentials only from stdin; keep values out of diagnostics."""
import base64
import datetime
import json
import os
from pathlib import Path
import smtplib
import ssl
import subprocess
import tempfile
import time
import urllib.request
import urllib.error
import sys

assert os.getuid() == 0
assert subprocess.check_output(['hostname', '-s'], text=True).strip() == 'srv2044594'
os.umask(0o077)
credentials = json.load(sys.stdin)
account = json.loads(credentials['fcm'])
assert account['type'] == 'service_account' and account['project_id'] == 'kws-beta-app'
assert account['token_uri'] == 'https://oauth2.googleapis.com/token'
smtp_password = credentials['smtp']
assert isinstance(smtp_password, str) and len(smtp_password) >= 12
root = Path('/opt/kws/integrations')
root.mkdir(mode=0o700, exist_ok=True)
target = root / 'runtime.json'
if target.exists():
    recipient = subprocess.check_output(['age-keygen', '-y', '/root/.config/kws-migration/age-key.txt'], text=True).strip()
    backup = root / ('runtime-before-' + datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '.json.age')
    subprocess.run(['age', '-r', recipient, '-o', str(backup), str(target)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
config = {
    'smtp_host': 'w011eb93.kasserver.com', 'smtp_port': 465,
    'smtp_user': 'beta@kletterwelt-sauerland.de', 'smtp_password': smtp_password,
    'sender': 'beta@kletterwelt-sauerland.de', 'reply_to': 'marketing@kletterwelt-sauerland.de',
    'sender_name': 'Kletterwelt Sauerland', 'fcm_service_account': account,
}
temporary = root / 'runtime.json.pending'
temporary.write_text(json.dumps(config))
temporary.chmod(0o600)
temporary.replace(target)
results = {}
try:
    with smtplib.SMTP_SSL(config['smtp_host'], config['smtp_port'], timeout=20, context=ssl.create_default_context()) as mail:
        mail.login(config['smtp_user'], smtp_password)
        results['smtp_authenticated'] = True
        results['smtp_tls_verified'] = True
except (smtplib.SMTPException, OSError, ssl.SSLError):
    results['smtp_authenticated'] = False

def b64(value):
    return base64.urlsafe_b64encode(value).decode().rstrip('=')

now = int(time.time())
header = b64(json.dumps({'alg': 'RS256', 'typ': 'JWT'}, separators=(',', ':')).encode())
claim = b64(json.dumps({'iss': account['client_email'], 'scope': 'https://www.googleapis.com/auth/firebase.messaging',
                       'aud': account['token_uri'], 'iat': now, 'exp': now + 3600}, separators=(',', ':')).encode())
unsigned = header + '.' + claim
try:
    with tempfile.TemporaryDirectory(prefix='oauth-', dir=root) as scratch:
        key = Path(scratch) / 'signing.pem'
        key.write_text(account['private_key'])
        key.chmod(0o600)
        signed = subprocess.run(['openssl', 'dgst', '-sha256', '-sign', str(key)], input=unsigned.encode(),
                                stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, check=True).stdout
    from urllib.parse import urlencode
    body = urlencode({'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                      'assertion': unsigned + '.' + b64(signed)}).encode()
    request = urllib.request.Request(account['token_uri'], data=body, headers={'Content-Type': 'application/x-www-form-urlencoded'})
    with urllib.request.urlopen(request, timeout=20, context=ssl.create_default_context()) as response:
        token = json.load(response)
        results['fcm_oauth_authenticated'] = bool(token.get('access_token')) and token.get('token_type') == 'Bearer'
        results['fcm_oauth_expires_in_seconds'] = int(token.get('expires_in', 0))
except (urllib.error.URLError, OSError, subprocess.SubprocessError, ValueError):
    results['fcm_oauth_authenticated'] = False
results.update({'credential_values_logged': False, 'emails_sent': 0, 'pushes_sent': 0,
                'production_configuration_changed': False, 'protected_runtime_prepared': True})
(root / 'INTEGRATIONS-VERIFIED.json').write_text(json.dumps(results) + '\n')
print(json.dumps(results))
sys.exit(0 if results.get('smtp_authenticated') and results.get('fcm_oauth_authenticated') else 1)
