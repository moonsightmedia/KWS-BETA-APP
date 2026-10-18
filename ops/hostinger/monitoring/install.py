"""Preview a hash-bound installation; activation requires the exact reviewed plan."""
import argparse
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import urllib.parse

from common import MonitoringError, ROOT, STATE, WORKER_FILES, atomic_json, config_digest, digest, log_status, now, private_json
from alert_worker import email_address
from sentry_importer import settings as sentry_settings


PYTHON_FILES = WORKER_FILES
UNIT_FILES = ('kws-monitoring-alerts.service', 'kws-monitoring-alerts.timer',
              'kws-monitoring-sentry.service', 'kws-monitoring-sentry.timer',
              'kws-monitoring-stores.service', 'kws-monitoring-stores.timer',
              'kws-monitoring-maintenance.service', 'kws-monitoring-maintenance.timer')
HOSTNAME = 'srv2044594'


def validate_config(config):
    allowed = {'version', 'collection_enabled', 'client', 'alert_mode', 'alert_recipient', 'smtp_runtime_path', 'sentry', 'stores'}
    if set(config) - allowed or config.get('version') != 1:
        raise MonitoringError('configuration_schema_invalid')
    if not isinstance(config.get('collection_enabled'), bool):
        raise MonitoringError('collection_configuration_invalid')
    client = config.get('client', {})
    if not isinstance(client, dict) or set(client) - {'sentry_dsn', 'sentry_org_url'}:
        raise MonitoringError('client_configuration_invalid')
    if client.get('sentry_dsn'):
        dsn = urllib.parse.urlsplit(client['sentry_dsn'])
        if (dsn.scheme != 'https' or not dsn.hostname or not dsn.hostname.endswith('.ingest.sentry.io')
                and not dsn.hostname.endswith('.ingest.us.sentry.io') and not dsn.hostname.endswith('.ingest.de.sentry.io')
                or not dsn.username or dsn.password or not dsn.path.strip('/').isdigit() or dsn.query or dsn.fragment):
            raise MonitoringError('client_sentry_dsn_invalid')
    if client.get('sentry_org_url'):
        url = urllib.parse.urlsplit(client['sentry_org_url'])
        if (url.scheme != 'https' or not url.hostname or not (url.hostname == 'sentry.io' or url.hostname.endswith('.sentry.io'))
                or url.username or url.password or url.query or url.fragment):
            raise MonitoringError('client_sentry_url_invalid')
    mode = config.get('alert_mode')
    if mode not in ('disabled', 'shadow', 'live'):
        raise MonitoringError('alert_mode_invalid')
    recipient = config.get('alert_recipient')
    if recipient:
        email_address(recipient)
    if mode == 'live' and not recipient:
        raise MonitoringError('authorized_recipient_required')
    if config.get('smtp_runtime_path') != '/opt/kws/integrations/runtime.json':
        raise MonitoringError('smtp_runtime_path_invalid')
    sentry = config.get('sentry', {})
    if set(sentry) - {'enabled', 'origin', 'organization', 'projects'} or not isinstance(sentry.get('enabled'), bool):
        raise MonitoringError('sentry_configuration_invalid')
    if sentry.get('enabled'):
        sentry_settings(config)
    stores = config.get('stores', {})
    if set(stores) - {'enabled', 'adapter', 'input_directory'} or not isinstance(stores.get('enabled'), bool):
        raise MonitoringError('store_configuration_invalid')
    if stores.get('adapter') != 'reviewed_daily_csv' or stores.get('input_directory') != '/opt/kws/monitoring/store-reports':
        raise MonitoringError('store_configuration_invalid')


def plan(directory, config, start_jobs=False, allow_live_alerts=False, reconfigure=False):
    validate_config(config)
    artifacts = {}
    for filename in PYTHON_FILES + UNIT_FILES:
        path = Path(directory) / filename
        if path.is_symlink() or not path.is_file() or path.stat().st_size > 1024 * 1024:
            raise MonitoringError('installation_input_invalid')
        artifacts[filename] = digest(path.read_bytes())
    if config.get('alert_mode') == 'live' and not allow_live_alerts:
        raise MonitoringError('explicit_live_alert_authorization_required')
    receipt = {
        'version': 1, 'target_hostname': HOSTNAME, 'install_path': str(ROOT),
        'state_path': str(STATE), 'config_sha256': config_digest(config),
        'artifacts': artifacts, 'start_jobs': start_jobs,
        'alert_mode': config['alert_mode'],
        'recipient_sha256': digest(config['alert_recipient'].lower().encode()) if config.get('alert_recipient') else None,
        'smtp_accepted_is_not_delivered': True,
        'provider_mutations': False, 'database_schema_changed': False,
        'reconfigure': reconfigure,
        'prior_activation_sha256': digest((ROOT / 'activation.json').read_bytes()) if reconfigure and (ROOT / 'activation.json').is_file() else None,
    }
    return receipt, config_digest(receipt)


