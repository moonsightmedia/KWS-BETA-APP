"""Read-only live validation, then private operational/recovery attestations.

Never prints environment values, tokens, images or raw Docker inspection data.
No production DB/media writes. Optional test tokens come from normal existing
account sign-ins; this tool cannot mint tokens or impersonate users.
"""
import argparse
import base64
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import struct
import subprocess
import sys
import urllib.error
import urllib.request
import zlib

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / 'services/thumbnail-focus'))
from download_models import verify_models
from model_contract import MODELS, REVISION, VERSION

ROOT = Path('/opt/kws/thumbnail-focus')
GATEWAY = Path('/opt/kws/public-gateway/Caddyfile')
RESTORE = Path('/opt/kws/integrations/thumbnail-focus-restore.json')
ORIGINS = ('https://beta.kletterwelt-sauerland.de', 'https://localhost', 'capacitor://localhost', 'http://localhost')
CONTEXTS = {
    'production': ('kws-thumbnail-focus-production', 'supabase_default', 'https://beta-api.kletterwelt-sauerland.de', '5227'),
    'review': ('kws-thumbnail-focus-review', 'kws-store-review-private', 'https://review-api.kletterwelt-sauerland.de', '5228'),
}


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def private_file(path):
    if path.is_symlink(): raise ValueError('Symlink private file refused')
    info = path.stat()
    if not stat.S_ISREG(info.st_mode) or info.st_uid != 0 or stat.S_IMODE(info.st_mode) != 0o600:
        raise ValueError('Expected root-owned mode600 regular file: ' + path.name)
    return path.read_text()


def private_json(path, data):
    if path.is_symlink(): raise ValueError('Symlink output refused')
    if path.exists(): private_file(path)
    raw = json.dumps(data, indent=2, ensure_ascii=False).encode()
    temporary = path.with_name('.' + path.name + '.tmp-' + str(os.getpid()))
    created = False
    try:
        with temporary.open('xb') as output:
            created = True
            os.chmod(temporary, 0o600)
            output.write(raw)
            output.flush()
            os.fsync(output.fileno())
        temporary.replace(path)
    finally:
        if created and temporary.exists(): temporary.unlink()
    return sha(raw)


def command_json(*args):
    result = subprocess.run(args, check=True, capture_output=True, timeout=40)
    return json.loads(result.stdout)


def inspect_container(data, environment, image_id, model_dir):
    _, network, _, port = CONTEXTS[environment]
    host = data['HostConfig']
    config = data['Config']
    env = dict(row.split('=', 1) for row in config['Env'] if '=' in row)
    networks = set(data['NetworkSettings']['Networks'])
    if networks != {network} or host.get('NetworkMode') in ('host', 'none') or host.get('PortBindings'):
        raise ValueError('Unexpected network exposure: ' + environment)
    if any(value for value in data['NetworkSettings'].get('Ports', {}).values()):
        raise ValueError('Published container port: ' + environment)
    if data['Image'] != image_id or not data['State']['Running'] or data['State'].get('Health', {}).get('Status') != 'healthy':
        raise ValueError('Image/health mismatch: ' + environment)
    if config.get('User') != '10001:10001' or host.get('ReadonlyRootfs') is not True or host.get('Privileged'):
        raise ValueError('Unexpected container privileges: ' + environment)
    if 'ALL' not in host.get('CapDrop', []) or not any(value.startswith('no-new-privileges') for value in host.get('SecurityOpt', [])):
        raise ValueError('Missing container protection: ' + environment)
    if not 0 < host.get('Memory', 0) <= 1610612736 or not 0 < host.get('NanoCpus', 0) <= 1000000000 or not 0 < host.get('PidsLimit', 0) <= 64:
        raise ValueError('Unbounded container resources: ' + environment)
    mounts = data['Mounts']
    models = [mount for mount in mounts if mount['Destination'] == '/models']
    if len(models) != 1 or models[0].get('RW') is not False or models[0].get('Type') != 'bind' or Path(models[0]['Source']).resolve() != model_dir.resolve():
        raise ValueError('Models must be a shared read-only mount: ' + environment)
    if any(mount['Destination'] not in ('/models', '/tmp') for mount in mounts):
        raise ValueError('Unexpected private-data mount: ' + environment)
    expected = {'THUMBNAIL_ENVIRONMENT': environment, 'THUMBNAIL_LOCAL_ONLY': 'false', 'THUMBNAIL_CONTAINER_PRIVATE': 'true', 'THUMBNAIL_BIND': '0.0.0.0', 'THUMBNAIL_PORT': port, 'THUMBNAIL_AUTH_URL': CONTEXTS[environment][2]}
    if any(env.get(key) != value for key, value in expected.items()):
        raise ValueError('Auth/runtime context mismatch: ' + environment)
    if set(env.get('THUMBNAIL_ALLOWED_ORIGINS', '').split(',')) != set(ORIGINS):
        raise ValueError('Unexpected origin set: ' + environment)
    return env


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs): return None


