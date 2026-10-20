"""Upgrade only a reviewed operator; preserve the deployment lock and rollback."""
import argparse
import ast
import datetime
import hashlib
import json
import os
from pathlib import Path
import socket

ROOT = Path('/opt/kws/github-web-autodeploy')

def digest(raw):
    return hashlib.sha256(raw).hexdigest()

def upgrade(root, candidate, expected_before, expected_candidate):
    target, config_path = root / 'update-production-web.py', root / 'config.json'
    for path in (root, target, config_path, candidate):
        if path.is_symlink(): raise ValueError('Linked operator path refused')
    original, config_raw, updated = target.read_bytes(), config_path.read_bytes(), candidate.read_bytes()
    config = json.loads(config_raw)
    if digest(original) != expected_before or config.get('operator_sha256') != expected_before or digest(updated) != expected_candidate:
        raise ValueError('Operator differs from reviewed hashes')
    ast.parse(updated)
    backup = root / 'operator-backups' / datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    backup.mkdir(parents=True, mode=0o700)
    for name, raw in (('update-production-web.py', original), ('config.json', config_raw)):
        path = backup / name; path.write_bytes(raw); path.chmod(0o600)
    try:
        target.write_bytes(updated); target.chmod(0o700)
        config['operator_sha256'] = expected_candidate
        config_path.write_text(json.dumps(config) + '\n'); config_path.chmod(0o600)
        if digest(target.read_bytes()) != json.loads(config_path.read_text())['operator_sha256']:
            raise RuntimeError('Installed operator verification failed')
    except BaseException:
        target.write_bytes(original); target.chmod(0o700)
        config_path.write_bytes(config_raw); config_path.chmod(0o600)
        raise
    return {'before': expected_before, 'after': expected_candidate, 'rollback': str(backup)}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--candidate', type=Path, required=True)
    parser.add_argument('--expected-installed-sha256', required=True)
    parser.add_argument('--candidate-sha256', required=True)
    parser.add_argument('--expected-live-revision', required=True)
    parser.add_argument('--execute', action='store_true')
    args = parser.parse_args()
    assert os.geteuid() == 0 and socket.gethostname().split('.')[0] == 'srv2044594'
    assert json.loads(Path('/opt/kws/web-production/SOURCE.json').read_text())['revision'] == args.expected_live_revision
    if not args.execute:
        print(json.dumps({'candidate_sha256': digest(args.candidate.read_bytes()), 'installed_sha256': digest((ROOT / 'update-production-web.py').read_bytes()), 'applied': False})); return
    import fcntl
    with Path('/run/lock/kws-web-autodeploy.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        assert json.loads(Path('/opt/kws/web-production/SOURCE.json').read_text())['revision'] == args.expected_live_revision
        print(json.dumps(upgrade(ROOT, args.candidate, args.expected_installed_sha256, args.candidate_sha256)))

if __name__ == '__main__':
    main()
