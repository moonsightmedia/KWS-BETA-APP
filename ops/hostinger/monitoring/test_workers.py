"""No network, email, Docker or provider account is used by these tests."""
import contextlib
import csv
import io
import json
from pathlib import Path
import smtplib
import tempfile
import types
import unittest
import uuid
from unittest.mock import patch

import alert_worker
import common
import edge_install
import install
import sentry_importer
import store_importer
import verify_installation


class FakeDatabase:
    def __init__(self, alerts=None, fail_complete=False):
        self.calls = []
        self.alerts = alerts or []
        self.fail_complete = fail_complete

    def call(self, name, **parameters):
        self.calls.append((name, parameters))
        if name == 'kws_monitoring_claim_alerts':
            return self.alerts
        if name == 'kws_monitoring_complete_alert' and self.fail_complete:
            raise common.MonitoringError('database_rpc_failed')
        return None

    def source(self, source, status, code=None, **metadata):
        self.calls.append(('source', {'source': source, 'status': status, 'code': code, **metadata}))


class FakeSMTP:
    sends = []
    failure = None
    login_failure = None

    def __init__(self, *args, **kwargs):
        pass

    def login(self, *args):
        if self.login_failure:
            raise self.login_failure

    def send_message(self, message):
        self.sends.append(message)
        if self.failure:
            raise self.failure
        return {}

    def close(self):
        pass


def alert():
    return {'id': str(uuid.uuid4()), 'lease_token': str(uuid.uuid4()), 'fingerprint': 'a' * 32,
            'severity': 'fatal', 'source': 'app', 'count': 12, 'affected_installations': 5,
            'first_seen_at': '2026-10-17T12:00:00Z', 'last_seen_at': '2026-10-17T12:05:00Z',
            'safe_title': 'private-user@example.invalid password=secret'}


def smtp_settings():
    return {'smtp_host': 'mail.invalid', 'smtp_port': 465, 'smtp_user': 'smtp-user', 'smtp_password': 'never-log-this',
            'sender': 'beta@example.invalid', 'reply_to': 'support@example.invalid'}


def issue(issue_id='123'):
    return {'id': issue_id, 'shortId': 'KWS-12', 'title': 'private-user@example.invalid secret=abcdef',
            'assignedTo': {'email': 'private-user@example.invalid'}, 'status': 'unresolved', 'level': 'error',
            'count': '3', 'userCount': 2, 'firstSeen': '2026-10-16T12:00:00Z', 'lastSeen': '2026-10-17T12:00:00Z',
            'project': {'slug': 'kws-beta'}, 'metadata': {'type': 'TypeError', 'value': 'token=private'}}


def csv_bytes(rows):
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=sorted(store_importer.FIELDS))
    writer.writeheader()
    writer.writerows(rows)
    return output.getvalue().encode()


def store_row(**changes):
    return {'source': 'app_store', 'metric': 'first_time_downloads', 'metric_date': '2026-10-16',
            'value': '7', 'source_timezone': 'UTC', 'app_identifier': '123456', 'channel': 'app_store',
            'period_kind': 'daily', **changes}


class AlertTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.path = Path(self.temporary.name) / 'alerts.sqlite3'
        self.ledger = alert_worker.Ledger(self.path)
        FakeSMTP.sends, FakeSMTP.failure, FakeSMTP.login_failure = [], None, None

    def tearDown(self):
        self.ledger.close()
        self.temporary.cleanup()

    def test_accepted_mail_is_not_sent_twice_after_restart(self):
        value = alert()
        first = alert_worker.deliver(value, smtp_settings(), 'operator@example.invalid', self.ledger, FakeSMTP)
        self.ledger.close()
        self.ledger = alert_worker.Ledger(self.path)
        second = alert_worker.deliver(value, smtp_settings(), 'operator@example.invalid', self.ledger, FakeSMTP)
        self.assertEqual(first, ('accepted', 'smtp_accepted'))
        self.assertEqual(first, second)
        self.assertEqual(len(FakeSMTP.sends), 1)

    def test_ack_failure_does_not_duplicate_smtp(self):
        value = alert()
        with self.assertRaises(common.MonitoringError):
            alert_worker.run({'alert_recipient': 'operator@example.invalid'}, FakeDatabase([value], True),
                             self.ledger, smtp_settings(), FakeSMTP)
        with contextlib.redirect_stdout(io.StringIO()):
            alert_worker.run({'alert_recipient': 'operator@example.invalid'}, FakeDatabase([value]),
                             self.ledger, smtp_settings(), FakeSMTP)
        self.assertEqual(len(FakeSMTP.sends), 1)

    def test_interrupted_sending_is_uncertain_and_never_resent(self):
        value = alert()
        self.ledger.record(value['id'], 'sending', 'smtp_sending')
        self.assertEqual(alert_worker.deliver(value, smtp_settings(), 'operator@example.invalid', self.ledger, FakeSMTP),
                         ('uncertain', 'interrupted_during_send'))
        self.assertEqual(FakeSMTP.sends, [])

    def test_disconnect_after_data_is_terminal_uncertain(self):
        value = alert()
        FakeSMTP.failure = smtplib.SMTPServerDisconnected('sensitive provider response')
        self.assertEqual(alert_worker.deliver(value, smtp_settings(), 'operator@example.invalid', self.ledger, FakeSMTP),
                         ('uncertain', 'smtp_acceptance_uncertain'))
        FakeSMTP.failure = None
        self.assertEqual(alert_worker.deliver(value, smtp_settings(), 'operator@example.invalid', self.ledger, FakeSMTP)[0], 'uncertain')
        self.assertEqual(len(FakeSMTP.sends), 1)

    def test_explicit_rejection_can_be_retried(self):
        value = alert()
        FakeSMTP.failure = smtplib.SMTPDataError(550, b'rejected')
        self.assertEqual(alert_worker.deliver(value, smtp_settings(), 'operator@example.invalid', self.ledger, FakeSMTP)[0], 'failed')
        FakeSMTP.failure = None
        self.assertEqual(alert_worker.deliver(value, smtp_settings(), 'operator@example.invalid', self.ledger, FakeSMTP)[0], 'accepted')

    def test_auth_failure_never_calls_send(self):
        FakeSMTP.login_failure = smtplib.SMTPAuthenticationError(535, b'private-user')
        self.assertEqual(alert_worker.deliver(alert(), smtp_settings(), 'operator@example.invalid', self.ledger, FakeSMTP)[0], 'failed')
        self.assertEqual(FakeSMTP.sends, [])

    def test_message_contains_no_raw_title_or_user_information(self):
        value = alert()
        content = alert_worker.message_for(value, smtp_settings(), 'operator@example.invalid').as_string()
        self.assertNotIn('private-user', content)
        self.assertNotIn('password', content)
        self.assertNotIn('never-log-this', content)
        self.assertIn('Message-ID:', content)
        self.assertIn(value['fingerprint'], content)
        self.assertEqual(alert_worker.message_for(value, smtp_settings(), 'operator@example.invalid')['Message-ID'],
                         alert_worker.message_for(value, smtp_settings(), 'operator@example.invalid')['Message-ID'])

    def test_sentry_user_count_is_never_presented_as_installations(self):
        value = alert()
        value['source'] = 'sentry'
        content = alert_worker.message_for(value, smtp_settings(), 'operator@example.invalid').get_content()
        self.assertNotIn('Betroffene erfasste App-Instanzen: 5', content)
        self.assertIn('nicht ableitbar', content)

    def test_header_injection_and_multiple_recipients_rejected(self):
        for value in ('user@example.invalid\r\nBcc: other@example.invalid', 'one@example.invalid,two@example.invalid'):
            with self.assertRaises(common.MonitoringError):
                alert_worker.email_address(value)


