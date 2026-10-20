"""Guarded addition of three thumbnail routes to the existing mounted Caddyfile.

No configuration text, password hashes or credentials are printed. Dry-run is
the default. --apply requires exact current SHA and a fresh private backup.
"""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import time
import urllib.request
import urllib.error

TARGET = Path('/opt/kws/public-gateway/Caddyfile')
COMPOSE = Path('/opt/kws/public-gateway/docker-compose.yml')
CONTAINER = 'kws-public-gateway-caddy-1'
REVISION = 'e4668c026bd3743c6011cc5453dbe32d4d67cadf'
ROUTES = {
    'beta.kletterwelt-sauerland.de': ('kws-thumbnail-focus-production:5227', 'production'),
    'beta-api.kletterwelt-sauerland.de': ('kws-thumbnail-focus-production:5227', 'production'),
    'review-api.kletterwelt-sauerland.de': ('kws-thumbnail-focus-review:5228', 'review'),
}


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def block_end(text, opening):
    depth, quoted, comment, escaped = 0, False, False, False
    for index in range(opening, len(text)):
        char = text[index]
        if comment:
            if char == '\n': comment = False
            continue
        if escaped:
            escaped = False
            continue
        if char == '\\':
            escaped = True
            continue
        if char == '"': quoted = not quoted
        if quoted: continue
        if char == '#': comment = True
        elif char == '{': depth += 1
        elif char == '}':
            depth -= 1
            if depth == 0: return index
    raise ValueError('Unbalanced Caddy block')


def transform(raw):
    text = raw.decode('utf-8')
    if 'KWS THUMBNAIL FOCUS BEGIN' in text or re.search(r'(?m)^\s*handle_path\s+/thumbnail-focus/', text):
        raise ValueError('Existing thumbnail route requires explicit review')
    insertions = []
    for host, (upstream, _) in ROUTES.items():
        matches = list(re.finditer(r'(?m)^' + re.escape(host) + r'\s*\{\s*$', text))
        if len(matches) != 1: raise ValueError('Expected one exact host block: ' + host)
        opening = text.index('{', matches[0].start())
        end = block_end(text, opening)
        block = text[opening:end]
        expected = 'reverse_proxy kws-web-production:80' if host.startswith('beta.') else 'reverse_proxy kws-api-internal:80' if host.startswith('beta-api.') else 'reverse_proxy kws-store-review-api-gw:8000'
        if block.count(expected) != 1: raise ValueError('Existing upstream requires review: ' + host)
        route = '\n\t# KWS THUMBNAIL FOCUS BEGIN\n\thandle_path /thumbnail-focus/* {\n\t\trequest_body {\n\t\t\tmax_size 17000000\n\t\t}\n\t\treverse_proxy ' + upstream + ' {\n\t\t\ttransport http {\n\t\t\t\tresponse_header_timeout 65s\n\t\t\t}\n\t\t}\n\t}\n\t# KWS THUMBNAIL FOCUS END\n'
        insertions.append((opening + 1, route))
    for position, addition in sorted(insertions, reverse=True):
        text = text[:position] + addition + text[position:]
    return text.encode('utf-8')


def command(*args):
    # Capture potentially sensitive Caddy validation diagnostics, never print.
    subprocess.run(args, check=True, capture_output=True, timeout=40)


def activate():
    command('docker', 'exec', CONTAINER, 'caddy', 'validate', '--config', '/etc/caddy/Caddyfile', '--adapter', 'caddyfile')
    # This gateway intentionally has admin off, so an API reload cannot work.
    command('docker', 'restart', '--time', '10', CONTAINER)


def transform_compose(raw):
    text = raw.decode('utf-8')
    old = '    networks: [supabase, store_review]'
    if text.count(old) != 1 or text.count('name: kws-store-review-private') != 1 or text.count('name: supabase_default') != 1:
        raise ValueError('Existing gateway network configuration requires review')
    new = '    networks:\n      supabase:\n        aliases: [beta-api.kletterwelt-sauerland.de]\n      store_review:\n        aliases: [review-api.kletterwelt-sauerland.de]'
    return text.replace(old, new, 1).encode('utf-8')


def validate_candidates():
    command('docker', 'compose', '--project-directory', str(COMPOSE.parent), '-f', str(COMPOSE), 'config', '--quiet')
    # The running config stays unchanged until recreate. Validate the candidate
    # through its existing read-only bind without exposing its contents/logs.
    command('docker', 'exec', CONTAINER, 'caddy', 'validate', '--config', '/etc/caddy/Caddyfile', '--adapter', 'caddyfile')


