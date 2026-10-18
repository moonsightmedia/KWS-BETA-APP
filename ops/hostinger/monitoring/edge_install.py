"""Review and install only the two monitoring-related Edge function handlers."""
import argparse
import datetime
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess

from common import MonitoringError, ROOT, atomic_json, config_digest, digest, log_status, now


FUNCTIONS = Path('/opt/kws/supabase/runtime/volumes/functions')
FILES = ('monitoring-events/handler.ts', 'monitoring-events/index.ts',
         'send-push-notification/handler.ts', 'send-push-notification/index.ts')


def file_digest(path, required=False):
    path = Path(path)
    if path.is_symlink() or path.parent.is_symlink():
        raise MonitoringError('unsafe_handler_path')
    if not path.exists() and not required:
        return None
    if not path.is_file() or path.stat().st_size > 1024 * 1024:
        raise MonitoringError('handler_file_invalid')
    return digest(path.read_bytes())


def plan(source, restart=False, target=FUNCTIONS):
    if Path(source).is_symlink() or Path(target).is_symlink():
        raise MonitoringError('unsafe_handler_directory')
    result = {'target_hostname': 'srv2044594', 'target_directory': str(target),
              'container': 'supabase-edge-functions', 'restart_functions': restart,
              'files': {filename: {'before': file_digest(Path(target) / filename),
                                   'after': file_digest(Path(source) / filename, True)} for filename in FILES},
              'database_changed': False, 'provider_requests': 0}
    return result, config_digest(result)


def execute(source, reviewed_plan):
    if os.name == 'nt' or os.geteuid() != 0 or socket.gethostname().split('.')[0] != 'srv2044594':
        raise MonitoringError('wrong_installation_host_or_operator')
    inspected = subprocess.run(['docker', 'inspect', 'supabase-edge-functions'], capture_output=True,
                               check=True, text=True, timeout=15)
    mounts = json.loads(inspected.stdout)[0]['Mounts']
    if not any(mount['Source'] == str(FUNCTIONS) and mount['Destination'] == '/home/deno/functions' for mount in mounts):
        raise MonitoringError('edge_runtime_mount_changed')
    current, checksum = plan(source, reviewed_plan['restart_functions'])
    if current != reviewed_plan:
        raise MonitoringError('edge_installation_inputs_changed')
    if not (FUNCTIONS / 'main' / 'index.ts').is_file():
        raise MonitoringError('edge_dispatcher_missing')
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    backup = ROOT / 'edge-backups' / stamp
    backup.mkdir(mode=0o700, parents=True)
    for filename, identity in reviewed_plan['files'].items():
        target = FUNCTIONS / filename
        if identity['before']:
            previous = backup / filename
            previous.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
            shutil.copyfile(target, previous)
            previous.chmod(0o600)
    atomic_json(backup / 'plan.json', reviewed_plan)
    for filename in FILES:
        target = FUNCTIONS / filename
        target.parent.mkdir(mode=0o755, exist_ok=True)
        temporary = target.with_name(target.name + '.monitoring-pending')
        if temporary.exists() or temporary.is_symlink():
            raise MonitoringError('pending_edge_file_exists')
        with temporary.open('xb') as output:
            output.write((Path(source) / filename).read_bytes())
            output.flush()
            os.fsync(output.fileno())
        temporary.chmod(0o644)
        os.replace(temporary, target)
        if file_digest(target, True) != reviewed_plan['files'][filename]['after']:
            raise MonitoringError('installed_edge_digest_mismatch')
    if reviewed_plan['restart_functions']:
        subprocess.run(['docker', 'restart', 'supabase-edge-functions'], capture_output=True, check=True, timeout=60)
    atomic_json(ROOT / 'edge-installation.json', {
        'installed_at': now(), 'files': {filename: identity['after'] for filename, identity in reviewed_plan['files'].items()},
        'plan_sha256': config_digest(reviewed_plan), 'runtime_mount_verified': True, 'handler_hashes_verified': True,
        'functions_restarted': reviewed_plan['restart_functions'], 'ingest_verified': False, 'native_crashes_verified': False,
    })
    log_status('edge_install', 'installed', functions_restarted=reviewed_plan['restart_functions'],
               backup_directory=str(backup), provider_requests=0)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--restart-functions', action='store_true')
    parser.add_argument('--execute', action='store_true')
    parser.add_argument('--approved-plan-sha256')
    args = parser.parse_args()
    reviewed_plan, checksum = plan(args.source, args.restart_functions)
    if not args.execute:
        print(json.dumps({'status': 'dry_run', 'plan_sha256': checksum, 'plan': reviewed_plan}, sort_keys=True))
        return
    if args.approved_plan_sha256 != checksum:
        raise MonitoringError('reviewed_plan_digest_required')
    execute(args.source, reviewed_plan)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        log_status('edge_install', 'error', code=error.code if isinstance(error, MonitoringError) else 'installation_failed')
        raise SystemExit(1)