class SentryTests(unittest.TestCase):
    def config(self):
        return {'sentry': {'enabled': True, 'origin': 'https://sentry.io', 'organization': 'kws', 'projects': ['kws-beta']}}

    def test_summary_copies_only_safe_fields(self):
        result = sentry_importer.summary(issue(), 'https://sentry.io', 'kws')
        self.assertEqual(result['title'], 'TypeError (KWS-12)')
        self.assertNotIn('private', json.dumps(result))
        self.assertNotIn('secret', json.dumps(result))
        self.assertEqual(result['permalink'], 'https://sentry.io/organizations/kws/issues/123/')

    def test_lifetime_counts_keep_their_definition(self):
        value = issue()
        value['lifetime'] = {'count': '20', 'userCount': 8, 'firstSeen': '2026-09-10T00:00:00Z', 'lastSeen': value['lastSeen']}
        self.assertEqual(sentry_importer.summary(value, 'https://sentry.io', 'kws')['count'], 20)

    def test_missing_credentials_reports_not_connected_without_provider_call(self):
        database = FakeDatabase()
        with contextlib.redirect_stdout(io.StringIO()):
            sentry_importer.run(self.config(), database, {}, lambda *args: self.fail('Network called'))
        self.assertEqual(database.calls[0][1]['status'], 'not_connected')

    def test_collect_includes_resolved_issues_and_handles_pagination(self):
        calls = []
        def getter(url, token, origin):
            calls.append(url)
            if len(calls) == 1:
                link = '<https://sentry.io/api/0/organizations/kws/issues/?cursor=123:0:1>; rel="next"; results="true"'
                return [issue()], {'Link': link}
            value = issue('456')
            value['status'] = 'resolved'
            return [value], {}
        values, partial = sentry_importer.collect(self.config(), 'do-not-log', getter)
        self.assertFalse(partial)
        self.assertEqual([value['status'] for value in values], ['unresolved', 'resolved'])
        self.assertIn('query=%21has%3Areport_id&', calls[0])
        self.assertIn('project=kws-beta', calls[0])
        self.assertNotIn('do-not-log', ''.join(calls))

    def test_cross_origin_pagination_is_rejected(self):
        with self.assertRaises(common.MonitoringError):
            sentry_importer.next_cursor('<https://untrusted.invalid/?cursor=secret>; rel="next"; results="true"',
                                        'https://sentry.io', '/api/0/organizations/kws/issues/')

    def test_non_sentry_origin_is_rejected(self):
        config = self.config()
        config['sentry']['origin'] = 'https://untrusted.invalid'
        with self.assertRaises(common.MonitoringError):
            sentry_importer.settings(config)

    def test_provider_failure_is_recorded_without_exception_body(self):
        database = FakeDatabase()
        def getter(*args):
            raise common.MonitoringError('provider_http_403')
        with self.assertRaises(common.MonitoringError):
            sentry_importer.run(self.config(), database, {'sentry_token': 'secret'}, getter)
        self.assertEqual(database.calls[-1][1]['code'], 'provider_http_403')
        self.assertNotIn('secret', json.dumps(database.calls))


