"""Apply the reviewed database retention policy and bound the local send ledger."""
import argparse
import datetime
from pathlib import Path

from common import Database, MonitoringError, ROOT, STATE, activation_valid, log_status, private_json
from alert_worker import Ledger


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--state', type=Path, default=STATE)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    config = private_json(args.root / 'config.json')
    if not args.apply:
        log_status('retention', 'dry_run', database_changed=False, state_changed=False)
        return
    if not activation_valid(config, args.root):
        raise MonitoringError('reviewed_activation_required')
    result = Database().call('kws_monitoring_retain')
    path = args.state / 'alerts.sqlite3'
    if path.exists():
        ledger = Ledger(path)
        try:
            cutoff = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=100)).isoformat()
            ledger.connection.execute('DELETE FROM attempts WHERE updated_at < ?', (cutoff,))
            ledger.connection.commit()
        finally:
            ledger.close()
    log_status('retention', 'complete', policy_applied=True)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        log_status('retention', 'error', code=error.code if isinstance(error, MonitoringError) else 'worker_failed')
        raise SystemExit(1)
