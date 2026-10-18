"""Deliver leased operator alerts once; SMTP acceptance is not delivery proof."""
import argparse
import datetime
from email.message import EmailMessage
import json
import os
from pathlib import Path
import re
import smtplib
import sqlite3
import ssl
import uuid

from common import Database, MonitoringError, ROOT, STATE, activation_valid, digest, log_status, now, private_json, safe_integer, timestamp


def email_address(value):
    if not isinstance(value, str) or not re.fullmatch(r'[A-Za-z0-9.!#$%&\'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}', value):
        raise MonitoringError('mail_address_invalid')
    return value


def message_for(alert, smtp_config, recipient):
    alert_id = str(uuid.UUID(str(alert['id'])))
    fingerprint = str(alert['fingerprint'])
    if not re.fullmatch(r'(?:[0-9a-f]{32}|sentry:[0-9]{1,30})', fingerprint):
        raise MonitoringError('alert_reference_invalid')
    severity = alert.get('severity') if alert.get('severity') in ('fatal', 'critical', 'error', 'warning') else 'error'
    count = safe_integer(alert.get('count', 0))
    affected = safe_integer(alert.get('affected_installations', 0))
    first_seen = timestamp(alert['first_seen_at'])
    last_seen = timestamp(alert['last_seen_at'])
    sender = email_address(smtp_config['sender'])
    message = EmailMessage()
    message['Subject'] = 'KWS Beta: ' + severity + ' – Problem ' + fingerprint
    message['From'] = sender
    message['To'] = email_address(recipient)
    message['Message-ID'] = '<kws-monitoring-' + alert_id + '@' + sender.split('@')[1] + '>'
    if smtp_config.get('reply_to'):
        message['Reply-To'] = email_address(smtp_config['reply_to'])
    affected_line = ('Betroffene erfasste App-Instanzen: ' + str(affected) + '\n') if alert.get('source') == 'app' else 'Quelle: Sentry; betroffene App-Instanzen nicht ableitbar.\n'
    message.set_content(
        'Ein gruppiertes Problem benötigt Prüfung.\n\n'
        'Schwere: ' + severity + '\n'
        'Vorkommnisse bei Erstellung des Alarms: ' + str(count) + '\n'
        + affected_line +
        'Erstmals: ' + first_seen + '\nZuletzt: ' + last_seen + '\n'
        'Problemreferenz: ' + fingerprint + '\n\n'
        'Geschützte Fehlerübersicht:\nhttps://beta.kletterwelt-sauerland.de/admin?tab=monitoring\n\n'
        'Die Problemreferenz kann in der Fehlerübersicht gesucht werden.\n'
        'Gleiche Probleme werden 30 Minuten gebündelt. Diese E-Mail enthält keine Nutzerdaten.\n')
    return message


class Ledger:
    def __init__(self, path):
        path = Path(path)
        if path.is_symlink() or path.parent.is_symlink():
            raise MonitoringError('unsafe_alert_ledger')
        self.connection = sqlite3.connect(path, timeout=1)
        if os.name != 'nt':
            path.chmod(0o600)
        self.connection.execute('PRAGMA synchronous=FULL')
        self.connection.execute('CREATE TABLE IF NOT EXISTS attempts (id TEXT PRIMARY KEY, status TEXT NOT NULL, code TEXT, updated_at TEXT NOT NULL)')
        self.connection.commit()

    def status(self, alert_id):
        row = self.connection.execute('SELECT status,code FROM attempts WHERE id=?', (alert_id,)).fetchone()
        return row if row else (None, None)

    def record(self, alert_id, status, code):
        self.connection.execute(
            'INSERT INTO attempts(id,status,code,updated_at) VALUES (?,?,?,?) '
            'ON CONFLICT(id) DO UPDATE SET status=excluded.status,code=excluded.code,updated_at=excluded.updated_at',
            (alert_id, status, code, now()))
        self.connection.commit()

    def close(self):
        self.connection.close()


