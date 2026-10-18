"""Explicit operator-only end-to-end proof before enabling a monitored webbuild."""
import argparse
import json
import os
from pathlib import Path
import re
import socket
import subprocess
import urllib.error
import urllib.request
import uuid

from common import MAX_RESPONSE, MonitoringError, NoRedirect, ROOT, activation_valid, atomic_json, config_digest, digest, log_status, now, private_json
from edge_install import FILES, FUNCTIONS, file_digest


INGEST_URL = 'https://beta-api.kletterwelt-sauerland.de/functions/v1/monitoring-events'
SCHEMA_SIGNATURE_SQL = """SELECT md5(coalesce(string_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' || E'\\n' || pg_get_functiondef(p.oid), E'\\n' ORDER BY p.proname, pg_get_function_identity_arguments(p.oid)),'')) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND (p.proname LIKE 'kws_monitoring_%' OR p.proname = 'kws_ingest_monitoring_events')"""


def sql_value(query, runner=subprocess.run):
    statement = "BEGIN READ ONLY; SET LOCAL statement_timeout = '15s'; " + query.rstrip(';') + '; COMMIT;'
    result = runner(['docker', 'exec', '-i', 'supabase-db', 'psql', '-X', '-qAt', '-U', 'postgres',
                     '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-f', '-'],
                    input=statement, text=True, capture_output=True, timeout=25)
    if result.returncode:
        raise MonitoringError('verification_database_failed')
    value = result.stdout.strip()
    if not value or '\n' in value or len(value) > MAX_RESPONSE:
        raise MonitoringError('verification_database_response_invalid')
    return value


def plan(migration, root=ROOT, functions=FUNCTIONS):
    config = private_json(Path(root) / 'config.json')
    if not activation_valid(config, root):
        raise MonitoringError('reviewed_activation_required')
    receipt = private_json(Path(root) / 'edge-installation.json')
    if (receipt.get('runtime_mount_verified') is not True or receipt.get('handler_hashes_verified') is not True
            or receipt.get('functions_restarted') is not True or set(receipt.get('files', {})) != set(FILES)):
        raise MonitoringError('reviewed_edge_installation_required')
    hashes = {filename: file_digest(Path(functions) / filename, True) for filename in FILES}
    if hashes != receipt['files']:
        raise MonitoringError('installed_handler_changed')
    return {
        'version': 1, 'target_hostname': 'srv2044594', 'ingest_url': INGEST_URL,
        'config_sha256': config_digest(config), 'migration_sha256': file_digest(migration, True),
        'files': hashes, 'test_channel': 'test', 'test_excluded': True,
        'test_event': 'app_error', 'emails_sent': 0, 'pushes_sent': 0,
    }


def public_key(path):
    path = Path(path)
    if path.is_symlink() or not path.is_file() or path.stat().st_size > MAX_RESPONSE:
        raise MonitoringError('runtime_configuration_invalid')
    values = dict(line.split('=', 1) for line in path.read_text().splitlines() if '=' in line and not line.startswith('#'))
    value = values.get('ANON_KEY')
    if not value or any(character.isspace() for character in value):
        raise MonitoringError('anonymous_ingest_key_missing')
    return value


def submit(event, anon_key, opener=None):
    request = urllib.request.Request(INGEST_URL, data=json.dumps({'events': [event]}).encode(), headers={
        'Authorization': 'Bearer ' + anon_key, 'apikey': anon_key, 'Content-Type': 'application/json',
        'User-Agent': 'KWS-Monitoring-Verification/1',
    }, method='POST')
    try:
        with (opener or urllib.request.build_opener(NoRedirect())).open(request, timeout=25) as response:
            content = response.read(65537)
            if len(content) > 65536:
                raise MonitoringError('verification_response_too_large')
            result = json.loads(content)
    except urllib.error.HTTPError as error:
        error.close()
        raise MonitoringError('verification_http_failed') from None
    except (urllib.error.URLError, OSError, ValueError):
        raise MonitoringError('verification_ingest_unreachable') from None
    if not isinstance(result, dict) or result.get('accepted_ids') != [event['event_id']] or result.get('rejected_ids') != []:
        raise MonitoringError('verification_not_acknowledged')