def execute(directory, config, reviewed_plan):
    if os.name == 'nt' or os.geteuid() != 0 or socket.gethostname().split('.')[0] != HOSTNAME:
        raise MonitoringError('wrong_installation_host_or_operator')
    for path in (ROOT, STATE):
        if path.is_symlink():
            raise MonitoringError('unsafe_installation_path')
        path.mkdir(mode=0o700, parents=True, exist_ok=True)
        path.chmod(0o700)
    existing = ROOT / 'activation.json'
    reconfigure = reviewed_plan.get('reconfigure') is True
    if existing.exists() and not reconfigure:
        raise MonitoringError('existing_installation_requires_explicit_upgrade_review')
    if reconfigure:
        if not existing.is_file() or existing.is_symlink() or digest(existing.read_bytes()) != reviewed_plan['prior_activation_sha256']:
            raise MonitoringError('reviewed_prior_activation_required')
        previous = private_json(existing)
        if previous.get('config_sha256') != config_digest(private_json(ROOT / 'config.json')):
            raise MonitoringError('installed_configuration_changed')
        if previous.get('artifacts') != {filename: reviewed_plan['artifacts'][filename] for filename in PYTHON_FILES}:
            raise MonitoringError('reconfiguration_cannot_upgrade_worker_code')
    for filename in PYTHON_FILES + UNIT_FILES:
        if digest((directory / filename).read_bytes()) != reviewed_plan['artifacts'][filename]:
            raise MonitoringError('installation_input_changed')
    subprocess.run(['systemd-analyze', 'verify', *[str(directory / filename) for filename in UNIT_FILES]],
                   check=True, capture_output=True, timeout=20)
    for filename in PYTHON_FILES:
        target = ROOT / filename
        if target.exists() and not reconfigure:
            raise MonitoringError('installation_target_exists')
        if reconfigure and (target.is_symlink() or not target.is_file() or digest(target.read_bytes()) != reviewed_plan['artifacts'][filename]):
            raise MonitoringError('installed_worker_changed')
    for filename in UNIT_FILES:
        target = Path('/etc/systemd/system') / filename
        if target.exists() and not reconfigure:
            raise MonitoringError('installation_unit_exists')
        if reconfigure and (target.is_symlink() or not target.is_file() or digest(target.read_bytes()) != reviewed_plan['artifacts'][filename]):
            raise MonitoringError('installed_unit_changed')
    if reconfigure:
        stamp = socket.gethostname() + '-' + now().replace(':', '').replace('+', '')
        backup = ROOT / ('config-before-' + stamp)
        backup.mkdir(mode=0o700)
        for filename in ('config.json', 'activation.json'):
            source = ROOT / filename
            if source.is_symlink():
                raise MonitoringError('unsafe_configuration_file')
            shutil.copyfile(source, backup / filename)
            (backup / filename).chmod(0o600)
        subprocess.run(['systemctl', 'stop', *UNIT_FILES],
                       check=True, capture_output=True, timeout=20)
    for filename in PYTHON_FILES:
        target = ROOT / filename
        shutil.copyfile(directory / filename, target)
        target.chmod(0o700)
    for filename in UNIT_FILES:
        target = Path('/etc/systemd/system') / filename
        shutil.copyfile(directory / filename, target)
        target.chmod(0o644)
    (ROOT / 'store-reports').mkdir(mode=0o700, exist_ok=True)
    atomic_json(ROOT / 'config.json', config)
    atomic_json(existing, {
        'allow_jobs': True, 'config_sha256': config_digest(config), 'approved_at': now(),
        'artifacts': {filename: reviewed_plan['artifacts'][filename] for filename in PYTHON_FILES},
    })
    subprocess.run(['systemctl', 'daemon-reload'], check=True, capture_output=True, timeout=20)
    if reviewed_plan['start_jobs']:
        subprocess.run(['systemctl', 'enable', '--now', *[filename for filename in UNIT_FILES if filename.endswith('.timer')]],
                       check=True, capture_output=True, timeout=20)
    return log_status('install', 'installed', alert_mode=config['alert_mode'], jobs_started=reviewed_plan['start_jobs'])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--directory', type=Path, default=Path(__file__).resolve().parent)
    parser.add_argument('--config', type=Path, required=True)
    parser.add_argument('--execute', action='store_true')
    parser.add_argument('--approved-plan-sha256')
    parser.add_argument('--start-jobs', action='store_true')
    parser.add_argument('--allow-live-alerts', action='store_true')
    parser.add_argument('--reconfigure', action='store_true')
    args = parser.parse_args()
    config = private_json(args.config)
    reviewed_plan, checksum = plan(args.directory, config, args.start_jobs, args.allow_live_alerts, args.reconfigure)
    if not args.execute:
        print(json.dumps({'status': 'dry_run', 'plan_sha256': checksum, 'plan': reviewed_plan}, sort_keys=True))
        return
    if args.approved_plan_sha256 != checksum:
        raise MonitoringError('reviewed_plan_digest_required')
    execute(args.directory, config, reviewed_plan)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        log_status('install', 'error', code=error.code if isinstance(error, MonitoringError) else 'installation_failed')
        raise SystemExit(1)
