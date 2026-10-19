#!/usr/bin/env python3
"""Create a private, separate Supabase stack. Never copy production data/secrets."""
import argparse
import base64
import hashlib
import hmac
import json
import os
from pathlib import Path
import secrets
import shutil
import socket
import subprocess
import time

ROOT = Path('/opt/kws/store-review')
UPSTREAM = Path('/opt/kws/supabase/upstream/docker')
PREFIX = 'kws-store-review'
SERVICES = ['db', 'auth', 'rest', 'storage', 'imgproxy', 'realtime', 'api-gw']
IMAGES_FROM = {'db': 'supabase-db', 'auth': 'supabase-auth', 'rest': 'supabase-rest',
               'storage': 'supabase-storage', 'imgproxy': 'supabase-imgproxy',
               'realtime': 'realtime-dev.supabase-realtime', 'api-gw': 'supabase-envoy'}


def run(args, **kwargs):
    return subprocess.check_output(args, text=True, **kwargs).strip()


def jwt(secret, role):
    encode = lambda obj: base64.urlsafe_b64encode(json.dumps(obj, separators=(',', ':')).encode()).decode().rstrip('=')
    body = encode({'alg': 'HS256', 'typ': 'JWT'}) + '.' + encode({
        'role': role, 'iss': 'kws-store-review', 'iat': int(time.time()),
        'exp': int(time.time()) + 5 * 365 * 86400})
    signature = base64.urlsafe_b64encode(hmac.new(secret.encode(), body.encode(), hashlib.sha256).digest()).decode().rstrip('=')
    return body + '.' + signature


def validate(config, root=ROOT):
    assert config['name'] == PREFIX
    assert config['networks']['default']['internal'] is True
    assert set(config['services']) == set(SERVICES + ['video'])
    for name, service in config['services'].items():
        expected_name = 'realtime-dev.' + PREFIX if name == 'realtime' else PREFIX + '-' + name
        assert service['container_name'] == expected_name
        assert service['networks'] == {'default': None}, 'No production Docker network permitted'
        assert not service.get('privileged') and not service.get('network_mode')
        assert not service.get('devices') and not service.get('extra_hosts')
        for port in service.get('ports', []):
            assert port['host_ip'] == '127.0.0.1'
            assert int(port['published']) in [19080, 19081]
        for mount in service.get('volumes', []):
            if mount['type'] == 'bind':
                assert Path(mount['source']).resolve().is_relative_to(root.resolve()), mount['source']
            else:
                assert mount['source'] in config['volumes']
                assert config['volumes'][mount['source']]['name'].startswith(PREFIX + '-')
                assert not config['volumes'][mount['source']].get('external')
        for value in service.get('environment', {}).values():
            assert 'kws-api-internal' not in str(value)
            assert 'video-production' not in str(value)
    assert config['services']['api-gw']['ports'][0]['published'] == '19080'
    assert config['services']['video']['ports'][0]['published'] == '19081'