def verification_query(event):
    event_id = str(uuid.UUID(event['event_id']))
    installation_id = str(uuid.UUID(event['installation_id']))
    session_id = str(uuid.UUID(event['session_id']))
    return """SELECT jsonb_build_object(
      'event_count',count(*),
      'excluded_count',count(*) FILTER (WHERE event.excluded AND event.channel = 'test' AND event.consent = 'denied' AND event.name = 'app_error' AND event.user_id IS NULL),
      'installation_excluded',coalesce(bool_and(installation.excluded),false),
      'session_excluded',coalesce(bool_and(session.excluded),false),
      'alert_count',(SELECT count(*) FROM public.monitoring_alert_queue queue WHERE queue.fingerprint IN (SELECT fingerprint FROM public.monitoring_events WHERE event_id = '%s'::uuid)))
      FROM public.monitoring_events event JOIN public.monitoring_installations installation ON installation.id = event.installation_id
      JOIN public.monitoring_sessions session ON session.id = event.session_id
      WHERE event.event_id = '%s'::uuid AND event.installation_id = '%s'::uuid AND event.session_id = '%s'::uuid""" % (event_id, event_id, installation_id, session_id)


def verify(reviewed_plan, anon_key, submitter=submit, query=sql_value):
    before = query(SCHEMA_SIGNATURE_SQL)
    if not re.fullmatch(r'[0-9a-f]{32}', before) or before == 'd41d8cd98f00b204e9800998ecf8427e':
        raise MonitoringError('verification_schema_signature_invalid')
    event = {
        'event_id': str(uuid.uuid4()), 'installation_id': str(uuid.uuid4()), 'session_id': str(uuid.uuid4()),
        'name': 'app_error', 'occurred_at': now(), 'platform': 'web', 'app_version': '1.0.0',
        'release': 'kws-beta-app@verification+' + reviewed_plan['migration_sha256'][:12],
        'channel': 'test', 'consent': 'denied', 'boulder_id': None,
        'props': {'code': 'MONITORING_GATE_VERIFICATION', 'severity': 'fatal', 'message': 'Controlled operator ingestion verification'},
    }
    submitter(event, anon_key)
    submitter(event, anon_key)
    try:
        proof = json.loads(query(verification_query(event)))
    except ValueError:
        raise MonitoringError('verification_storage_proof_invalid') from None
    if (proof.get('event_count') != 1 or proof.get('excluded_count') != 1 or proof.get('installation_excluded') is not True
            or proof.get('session_excluded') is not True or proof.get('alert_count') != 0):
        raise MonitoringError('verification_storage_proof_failed')
    after = query(SCHEMA_SIGNATURE_SQL)
    if before != after:
        raise MonitoringError('verification_schema_changed')
    return {
        **reviewed_plan, 'verified_at': now(), 'ingest_verified': True, 'idempotency_verified': True,
        'event_id': event['event_id'], 'database_signature': after, 'native_crashes_verified': False,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--migration', type=Path, required=True)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    reviewed_plan = plan(args.migration, args.root)
    if not args.apply:
        log_status('verify_installation', 'dry_run', plan=reviewed_plan, network_requests=0, database_changed=False)
        return
    if os.name == 'nt' or os.geteuid() != 0 or socket.gethostname().split('.')[0] != 'srv2044594':
        raise MonitoringError('wrong_verification_host_or_operator')
    anon_key = public_key('/opt/kws/supabase/runtime/.env')
    proof = verify(reviewed_plan, anon_key)
    if plan(args.migration, args.root) != reviewed_plan:
        raise MonitoringError('verification_inputs_changed')
    atomic_json(args.root / 'ingest-verification.json', proof)
    log_status('verify_installation', 'verified', idempotency_verified=True, excluded_test=True, emails_sent=0, pushes_sent=0)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        log_status('verify_installation', 'error', code=error.code if isinstance(error, MonitoringError) else 'verification_failed')
        raise SystemExit(1)
