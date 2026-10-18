"""Import reviewed daily aggregate CSV snapshots, never infer store downloads."""
import argparse
import csv
import datetime
import io
from pathlib import Path
import re
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from common import Database, MonitoringError, ROOT, STATE, activation_valid, atomic_json, config_digest, digest, log_status, private_json, safe_integer


FIELDS = {'source', 'metric', 'metric_date', 'value', 'source_timezone', 'app_identifier', 'channel', 'period_kind'}
DEFINITIONS = {
    ('app_store', 'first_time_downloads'): 'Apple ID-based first-time App Store downloads; excludes redownloads, updates and TestFlight.',
    ('app_store', 'redownloads'): 'Subsequent App Store downloads by an Apple ID; not first-time downloads or people.',
    ('google_play', 'new_users'): 'Google Play first-time user acquisition, using the official New users definition; not install events.',
    ('google_play', 'new_devices'): 'Google Play first-time device acquisition, using the official New devices definition; not people.',
    ('google_play', 'install_events'): 'Google Play installation events including repeat installations; not new users or new devices.',
    ('testflight', 'installations'): 'TestFlight device installations within this exact daily reporting period; not App Store downloads.',
    ('testflight', 'sessions'): 'TestFlight sessions within this exact daily reporting period; not the rolling seven-day build total.',
    ('testflight', 'crashes'): 'TestFlight crashes within this exact daily reporting period; not a cumulative build total.',
}


def parse_csv(content):
    if not content or len(content) > 1024 * 1024:
        raise MonitoringError('store_csv_size_invalid')
    try:
        text = content.decode('utf-8-sig')
    except UnicodeDecodeError:
        raise MonitoringError('store_csv_utf8_required') from None
    reader = csv.DictReader(io.StringIO(text), strict=True)
    if reader.fieldnames is None or set(reader.fieldnames) != FIELDS or len(reader.fieldnames) != len(FIELDS):
        raise MonitoringError('store_csv_schema_invalid')
    rows = []
    keys = set()
    try:
        for row in reader:
            if len(rows) >= 500 or None in row or any(value is None for value in row.values()):
                raise MonitoringError('store_csv_rows_invalid')
            source, metric = row['source'], row['metric']
            if (source, metric) not in DEFINITIONS or row['channel'] != source:
                raise MonitoringError('store_metric_unsupported')
            if row['period_kind'] != 'daily':
                raise MonitoringError('store_daily_period_required')
            app_id = row['app_identifier']
            if not re.fullmatch(r'[A-Za-z0-9._-]{1,200}', app_id):
                raise MonitoringError('store_app_identifier_invalid')
            try:
                date = datetime.date.fromisoformat(row['metric_date'])
                timezone = ZoneInfo(row['source_timezone'])
            except (ValueError, ZoneInfoNotFoundError):
                raise MonitoringError('store_date_or_timezone_invalid') from None
            if date.isoformat() != row['metric_date'] or date > datetime.datetime.now(datetime.timezone.utc).date():
                raise MonitoringError('store_date_invalid')
            start = datetime.datetime.combine(date, datetime.time(), timezone)
            end = datetime.datetime.combine(date + datetime.timedelta(days=1), datetime.time(), timezone)
            key = (source, metric, app_id, date.isoformat(), row['source_timezone'])
            if key in keys:
                raise MonitoringError('store_duplicate_daily_total')
            keys.add(key)
            rows.append({
                'source': source, 'metric': metric, 'definition': DEFINITIONS[(source, metric)],
                'metric_date': date.isoformat(), 'value': safe_integer(row['value']),
                'source_period_start': start.isoformat(), 'source_period_end': end.isoformat(),
                'source_timezone': row['source_timezone'], 'app_identifier': app_id,
                'channel': row['channel'], 'source_revision': digest(content),
            })
    except csv.Error:
        raise MonitoringError('store_csv_invalid') from None
    if not rows:
        raise MonitoringError('store_csv_empty')
    return rows


