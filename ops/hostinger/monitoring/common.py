"""Bounded, secret-safe helpers for the operator-only monitoring jobs."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import urllib.error
import urllib.parse
import urllib.request
import uuid


UTC = datetime.timezone.utc
MAX_RESPONSE = 4 * 1024 * 1024
ROOT = Path('/opt/kws/monitoring')
STATE = Path('/var/lib/kws-monitoring')
WORKER_FILES = ('common.py', 'alert_worker.py', 'sentry_importer.py', 'store_importer.py',
                'maintenance.py', 'install.py')


class MonitoringError(Exception):
    def __init__(self, code):
        self.code = code
        super().__init__(code)


def now():
    return datetime.datetime.now(UTC).isoformat()


def digest(value):
    return hashlib.sha256(value).hexdigest()


def private_json(path, required=True):
    path = Path(path)
    if not path.exists() and not required:
        return None
    if path.is_symlink() or not path.is_file() or path.stat().st_size > MAX_RESPONSE:
        raise MonitoringError('unsafe_configuration_file')
    if os.name != 'nt' and stat.S_IMODE(path.stat().st_mode) & 0o077:
        raise MonitoringError('configuration_permissions')
    try:
        value = json.loads(path.read_text(encoding='utf-8'))
    except (ValueError, OSError):
        raise MonitoringError('configuration_unreadable') from None
    if not isinstance(value, dict):
        raise MonitoringError('configuration_invalid')
    return value


def atomic_json(path, value):
    path = Path(path)
    if path.is_symlink() or path.parent.is_symlink():
        raise MonitoringError('unsafe_state_path')
    temporary = path.with_name(path.name + '.' + uuid.uuid4().hex + '.pending')
    descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        with os.fdopen(descriptor, 'w', encoding='utf-8') as output:
            output.write(json.dumps(value, sort_keys=True) + '\n')
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def log_status(job, status, **fields):
    value = {'job': job, 'status': status, 'observed_at': now(), **fields}
    print(json.dumps(value, sort_keys=True), flush=True)
    return value


def safe_integer(value, maximum=10**12):
    if isinstance(value, bool) or not re.fullmatch(r'\d{1,13}', str(value)):
        raise MonitoringError('invalid_count')
    result = int(value)
    if result > maximum:
        raise MonitoringError('invalid_count')
    return result


def timestamp(value):
    try:
        result = datetime.datetime.fromisoformat(str(value).replace('Z', '+00:00'))
    except ValueError:
        raise MonitoringError('invalid_timestamp') from None
    if result.tzinfo is None:
        raise MonitoringError('missing_timestamp_timezone')
    return result.isoformat()


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, file_pointer, code, message, headers, new_url):
        raise MonitoringError('provider_redirect_rejected')


def get_json(url, token, allowed_origin, opener=None):
    target = urllib.parse.urlsplit(url)
    origin = urllib.parse.urlsplit(allowed_origin)
    if (target.scheme, target.netloc) != (origin.scheme, origin.netloc) or target.scheme != 'https':
        raise MonitoringError('provider_origin_rejected')
    if target.username or target.password or target.fragment:
        raise MonitoringError('provider_url_rejected')
    request = urllib.request.Request(url, headers={
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/json',
        'User-Agent': 'KWS-Monitoring/1',
    }, method='GET')
    try:
        with (opener or urllib.request.build_opener(NoRedirect())).open(request, timeout=20) as response:
            data = response.read(MAX_RESPONSE + 1)
            if len(data) > MAX_RESPONSE:
                raise MonitoringError('provider_response_too_large')
            value = json.loads(data)
            return value, response.headers
    except urllib.error.HTTPError as error:
        code = error.code
        error.close()
        raise MonitoringError('provider_http_' + str(code)) from None
    except (urllib.error.URLError, TimeoutError, OSError):
        raise MonitoringError('provider_unreachable') from None
    except ValueError:
        raise MonitoringError('provider_json_invalid') from None


class Database:
    signatures = {
        'kws_monitoring_claim_alerts': [('p_limit', 'integer')],
        'kws_monitoring_complete_alert': [('p_id', 'uuid'), ('p_lease_token', 'uuid'), ('p_status', 'text'), ('p_code', 'text')],
        'kws_monitoring_import_sentry_issues': [('p_issues', 'jsonb')],
        'kws_monitoring_import_store_metrics': [('p_metrics', 'jsonb')],
        'kws_monitoring_update_source': [('p_source', 'text'), ('p_status', 'text'), ('p_code', 'text'), ('p_metadata', 'jsonb')],
        'kws_monitoring_retain': [],
    }

    def __init__(self, runner=subprocess.run):
        self.runner = runner

    def call(self, function, **parameters):
        if function not in self.signatures:
            raise MonitoringError('rpc_not_allowed')
        arguments = []
        for name, kind in self.signatures[function]:
            value = parameters.get(name)
            if value is None:
                literal = 'NULL'
            else:
                content = json.dumps(value, separators=(',', ':')) if kind == 'jsonb' else str(value)
                delimiter = '$kws_' + uuid.uuid4().hex + '$'
                literal = delimiter + content + delimiter + '::' + kind
            arguments.append(name + ' => ' + literal)
        query = ("BEGIN; SET LOCAL statement_timeout = '15s'; SET LOCAL ROLE service_role; "
                 "SELECT public." + function + '(' + ','.join(arguments) + '); COMMIT;')
        result = self.runner([
            'docker', 'exec', '-i', 'supabase-db', 'psql', '-X', '-qAt', '-U', 'postgres',
            '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-f', '-',
        ], input=query, text=True, capture_output=True, timeout=25)
        if result.returncode:
            raise MonitoringError('database_rpc_failed')
        lines = [line for line in result.stdout.splitlines() if line.strip()]
        if not lines:
            return None
        try:
            return json.loads(lines[-1])
        except ValueError:
            raise MonitoringError('database_response_invalid') from None

    def source(self, source, status, code=None, **metadata):
        return self.call('kws_monitoring_update_source', p_source=source, p_status=status,
                         p_code=code, p_metadata=metadata)


def config_digest(config):
    return digest(json.dumps(config, sort_keys=True, separators=(',', ':')).encode())


def activation_valid(config, root=ROOT):
    receipt = private_json(Path(root) / 'activation.json', required=False)
    if not receipt or receipt.get('config_sha256') != config_digest(config):
        return False
    files = receipt.get('artifacts', {})
    if not isinstance(files, dict) or set(files) != set(WORKER_FILES):
        return False
    for filename, expected in files.items():
        if not re.fullmatch(r'[a-z][a-z0-9_-]*\.py', filename):
            return False
        path = Path(root) / filename
        if path.is_symlink() or not path.is_file() or digest(path.read_bytes()) != expected:
            return False
    return receipt.get('allow_jobs') is True