def deliver(alert, smtp_config, recipient, ledger, smtp_factory=smtplib.SMTP_SSL):
    alert_id = str(uuid.UUID(str(alert['id'])))
    previous, code = ledger.status(alert_id)
    if previous in ('accepted', 'uncertain'):
        return previous, code
    if previous == 'sending':
        ledger.record(alert_id, 'uncertain', 'interrupted_during_send')
        return 'uncertain', 'interrupted_during_send'
    message = message_for(alert, smtp_config, recipient)
    port = safe_integer(smtp_config.get('smtp_port'), 65535)
    if port != 465:
        raise MonitoringError('smtp_implicit_tls_required')
    try:
        connection = smtp_factory(smtp_config['smtp_host'], port, timeout=20, context=ssl.create_default_context())
        try:
            connection.login(smtp_config['smtp_user'], smtp_config['smtp_password'])
        except BaseException:
            connection.close()
            raise
    except (smtplib.SMTPException, OSError):
        ledger.record(alert_id, 'failed', 'smtp_connection_or_auth_failed')
        return 'failed', 'smtp_connection_or_auth_failed'
    ledger.record(alert_id, 'sending', 'smtp_sending')
    try:
        refused = connection.send_message(message)
        if refused:
            status, code = 'failed', 'smtp_recipient_rejected'
        else:
            status, code = 'accepted', 'smtp_accepted'
    except (smtplib.SMTPDataError, smtplib.SMTPRecipientsRefused, smtplib.SMTPSenderRefused):
        status, code = 'failed', 'smtp_rejected'
    except (smtplib.SMTPException, OSError):
        status, code = 'uncertain', 'smtp_acceptance_uncertain'
    finally:
        connection.close()
    ledger.record(alert_id, status, code)
    return status, code


def run(config, database, ledger, smtp_config, smtp_factory=smtplib.SMTP_SSL):
    recipient = email_address(config.get('alert_recipient'))
    alerts = database.call('kws_monitoring_claim_alerts', p_limit=1)
    if not isinstance(alerts, list) or len(alerts) > 1:
        raise MonitoringError('alert_claim_invalid')
    counts = {'accepted': 0, 'failed': 0, 'uncertain': 0}
    for alert in alerts:
        alert_id = str(uuid.UUID(str(alert['id'])))
        lease = str(uuid.UUID(str(alert['lease_token'])))
        try:
            status, code = deliver(alert, smtp_config, recipient, ledger, smtp_factory)
        except (KeyError, ValueError, MonitoringError):
            status, code = 'failed', 'alert_payload_invalid'
            ledger.record(alert_id, status, code)
        database.call('kws_monitoring_complete_alert', p_id=alert_id, p_lease_token=lease, p_status=status, p_code=code)
        counts[status] += 1
    status = 'error' if counts['failed'] and not counts['accepted'] else 'partial' if counts['failed'] or counts['uncertain'] else 'connected'
    database.source('alerts', status, 'smtp_acceptance_uncertain' if counts['uncertain'] else 'smtp_failed' if counts['failed'] else 'smtp_acceptance_only')
    return log_status('alerts', 'complete', **counts, delivered_confirmed=False)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--state', type=Path, default=STATE)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    config = private_json(args.root / 'config.json')
    mode = config.get('alert_mode', 'disabled')
    if not args.apply:
        log_status('alerts', 'dry_run', mode=mode, emails_sent=0, database_changed=False)
        return
    if not activation_valid(config, args.root):
        raise MonitoringError('reviewed_activation_required')
    database = Database()
    if mode != 'live':
        database.source('alerts', 'disabled', 'shadow_mode' if mode == 'shadow' else 'disabled')
        log_status('alerts', mode, emails_sent=0)
        return
    smtp_path = Path(config.get('smtp_runtime_path', '/opt/kws/integrations/runtime.json'))
    smtp_config = private_json(smtp_path)
    args.state.mkdir(mode=0o700, parents=True, exist_ok=True)
    ledger = Ledger(args.state / 'alerts.sqlite3')
    try:
        run(config, database, ledger, smtp_config)
    finally:
        ledger.close()


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        log_status('alerts', 'error', code=error.code if isinstance(error, MonitoringError) else 'worker_failed')
        raise SystemExit(1)