def recreate():
    command('docker', 'compose', '--project-directory', str(COMPOSE.parent), '-f', str(COMPOSE), 'up', '-d', '--no-deps', '--force-recreate', 'caddy')


def verify_aliases():
    result = subprocess.run(['docker', 'inspect', CONTAINER], check=True, capture_output=True, timeout=20)
    data = json.loads(result.stdout)[0]
    networks = data['NetworkSettings']['Networks']
    if set(networks) != {'supabase_default', 'kws-store-review-private'}:
        raise ValueError('Gateway network set changed')
    for network, alias in (('supabase_default', 'beta-api.kletterwelt-sauerland.de'), ('kws-store-review-private', 'review-api.kletterwelt-sauerland.de')):
        if alias not in networks[network].get('Aliases', []): raise ValueError('Gateway DNS alias missing')


def verify():
    for host, (_, environment) in ROUTES.items():
        with urllib.request.urlopen('https://' + host + '/thumbnail-focus/api/health', timeout=10) as response:
            data = json.load(response)
        if data.get('ok') is not True or data.get('local_only') is not False or data.get('provider') != 'CPUExecutionProvider' or data.get('environment') != environment or data.get('model_revision') != REVISION:
            raise ValueError('Unexpected readiness on ' + host)


def verify_live():
    last = None
    for _ in range(20):
        try:
            verify_aliases()
            verify()
            verify_normal()
            return
        except (OSError, ValueError, subprocess.SubprocessError) as error:
            last = error
            time.sleep(0.5)
    raise RuntimeError('Gateway readiness/aliases failed after recreate') from last


def verify_normal():
    with HEALTH_HTTP.open('https://beta.kletterwelt-sauerland.de/version.json', timeout=10) as response:
        if response.status != 200: raise ValueError('Existing web version route failed')
    for environment, host in (('production', 'beta-api.kletterwelt-sauerland.de'), ('review', 'review-api.kletterwelt-sauerland.de')):
        url = 'https://' + host + '/auth/v1/health'
        # These existing GoTrue gateways intentionally require their public key.
        # A missing key must retain the pre-existing401 boundary; each configured
        # context must then accept its own existing anon key, never a user JWT.
        try:
            with HEALTH_HTTP.open(url, timeout=10) as response:
                unauthenticated_status = response.status
        except urllib.error.HTTPError as error:
            unauthenticated_status = error.code
            error.close()
        if unauthenticated_status != 401: raise ValueError('Existing API-key boundary changed: ' + environment)
        request = urllib.request.Request(url, headers={'apikey': load_public_key(environment)})
        with HEALTH_HTTP.open(request, timeout=10) as response:
            if response.status != 200: raise ValueError('Existing GoTrue health failed: ' + environment)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs): return None


HEALTH_HTTP = urllib.request.build_opener(NoRedirect)


def load_public_key(environment):
    if environment not in ('production', 'review'): raise ValueError('Unexpected auth context')
    path = Path('/opt/kws/thumbnail-focus') / (environment + '.env')
    info = path.stat()
    if path.is_symlink() or not stat.S_ISREG(info.st_mode) or info.st_uid != 0 or stat.S_IMODE(info.st_mode) != 0o600:
        raise ValueError('Expected root600 environment file: ' + environment)
    values = {}
    for line in path.read_text().splitlines():
        if line.strip() and not line.lstrip().startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            values[key.strip()] = value.strip()
    key = values.get('THUMBNAIL_PUBLIC_KEY') or values.get('ANON_KEY')
    if not key or '\r' in key or '\n' in key or key.startswith('sb_secret_'):
        raise ValueError('Existing public key unavailable: ' + environment)
    if values.get('THUMBNAIL_PUBLIC_KEY') and values.get('ANON_KEY') and values['THUMBNAIL_PUBLIC_KEY'] != values['ANON_KEY']:
        raise ValueError('Ambiguous public key configuration: ' + environment)
    return key


def write_in_place(target, raw):
    with target.open('r+b') as output:
        output.write(raw)
        output.truncate()
        output.flush()
        os.fsync(output.fileno())


