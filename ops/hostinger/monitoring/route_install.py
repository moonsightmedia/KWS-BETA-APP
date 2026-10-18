"""Open only the reviewed monitoring slug in the existing authenticated API route."""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import socket
import subprocess

TARGET = Path('/opt/kws/production/API.Caddyfile')
BACKUPS = Path('/opt/kws/monitoring/route-backups')
BEFORE = '@push path /send-push-notification'
AFTER = BEFORE + ' /monitoring-events'


def plan(target=TARGET):
    if target.is_symlink() or not target.is_file():
        raise ValueError('unsafe_route_file')
    original = target.read_bytes()
    text = original.decode()
    if text.count(BEFORE) != 1 or AFTER in text:
        raise ValueError('route_requires_review')
    updated = text.replace(BEFORE, AFTER, 1).encode()
    return {'target': str(target), 'before': hashlib.sha256(original).hexdigest(),
            'after': hashlib.sha256(updated).hexdigest(), 'added_slug': 'monitoring-events',
            'jwt_checks_unchanged': True, 'activation': 'restart_kws-api-internal'}, original, updated


def restart(runner):
    runner(['docker', 'restart', '--time', '10', 'kws-api-internal'], check=True, capture_output=True, timeout=40)
    state = runner(['docker', 'inspect', '--format', '{{json .State}}', 'kws-api-internal'], check=True, capture_output=True, text=True, timeout=15)
    if not json.loads(state.stdout).get('Running'):
        raise ValueError('api_not_running')


def execute(reviewed, original, updated, runner=subprocess.run):
    if os.name == 'nt' or os.geteuid() != 0 or socket.gethostname().split('.')[0] != 'srv2044594':
        raise ValueError('wrong_operator')
    if TARGET.read_bytes() != original:
        raise ValueError('route_changed')
    inspect = runner(['docker', 'inspect', 'kws-api-internal'], capture_output=True, text=True, check=True, timeout=15)
    mounts = json.loads(inspect.stdout)[0]['Mounts']
    if not any(mount['Source'] == str(TARGET) and mount['Destination'] == '/etc/caddy/Caddyfile' for mount in mounts):
        raise ValueError('route_mount_changed')
    backup = BACKUPS / datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    backup.mkdir(mode=0o700, parents=True)
    (backup / 'Caddyfile').write_bytes(original)
    (backup / 'Caddyfile').chmod(0o600)
    restart_attempted = False
    try:
        with TARGET.open('r+b') as output:
            output.write(updated); output.truncate(); output.flush(); os.fsync(output.fileno())
        runner(['docker', 'exec', 'kws-api-internal', 'caddy', 'validate', '--config', '/etc/caddy/Caddyfile', '--adapter', 'caddyfile'], check=True, capture_output=True, timeout=20)
        restart_attempted = True
        restart(runner)
    except BaseException:
        with TARGET.open('r+b') as output:
            output.write(original); output.truncate(); output.flush(); os.fsync(output.fileno())
        if restart_attempted:
            restart(runner)
        raise
    receipt = Path('/opt/kws/monitoring/route-installation.json')
    receipt.write_text(json.dumps({**reviewed, 'backup': str(backup), 'applied': True}) + '\n')
    receipt.chmod(0o600)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--execute', action='store_true')
    parser.add_argument('--approved-plan-sha256')
    args = parser.parse_args()
    reviewed, original, updated = plan()
    checksum = hashlib.sha256(json.dumps(reviewed, sort_keys=True).encode()).hexdigest()
    if args.execute:
        if args.approved_plan_sha256 != checksum:
            raise ValueError('reviewed_plan_required')
        execute(reviewed, original, updated)
    print(json.dumps({'status': 'installed' if args.execute else 'dry_run', 'plan': reviewed, 'plan_sha256': checksum}))