def prepare():
    assert os.geteuid() == 0 and socket.gethostname().split('.')[0] == 'srv2044594'
    os.umask(0o077)
    ROOT.mkdir(mode=0o700, exist_ok=True)
    marker = ROOT / 'PREPARED.json'
    if marker.exists():
        config = json.loads((ROOT / 'compose.json').read_text())
        validate(config)
        return config
    # A partial attempt must be inspected; never overwrite an existing database.
    assert not (ROOT / 'volumes/db/data').exists(), 'Existing review PGDATA needs inspection'
    for folder in ['db', 'api', 'storage']:
        source = UPSTREAM / 'volumes' / folder
        target = ROOT / 'volumes' / folder
        if source.exists():
            shutil.copytree(source, target, dirs_exist_ok=True)
        else:
            target.mkdir(mode=0o700, parents=True, exist_ok=True)
    cds = ROOT / 'volumes/api/envoy/cds.yaml'
    cds.write_text(cds.read_text().replace('address: realtime-dev.supabase-realtime', 'address: realtime'))
    shutil.copyfile(UPSTREAM / 'docker-compose.yml', ROOT / 'docker-compose.yml')
    env = {}
    for line in (UPSTREAM / '.env.example').read_text().splitlines():
        if line and not line.startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            env[key] = value
    secret = secrets.token_hex(32)
    env.update(POSTGRES_HOST='db', POSTGRES_PORT='5432', POSTGRES_DB='postgres',
               POSTGRES_PASSWORD=secrets.token_urlsafe(36), JWT_SECRET=secret,
               ANON_KEY=jwt(secret, 'anon'), SERVICE_ROLE_KEY=jwt(secret, 'service_role'),
               JWT_JWKS='', JWT_KEYS='', ANON_KEY_ASYMMETRIC='', SERVICE_ROLE_KEY_ASYMMETRIC='',
               SUPABASE_PUBLISHABLE_KEY='', SUPABASE_SECRET_KEY='',
               SECRET_KEY_BASE=secrets.token_hex(32), VAULT_ENC_KEY=secrets.token_hex(16),
               PG_META_CRYPTO_KEY=secrets.token_hex(16), REALTIME_DB_ENC_KEY=secrets.token_hex(8),
               DASHBOARD_USERNAME='review-operator', DASHBOARD_PASSWORD=secrets.token_urlsafe(32),
               S3_PROTOCOL_ACCESS_KEY_ID=secrets.token_urlsafe(16),
               S3_PROTOCOL_ACCESS_KEY_SECRET=secrets.token_urlsafe(32),
               SITE_URL='https://beta.kletterwelt-sauerland.de', ADDITIONAL_REDIRECT_URLS='',
               SUPABASE_PUBLIC_URL='https://review-api.kletterwelt-sauerland.de',
               API_EXTERNAL_URL='https://review-api.kletterwelt-sauerland.de',
               API_GW_HTTP_PORT='19080', DISABLE_SIGNUP='true', ENABLE_EMAIL_SIGNUP='true',
               ENABLE_EMAIL_AUTOCONFIRM='false', ENABLE_PHONE_SIGNUP='false',
               ENABLE_PHONE_AUTOCONFIRM='false', ENABLE_ANONYMOUS_USERS='false',
               SMTP_HOST='127.0.0.1', SMTP_PORT='1', SMTP_USER='', SMTP_PASS='',
               SMTP_ADMIN_EMAIL='review@example.invalid', SMTP_SENDER_NAME='KWS review only',
               OPENAI_API_KEY='', STUDIO_DEFAULT_PROJECT='KWS isolated store review',
               STORAGE_TENANT_ID='kws-review', GLOBAL_S3_BUCKET='kws-review')
    envfile = ROOT / '.env'
    envfile.write_text('\n'.join(k + '=' + v for k, v in env.items()) + '\n')
    envfile.chmod(0o600)
    config = json.loads(run(['docker', 'compose', '--env-file', str(envfile),
                             '-f', str(ROOT / 'docker-compose.yml'), 'config', '--format', 'json']))
    config['name'] = PREFIX
    config['services'] = {k: v for k, v in config['services'].items() if k in SERVICES}
    config['networks'] = {'default': {'name': PREFIX + '-private', 'internal': True}}
    config['volumes'] = {'db-config': {'name': PREFIX + '-db-config'}}
    for name, service in config['services'].items():
        service['container_name'] = PREFIX + '-' + name
        if name == 'realtime':
            service['container_name'] = 'realtime-dev.' + PREFIX
        # Software identities only, never inspect/copy production environment values.
        service['image'] = run(['docker', 'inspect', IMAGES_FROM[name], '--format', '{{.Image}}'])
        service['networks'] = {'default': None}
        service['depends_on'] = {k: v for k, v in service.get('depends_on', {}).items() if k in SERVICES}
        service.pop('ports', None)
        if name == 'api-gw':
            service['ports'] = [{'target': 8000, 'published': '19080', 'host_ip': '127.0.0.1', 'protocol': 'tcp'}]
        service['mem_limit'] = '1536m' if name in ['db', 'realtime'] else '768m'
        service['cpus'] = 1.0
        service['logging'] = {'driver': 'local', 'options': {'max-size': '10m', 'max-file': '2'}}
    (ROOT / 'video').mkdir(mode=0o700, exist_ok=True)
    config['services']['video'] = {
        'container_name': PREFIX + '-video',
        'image': run(['docker', 'inspect', 'kws-video-production', '--format', '{{.Image}}']),
        'restart': 'unless-stopped', 'read_only': True, 'cap_drop': ['ALL'],
        'security_opt': ['no-new-privileges:true'], 'tmpfs': ['/tmp:size=256m,mode=1777'],
        'mem_limit': '1g', 'cpus': 1.0, 'networks': {'default': None},
        'ports': [{'target': 3000, 'published': '19081', 'host_ip': '127.0.0.1', 'protocol': 'tcp'}],
        'volumes': [{'type': 'bind', 'source': str(ROOT / 'video'), 'target': '/data'}],
        'environment': {'PORT': '3000', 'DATA_DIR': '/data',
            'PUBLIC_BASE_URL': 'https://review-video.kletterwelt-sauerland.de',
            'SUPABASE_URL': 'http://api-gw:8000', 'SUPABASE_ANON_KEY': env['ANON_KEY'],
            'SUPABASE_SERVICE_ROLE_KEY': env['SERVICE_ROLE_KEY'], 'REQUIRED_ROLES': 'admin,setter'},
        'logging': {'driver': 'local', 'options': {'max-size': '10m', 'max-file': '2'}}}
    validate(config)
    for file in (ROOT / 'volumes').rglob('*'):
        if file.is_file():
            file.chmod(0o755 if file.name.endswith('.sh') else 0o644)
        elif file.is_dir():
            file.chmod(0o755)
    storage = ROOT / 'volumes/storage'
    uid = int(run(['docker', 'exec', 'supabase-storage', 'id', '-u']))
    gid = int(run(['docker', 'exec', 'supabase-storage', 'id', '-g']))
    os.chown(storage, uid, gid)
    (ROOT / 'compose.json').write_text(json.dumps(config) + '\n')
    (ROOT / 'compose.json').chmod(0o600)
    report = {'prepared': True, 'network_isolated': True, 'loopback_only': True,
              'production_data_copied': False, 'production_secrets_copied': False,
              'email_disabled': True, 'public_routing_enabled': False,
              'services': list(config['services'])}
    marker.write_text(json.dumps(report) + '\n')
    return config


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--start', action='store_true', help='Start the isolated private stack')
    args = parser.parse_args()
    prepare()
    if args.start:
        with (ROOT / 'start.log').open('w') as log:
            subprocess.run(['docker', 'compose', '-f', str(ROOT / 'compose.json'), 'up', '-d'],
                           stdout=log, stderr=log, check=True)
    print(json.dumps({'prepared': True, 'private_start_requested': args.start,
                      'public_routing_enabled': False, 'production_changed': False}))
