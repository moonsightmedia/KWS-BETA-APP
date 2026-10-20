"""Add Supabase schema headers for existing origins; preserve all other routes."""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import socket
import subprocess
import time
import urllib.request

TARGET = Path('/opt/kws/production/API.Caddyfile')
CONTAINER = 'kws-api-internal'
ADDITIONS = ('accept-profile', 'content-profile')
ORIGIN_RULE = r'@cors header_regexp Origin ^(https://beta\.kletterwelt-sauerland\.de|https://localhost|capacitor://localhost|http://localhost)$'


def transform(original):
    text = original.decode('utf-8')
    if text.count(ORIGIN_RULE) != 1:
        raise ValueError('existing_origin_rule_requires_review')
    matches = list(re.finditer(r'(?m)^(\s*Access-Control-Allow-Headers ")([^"\r\n]+)("\r?$)', text))
    if len(matches) != 1:
        raise ValueError('header_rule_requires_review')
    match = matches[0]
    names = [name.strip().lower() for name in match[2].split(',')]
    if '*' in names or len(names) != len(set(names)) or 'authorization' not in names or 'apikey' not in names:
        raise ValueError('unexpected_existing_headers')
    missing = [name for name in ADDITIONS if name not in names]
    return (text[:match.start(2)] + match[2] + ''.join(', ' + name for name in missing) + text[match.end(2):]).encode('utf-8')


def write_in_place(path, content):
    # Preserve the inode of the file mounted read-only into the running container.
    with path.open('r+b') as output:
        output.write(content)
        output.truncate()
        output.flush()
        os.fsync(output.fileno())


def apply(config, original, updated, backup, validate, activate, verify):
    if config.is_symlink() or config.read_bytes() != original:
        raise ValueError('configuration_changed')
    backup.mkdir(mode=0o700, parents=True, exist_ok=False)
    saved = backup / 'API.Caddyfile'
    saved.write_bytes(original)
    saved.chmod(0o600)
    activation_attempted = False
    try:
        write_in_place(config, updated)
        validate()
        activation_attempted = True
        activate()
        verify()
    except BaseException:
        write_in_place(config, original)
        if activation_attempted:
            activate()
        raise


def command(*args):
    return subprocess.run(args, check=True, capture_output=True, text=True, timeout=40)


def activate():
    command('docker', 'restart', '--time', '10', CONTAINER)
    for _ in range(30):
        try:
            with urllib.request.urlopen('http://127.0.0.1:9082/healthz', timeout=2) as response:
                if response.status == 200:
                    return
        except OSError:
            pass
        time.sleep(0.25)
    raise RuntimeError('api_health_check_failed')


def verify_public_cors():
    allowed = ('https://beta.kletterwelt-sauerland.de', 'https://localhost', 'capacitor://localhost', 'http://localhost')
    for origin in (*allowed, 'https://unapproved.example.invalid'):
        for method, schema_header in (('GET', 'accept-profile'), ('PATCH', 'content-profile')):
            request = urllib.request.Request('https://beta-api.kletterwelt-sauerland.de/rest/v1/profiles?select=id', method='OPTIONS', headers={
                'Origin': origin, 'Access-Control-Request-Method': method,
                'Access-Control-Request-Headers': 'apikey,authorization,' + schema_header})
            with urllib.request.urlopen(request, timeout=10) as response:
                origins = response.headers.get_all('Access-Control-Allow-Origin') or []
                expected = [origin] if origin in allowed else []
                assert response.status == 204 and origins == expected, 'origin_policy_changed'
                names = {part.strip().lower() for part in response.headers.get('Access-Control-Allow-Headers', '').split(',')}
                assert (schema_header in names) == (origin in allowed), 'schema_preflight_failed'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--execute', action='store_true')
    parser.add_argument('--expected-before')
    args = parser.parse_args()
    if TARGET.is_symlink() or not TARGET.is_file():
        raise ValueError('unsafe_configuration_file')
    original = TARGET.read_bytes()
    updated = transform(original)
    before = hashlib.sha256(original).hexdigest()
    report = {'before': before, 'after': hashlib.sha256(updated).hexdigest(), 'added_headers': list(ADDITIONS),
              'origins_and_routes_unchanged': True, 'applied': False}
    if args.execute:
        if os.name == 'nt' or os.geteuid() != 0 or socket.gethostname().split('.')[0] != 'srv2044594':
            raise ValueError('wrong_operator')
        if args.expected_before != before:
            raise ValueError('reviewed_configuration_required')
        mounts = json.loads(command('docker', 'inspect', '--format', '{{json .Mounts}}', CONTAINER).stdout)
        if not any(m['Source'] == str(TARGET) and m['Destination'] == '/etc/caddy/Caddyfile' and not m['RW'] for m in mounts):
            raise ValueError('configuration_mount_changed')
        if original != updated:
            backup = TARGET.parent / 'cors-backups' / datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
            apply(TARGET, original, updated, backup,
                  lambda: command('docker', 'exec', CONTAINER, 'caddy', 'validate', '--config', '/etc/caddy/Caddyfile', '--adapter', 'caddyfile'),
                  activate, verify_public_cors)
            report.update(applied=True, backup=str(backup))
        else:
            verify_public_cors()
        report['verified_at'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        receipt = TARGET.parent / 'SUPABASE-SCHEMA-CORS-VERIFIED.json'
        receipt.write_text(json.dumps(report) + '\n')
        receipt.chmod(0o600)
    print(json.dumps(report))


if __name__ == '__main__':
    main()