class StoreTests(unittest.TestCase):
    def test_daily_metrics_preserve_source_and_period(self):
        value = store_importer.parse_csv(csv_bytes([store_row()]))[0]
        self.assertEqual(value['value'], 7)
        self.assertEqual(value['source_period_start'], '2026-10-16T00:00:00+00:00')
        self.assertEqual(value['source_period_end'], '2026-10-17T00:00:00+00:00')
        self.assertEqual(value['source_timezone'], 'UTC')
        self.assertEqual(len(value['source_revision']), 64)

    def test_download_sources_and_definitions_remain_separate(self):
        values = store_importer.parse_csv(csv_bytes([
            store_row(), store_row(source='testflight', channel='testflight', metric='installations'),
            store_row(source='google_play', channel='google_play', metric='install_events'),
        ]))
        self.assertEqual(len(values), 3)
        self.assertIn('repeat installations', values[2]['definition'])
        self.assertNotEqual(values[0]['definition'], values[1]['definition'])

    def test_repeated_total_in_one_export_is_rejected(self):
        with self.assertRaises(common.MonitoringError):
            store_importer.parse_csv(csv_bytes([store_row(), store_row()]))

    def test_unknown_metrics_or_rolling_snapshots_fail(self):
        for changes in ({'metric': 'downloads'}, {'period_kind': 'rolling_7_days'}, {'channel': 'testflight'},
                        {'value': '-1'}, {'value': '1.2'}, {'metric_date': '2099-01-01'}, {'source_timezone': 'not-a-timezone'}):
            with self.assertRaises(common.MonitoringError):
                store_importer.parse_csv(csv_bytes([store_row(**changes)]))

    def test_extra_columns_cannot_carry_personal_data(self):
        content = csv_bytes([store_row()]).replace(b'app_identifier,', b'user_email,app_identifier,')
        with self.assertRaises(common.MonitoringError):
            store_importer.parse_csv(content)

    def test_same_snapshot_does_not_refresh_import_freshness(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'daily.csv').write_bytes(csv_bytes([store_row()]))
            state = root / 'state.json'
            config = {'stores': {'enabled': True, 'adapter': 'reviewed_daily_csv'}}
            first, second = FakeDatabase(), FakeDatabase()
            with contextlib.redirect_stdout(io.StringIO()):
                store_importer.run(config, first, root, state)
                store_importer.run(config, second, root, state)
            self.assertEqual(first.calls[0][0], 'kws_monitoring_import_store_metrics')
            self.assertEqual(second.calls, [])

    def test_corrected_snapshot_is_imported_as_same_metric_identity(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            path = root / 'daily.csv'
            state = root / 'state.json'
            config = {'stores': {'enabled': True, 'adapter': 'reviewed_daily_csv'}}
            path.write_bytes(csv_bytes([store_row()]))
            first, second = FakeDatabase(), FakeDatabase()
            with contextlib.redirect_stdout(io.StringIO()):
                store_importer.run(config, first, root, state)
                path.write_bytes(csv_bytes([store_row(value='8')]))
                store_importer.run(config, second, root, state)
            before, after = first.calls[0][1]['p_metrics'][0], second.calls[0][1]['p_metrics'][0]
            for key in ('source', 'metric', 'metric_date', 'app_identifier', 'channel'):
                self.assertEqual(before[key], after[key])
            self.assertNotEqual(before['source_revision'], after['source_revision'])
            self.assertEqual(after['value'], 8)

    def test_overlapping_files_are_not_summed(self):
        with tempfile.TemporaryDirectory() as directory:
            for name in ('first.csv', 'second.csv'):
                (Path(directory) / name).write_bytes(csv_bytes([store_row()]))
            with self.assertRaises(common.MonitoringError):
                store_importer.snapshots(directory)


class SafetyTests(unittest.TestCase):
    def test_client_collection_and_sentry_config_is_explicit_and_guarded(self):
        config = json.loads((Path(__file__).parent / 'config.example.json').read_text())
        self.assertFalse(config['collection_enabled'])
        install.validate_config(config)
        config['client'] = {'sentry_dsn': 'https://public123@o123.ingest.de.sentry.io/123456', 'sentry_org_url': 'https://sentry.io/organizations/kws/'}
        install.validate_config(config)
        config['client']['sentry_dsn'] = 'https://key:password@untrusted.invalid/123'
        with self.assertRaises(common.MonitoringError):
            install.validate_config(config)

    def test_edge_install_plan_binds_previous_and_replacement_handler_files(self):
        with tempfile.TemporaryDirectory() as directory:
            source, target = Path(directory) / 'source', Path(directory) / 'target'
            for filename in edge_install.FILES:
                path = source / filename
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text('reviewed handler')
            previous = target / 'send-push-notification/handler.ts'
            previous.parent.mkdir(parents=True)
            previous.write_text('previous handler')
            before, checksum = edge_install.plan(source, target=target)
            self.assertFalse(before['restart_functions'])
            self.assertIsNone(before['files']['monitoring-events/handler.ts']['before'])
            self.assertIsNotNone(before['files']['send-push-notification/handler.ts']['before'])
            self.assertEqual(checksum, edge_install.plan(source, target=target)[1])
            previous.write_text('changed by another operator')
            self.assertNotEqual(checksum, edge_install.plan(source, target=target)[1])

    def test_sql_calls_use_stdin_and_no_credentials_in_process_arguments(self):
        calls = []
        def runner(command, **options):
            calls.append((command, options))
            return types.SimpleNamespace(returncode=0, stdout='{"imported":1}\n', stderr='')
        common.Database(runner).call('kws_monitoring_import_sentry_issues', p_issues=[{'title': "';DROP TABLE example;--"}])
        self.assertNotIn('DROP', ' '.join(calls[0][0]))
        self.assertIn('SET LOCAL ROLE service_role', calls[0][1]['input'])
        self.assertIn('$kws_', calls[0][1]['input'])

    def test_live_alerts_need_explicit_install_authorization(self):
        config = json.loads((Path(__file__).parent / 'config.example.json').read_text())
        config.update(alert_mode='live', alert_recipient='operator@example.invalid')
        with self.assertRaises(common.MonitoringError):
            install.plan(Path(__file__).parent, config)

    def test_plan_is_deterministic_and_does_not_expose_recipient(self):
        config = json.loads((Path(__file__).parent / 'config.example.json').read_text())
        config.update(alert_mode='live', alert_recipient='operator@example.invalid')
        first = install.plan(Path(__file__).parent, config, allow_live_alerts=True)
        second = install.plan(Path(__file__).parent, config, allow_live_alerts=True)
        self.assertEqual(first, second)
        self.assertNotIn('operator@example.invalid', json.dumps(first))
        self.assertFalse(first[0]['start_jobs'])

    def test_missing_receipt_and_changed_artifacts_fail_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            config = {'alert_mode': 'live'}
            self.assertFalse(common.activation_valid(config, root))
            for filename in common.WORKER_FILES:
                (root / filename).write_text('reviewed')
            worker = root / 'alert_worker.py'
            common.atomic_json(root / 'activation.json', {'allow_jobs': True, 'config_sha256': common.config_digest(config),
                                                        'artifacts': {filename: common.digest((root / filename).read_bytes()) for filename in common.WORKER_FILES}})
            self.assertTrue(common.activation_valid(config, root))
            worker.write_text('modified')
            self.assertFalse(common.activation_valid(config, root))

    def test_incomplete_artifact_receipt_cannot_authorize_jobs(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            config = {'alert_mode': 'live'}
            (root / 'alert_worker.py').write_text('reviewed')
            common.atomic_json(root / 'activation.json', {'allow_jobs': True, 'config_sha256': common.config_digest(config),
                                                        'artifacts': {'alert_worker.py': common.digest(b'reviewed')}})
            self.assertFalse(common.activation_valid(config, root))


class VerificationTests(unittest.TestCase):
    def reviewed_plan(self):
        return {'migration_sha256': 'a' * 64, 'config_sha256': 'b' * 64, 'files': {'monitoring-events/handler.ts': 'c' * 64}}

    def test_real_endpoint_proof_requires_excluded_unique_record_and_no_alarm(self):
        submissions = []
        signature_queries = []
        def submitter(event, key):
            self.assertEqual(key, 'runtime-only')
            submissions.append(event)
            self.assertEqual(event['name'], 'app_error')
            self.assertEqual(event['channel'], 'test')
            self.assertEqual(event['consent'], 'denied')
        def query(statement):
            if statement == verify_installation.SCHEMA_SIGNATURE_SQL:
                signature_queries.append(statement)
                return 'd' * 32
            self.assertIn(submissions[0]['event_id'], statement)
            return json.dumps({'event_count': 1, 'excluded_count': 1, 'installation_excluded': True,
                               'session_excluded': True, 'alert_count': 0})
        result = verify_installation.verify(self.reviewed_plan(), 'runtime-only', submitter, query)
        self.assertTrue(result['ingest_verified'])
        self.assertTrue(result['idempotency_verified'])
        self.assertFalse(result['native_crashes_verified'])
        self.assertEqual(len(submissions), 2)
        self.assertEqual(submissions[0], submissions[1])
        self.assertEqual(len(signature_queries), 2)
        self.assertNotIn('runtime-only', json.dumps(result))

    def test_failed_or_nonexcluded_ingest_never_produces_proof(self):
        for changes in ({'event_count': 0}, {'event_count': 2}, {'excluded_count': 0}, {'alert_count': 1},
                        {'installation_excluded': False}, {'session_excluded': False}):
            proof = {'event_count': 1, 'excluded_count': 1, 'installation_excluded': True, 'session_excluded': True, 'alert_count': 0, **changes}
            def query(statement):
                return 'd' * 32 if statement == verify_installation.SCHEMA_SIGNATURE_SQL else json.dumps(proof)
            with self.assertRaises(common.MonitoringError):
                verify_installation.verify(self.reviewed_plan(), 'not-logged', lambda *args: None, query)

    def test_schema_change_during_ingest_blocks_proof(self):
        signatures = iter(['d' * 32, 'e' * 32])
        def query(statement):
            if statement == verify_installation.SCHEMA_SIGNATURE_SQL:
                return next(signatures)
            return json.dumps({'event_count': 1, 'excluded_count': 1, 'installation_excluded': True,
                               'session_excluded': True, 'alert_count': 0})
        with self.assertRaisesRegex(common.MonitoringError, 'schema_changed'):
            verify_installation.verify(self.reviewed_plan(), 'not-logged', lambda *args: None, query)

    def test_empty_schema_and_missing_ack_do_not_produce_proof(self):
        with self.assertRaisesRegex(common.MonitoringError, 'schema_signature_invalid'):
            verify_installation.verify(self.reviewed_plan(), 'not-logged', lambda *args: self.fail('Submitted'),
                                       lambda statement: 'd41d8cd98f00b204e9800998ecf8427e')
        class Response:
            def __enter__(self): return self
            def __exit__(self, *args): return None
            def read(self, limit): return b'{"accepted_ids": [], "rejected_ids": []}'
        class Opener:
            def open(self, request, timeout): return Response()
        with self.assertRaisesRegex(common.MonitoringError, 'not_acknowledged'):
            verify_installation.submit({'event_id': str(uuid.uuid4())}, 'not-logged', Opener())


if __name__ == '__main__':
    unittest.main()