HTTP = urllib.request.build_opener(NoRedirect)


def request(origin, path='/api/health', method='GET', data=None, headers=None):
    item = urllib.request.Request(origin + '/thumbnail-focus' + path, data=data, method=method, headers=headers or {})
    try:
        response = HTTP.open(item, timeout=65)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        raw = response.read(5_000_001)
        if len(raw) > 5_000_000: raise ValueError('Unexpected response size')
        return response.status, dict(response.headers), json.loads(raw) if raw else {}


def synthetic_photo():
    def chunk(kind, body):
        return struct.pack('>I', len(body)) + kind + body + struct.pack('>I', zlib.crc32(kind + body))
    raw = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', 64, 64, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress((b'\x00' + b'\x88\x88\x88' * 64) * 64)) + chunk(b'IEND', b'')
    return json.dumps({'image': base64.b64encode(raw).decode(), 'color': 'red'}).encode()


def health(origin, environment):
    status, _, data = request(origin)
    expected = {'ok': True, 'local_only': False, 'provider': 'CPUExecutionProvider', 'environment': environment, 'version': VERSION, 'model_revision': REVISION}
    if status != 200 or any(data.get(key) != value for key, value in expected.items()):
        raise ValueError('Unexpected readiness: ' + environment)
    return expected


def auth_matrix(tokens):
    photo = synthetic_photo()
    results = {}
    for environment, (_, _, origin, _) in CONTEXTS.items():
        if request(origin, '/api/analyze', 'POST', photo, {'Content-Type': 'application/json'})[0] != 403:
            raise ValueError('Unauthenticated analysis allowed')
        if request(origin, '/api/analyze', 'POST', photo, {'Content-Type': 'application/json', 'Authorization': 'Bearer invalid-noncredential-fixture'})[0] != 403:
            raise ValueError('Invalid bearer was accepted')
        for allowed in ORIGINS:
            status, headers, _ = request(origin, '/api/analyze', 'OPTIONS', headers={'Origin': allowed, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization, content-type'})
            if status != 204 or headers.get('Access-Control-Allow-Origin') != allowed or 'Access-Control-Allow-Credentials' in headers:
                raise ValueError('Unexpected native/app CORS response')
        status, headers, _ = request(origin, '/api/analyze', 'OPTIONS', headers={'Origin': 'https://evil.invalid', 'Access-Control-Request-Method': 'POST'})
        if status != 403 or 'Access-Control-Allow-Origin' in headers:
            raise ValueError('Foreign origin accepted')
        current = {'unauthenticated_denied': True, 'invalid_token_denied': True, 'cors_verified': True, 'setter_allowed': None, 'customer_denied': None, 'cross_environment_denied': None}
        for category, expected in (('setter', 200), ('customer', 403)):
            token = tokens.get(environment + '_' + category)
            if token:
                status, _, _ = request(origin, '/api/analyze', 'POST', photo, {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token, 'Origin': ORIGINS[0]})
                if status != expected: raise ValueError('Live role matrix mismatch: ' + environment + '/' + category)
                current['setter_allowed' if category == 'setter' else 'customer_denied'] = True
        foreign = tokens.get(('review' if environment == 'production' else 'production') + '_setter')
        if foreign:
            status, _, _ = request(origin, '/api/analyze', 'POST', photo, {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + foreign})
            if status != 403: raise ValueError('Cross-environment session was accepted')
            current['cross_environment_denied'] = True
        results[environment] = current
    return results


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-revision', required=True)
    parser.add_argument('--image-id', required=True)
    parser.add_argument('--auth-token-file', type=Path)
    parser.add_argument('--require-auth-matrix', action='store_true')
    args = parser.parse_args()
    if os.geteuid() != 0: raise ValueError('Run as root; do not weaken config permissions')
    if not re.fullmatch(r'[a-f0-9]{40}', args.source_revision) or not re.fullmatch(r'sha256:[a-f0-9]{64}', args.image_id): raise ValueError('Expected immutable source and image identities')
    root_info = ROOT.stat()
    if ROOT.is_symlink() or root_info.st_uid != 0 or stat.S_IMODE(root_info.st_mode) != 0o700: raise ValueError('Expected a root-private runtime directory')
    models_dir = ROOT / 'models'
    verify_models(models_dir)
    image = command_json('docker', 'image', 'inspect', args.image_id)[0]
    labels = image['Config'].get('Labels', {})
    if labels.get('org.opencontainers.image.revision') != args.source_revision or not re.fullmatch(r'python(?::[^@]+)?@sha256:[a-f0-9]{64}', labels.get('org.opencontainers.image.base.name', '')):
        raise ValueError('Expected pinned Python base/source labels')
    environments, states = {}, {}
    gateway = command_json('docker', 'inspect', 'kws-public-gateway-caddy-1')[0]
    gateway_networks = gateway['NetworkSettings']['Networks']
    if set(gateway_networks) != {'supabase_default', 'kws-store-review-private'}: raise ValueError('Gateway network set changed')
    for environment, (container, _, origin, _) in CONTEXTS.items():
        network = CONTEXTS[environment][1]
        network_policy = command_json('docker', 'network', 'inspect', network)[0]
        if network_policy.get('Internal') != (environment == 'review'): raise ValueError('Existing network isolation policy changed')
        hostname = origin.split('://')[1]
        if hostname not in gateway_networks[network].get('Aliases', []): raise ValueError('Gateway DNS alias missing')
        addresses = command_json('docker', 'exec', container, 'python', '-c', "import json,socket; print(json.dumps(sorted({row[4][0] for row in socket.getaddrinfo('" + hostname + "',443,socket.AF_INET,socket.SOCK_STREAM)})))")
        if addresses != [gateway_networks[network]['IPAddress']]: raise ValueError('Auth DNS does not resolve to the private TLS gateway')
        environments[environment] = inspect_container(command_json('docker', 'inspect', container)[0], environment, args.image_id, models_dir)
        states[environment] = health(origin, environment)
    if environments['production']['THUMBNAIL_PUBLIC_KEY'] == environments['review']['THUMBNAIL_PUBLIC_KEY']:
        raise ValueError('Production/review public keys must differ')
    health('https://beta.kletterwelt-sauerland.de', 'production')
    tokens = json.loads(private_file(args.auth_token_file)) if args.auth_token_file else {}
    matrix = auth_matrix(tokens)
    if args.require_auth_matrix and any(value is not True for row in matrix.values() for value in row.values()): raise ValueError('Live auth matrix is incomplete')
    proof = {'version': 1, 'verified_at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'gateway_sha256': sha(GATEWAY.read_bytes()), 'source_revision': args.source_revision, 'image_id': args.image_id, 'models_verified': True, 'private_networks_only': True, 'local_only_false': True, 'production': states['production'], 'review': states['review'], 'auth_matrix': matrix, 'models': {name: {'size': identity[0], 'sha256': identity[1]} for name, identity in MODELS.items()}}
    proof_sha = private_json(ROOT / 'VERIFIED.json', proof)
    # This existing backup-covered top-level location contains config only. It
    # never contains photos/weights, live user tokens or user export decisions.
    env_files = {environment: private_file(ROOT / (environment + '.env')) for environment in CONTEXTS}
    restore = {'version': 1, 'source_revision': args.source_revision, 'source_repository': 'https://github.com/moonsightmedia/KWS-BETA-APP', 'image_id': args.image_id, 'python_base': labels['org.opencontainers.image.base.name'], 'models': {name: {'size': identity[0], 'sha256': identity[1], 'official_url': f'https://huggingface.co/mit-han-lab/efficientvit-sam/resolve/{REVISION}/onnx/{name}?download=true'} for name, identity in MODELS.items()}, 'compose': (ROOT / 'compose.yaml').read_text(), 'environment_files': env_files, 'verified_sha256': proof_sha, 'gateway_sha256': proof['gateway_sha256'], 'activation_at_verification': json.loads(private_file(ROOT / 'ACTIVATION.json')) if (ROOT / 'ACTIVATION.json').exists() else None, 'restore_steps': ['Restore source checkout at source_revision and config/env as root600 under /opt/kws/thumbnail-focus (directory700).', 'Download only pinned official models with download_models.py; verify exact sizes and SHA256; mount weights read-only.', 'Rebuild using recorded official Python base digest and source label; inspect nonroot/resource/network/no-published-port constraints.', 'Start production and review separately on their existing private networks; restore only the three guarded gateway routes.', 'Keep feature activation disabled until verify-runtime.py and normal account/role checks pass; regenerate ACTIVATION proof for this gateway digest.', 'No images or previous user decisions are modified by this runtime recovery.']}
    private_json(RESTORE, restore)
    print(json.dumps({'verified': True, 'proof': str(ROOT / 'VERIFIED.json'), 'proof_sha256': proof_sha, 'restore_config': str(RESTORE), 'live_auth_matrix_complete': all(value is True for row in matrix.values() for value in row.values())}))


if __name__ == '__main__':
    main()