def apply(target, original, updated, backup, activate_fn=activate, verify_fn=verify):
    if target.is_symlink() or target.read_bytes() != original:
        raise ValueError('Configuration changed before apply')
    backup.mkdir(parents=True, exist_ok=False, mode=0o700)
    backup.chmod(0o700)
    saved = backup / 'Caddyfile'
    saved.write_bytes(original)
    saved.chmod(0o600)
    record = {'target': str(target), 'before_sha256': sha(original), 'after_sha256': sha(updated)}
    marker = backup / 'gateway-change.json'
    marker.write_text(json.dumps(record, indent=2))
    marker.chmod(0o600)
    try:
        write_in_place(target, updated)
        activate_fn()
        verify_fn()
    except BaseException:
        write_in_place(target, original)
        activate_fn()
        raise
    return record


def apply_pair(target, compose, original, original_compose, updated, updated_compose, backup, validate_fn=validate_candidates, activate_fn=recreate, verify_fn=verify_live):
    if any(path.is_symlink() for path in (target, compose)) or target.read_bytes() != original or compose.read_bytes() != original_compose:
        raise ValueError('Gateway config changed before apply')
    backup.mkdir(parents=True, exist_ok=False, mode=0o700)
    backup.chmod(0o700)
    for name, raw in (('Caddyfile', original), ('docker-compose.yml', original_compose)):
        saved = backup / name
        saved.write_bytes(raw)
        saved.chmod(0o600)
    record = {'target': str(target), 'compose_target': str(compose), 'before_sha256': sha(original), 'after_sha256': sha(updated), 'compose_before_sha256': sha(original_compose), 'compose_after_sha256': sha(updated_compose)}
    marker = backup / 'gateway-change.json'
    marker.write_text(json.dumps(record, indent=2))
    marker.chmod(0o600)
    attempted = False
    try:
        write_in_place(target, updated)
        write_in_place(compose, updated_compose)
        validate_fn()
        attempted = True
        activate_fn()
        verify_fn()
    except BaseException:
        write_in_place(target, original)
        write_in_place(compose, original_compose)
        if attempted:
            activate_fn()
        raise
    return record


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--expected-sha256', required=True)
    parser.add_argument('--expected-compose-sha256', required=True)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--backup-dir', type=Path)
    parser.add_argument('--rollback-from', type=Path)
    args = parser.parse_args()
    if TARGET.is_symlink() or COMPOSE.is_symlink(): raise ValueError('Symlink target refused')
    original = TARGET.read_bytes()
    original_compose = COMPOSE.read_bytes()
    if sha(original) != args.expected_sha256 or sha(original_compose) != args.expected_compose_sha256: raise ValueError('Gateway SHA changed; stop and review')
    if args.rollback_from:
        folder = args.rollback_from.resolve(strict=True)
        if not folder.is_relative_to(Path('/opt/kws/thumbnail-focus/rollback')) or args.rollback_from.is_symlink(): raise ValueError('Unexpected rollback path')
        record = json.loads((folder / 'gateway-change.json').read_text())
        updated = (folder / 'Caddyfile').read_bytes()
        updated_compose = (folder / 'docker-compose.yml').read_bytes()
        if record['target'] != str(TARGET) or record.get('compose_target') != str(COMPOSE) or record['after_sha256'] != sha(original) or record['before_sha256'] != sha(updated) or record['compose_after_sha256'] != sha(original_compose) or record['compose_before_sha256'] != sha(updated_compose): raise ValueError('Rollback proof mismatch')
    else:
        updated = transform(original)
        updated_compose = transform_compose(original_compose)
    if not args.apply:
        print(json.dumps({'dry_run': True, 'before_sha256': sha(original), 'after_sha256': sha(updated), 'compose_before_sha256': sha(original_compose), 'compose_after_sha256': sha(updated_compose), 'hosts': list(ROUTES)}))
        return
    if os.geteuid() != 0: raise ValueError('Root execution required')
    backup = args.backup_dir or Path('/opt/kws/thumbnail-focus/rollback') / datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    if not backup.resolve().is_relative_to(Path('/opt/kws/thumbnail-focus/rollback')) or backup.is_symlink(): raise ValueError('Unexpected backup path')
    backup = backup.resolve()
    record = apply_pair(TARGET, COMPOSE, original, original_compose, updated, updated_compose, backup, verify_fn=verify_normal if args.rollback_from else verify_live)
    print(json.dumps({'applied': True, **record, 'backup': str(backup)}))


if __name__ == '__main__':
    main()