def snapshots(directory):
    directory = Path(directory)
    if directory.is_symlink() or not directory.is_dir():
        raise MonitoringError('store_input_directory_invalid')
    files = sorted(directory.glob('*.csv'))
    if len(files) > 31:
        raise MonitoringError('store_input_file_limit')
    combined = {}
    for path in files:
        if path.is_symlink() or path.stat().st_size > 1024 * 1024:
            raise MonitoringError('store_input_file_invalid')
        for row in parse_csv(path.read_bytes()):
            key = (row['source'], row['metric'], row['app_identifier'], row['metric_date'])
            if key in combined:
                raise MonitoringError('store_overlapping_snapshots')
            combined[key] = row
            if len(combined) > 500:
                raise MonitoringError('store_batch_limit')
    return list(combined.values())


def run(config, database, directory=None, state_path=None):
    stores = config.get('stores', {})
    if stores.get('enabled') is not True:
        database.source('stores', 'not_connected', 'official_exports_not_connected')
        return log_status('stores', 'not_connected', provider_requests=0)
    if stores.get('adapter') != 'reviewed_daily_csv':
        database.source('stores', 'unsupported', 'store_api_adapter_not_implemented')
        return log_status('stores', 'unsupported', provider_requests=0)
    try:
        metrics = snapshots(directory or stores.get('input_directory', ROOT / 'store-reports'))
        if not metrics:
            database.source('stores', 'not_connected', 'no_reviewed_reports')
            return log_status('stores', 'not_connected', imported=0)
        checksum = config_digest(metrics)
        previous = private_json(state_path, required=False) if state_path else None
        if previous and previous.get('batch_sha256') == checksum:
            return log_status('stores', 'unchanged', imported=0, last_period_end=previous.get('last_period_end'), provider_requests=0)
        database.call('kws_monitoring_import_store_metrics', p_metrics=metrics)
        last_end = max(datetime.datetime.fromisoformat(row['source_period_end']) for row in metrics)
        delayed = last_end < datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=72)
        status = 'partial' if delayed else 'connected'
        database.source('stores', status, 'source_period_delayed' if delayed else 'reviewed_daily_csv', metric_count=len(metrics))
        if state_path:
            atomic_json(state_path, {'batch_sha256': checksum, 'last_period_end': last_end.isoformat()})
        return log_status('stores', status, imported=len(metrics), adapter='reviewed_daily_csv', provider_requests=0,
                          last_period_end=last_end.isoformat())
    except MonitoringError as error:
        database.source('stores', 'error', error.code)
        raise


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--file', type=Path)
    parser.add_argument('--state', type=Path, default=STATE)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    if args.file:
        if args.apply:
            raise MonitoringError('single_file_is_validation_only')
        if args.file.is_symlink() or args.file.stat().st_size > 1024 * 1024:
            raise MonitoringError('store_input_file_invalid')
        rows = parse_csv(args.file.read_bytes())
        log_status('stores', 'dry_run', valid_rows=len(rows), sources=sorted({row['source'] for row in rows}),
                   database_changed=False, file_sha256=digest(args.file.read_bytes()))
        return
    config = private_json(args.root / 'config.json')
    if not args.apply:
        rows = snapshots(config.get('stores', {}).get('input_directory', args.root / 'store-reports')) if config.get('stores', {}).get('enabled') else []
        log_status('stores', 'dry_run', valid_rows=len(rows), database_changed=False, provider_requests=0)
        return
    if not activation_valid(config, args.root):
        raise MonitoringError('reviewed_activation_required')
    args.state.mkdir(mode=0o700, parents=True, exist_ok=True)
    run(config, Database(), state_path=args.state / 'stores.json')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        log_status('stores', 'error', code=error.code if isinstance(error, MonitoringError) else 'worker_failed')
        raise SystemExit(1)
