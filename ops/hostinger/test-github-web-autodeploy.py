import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch, Mock

spec = importlib.util.spec_from_file_location('autodeploy', Path(__file__).with_name('github-web-autodeploy.py'))
agent = importlib.util.module_from_spec(spec)
spec.loader.exec_module(agent)
OLD, NEW, OTHER = 'a' * 40, 'b' * 40, 'c' * 40


def run_record(**changes):
    value = {'id': 42, 'run_attempt': 1, 'head_sha': NEW, 'head_branch': 'main',
             'event': 'push', 'path': agent.WORKFLOW, 'repository': {'id': agent.REPOSITORY_ID},
             'head_repository': {'id': agent.REPOSITORY_ID}, 'status': 'in_progress', 'conclusion': None}
    value.update(changes)
    return value


def jobs(conclusion='success', status='completed'):
    return {'jobs': [{'name': agent.VERIFY_JOB, 'conclusion': conclusion, 'status': status},
                     {'name': 'Confirm Hostinger deployment', 'conclusion': None, 'status': 'in_progress'}]}


def comparison():
    return {'status': 'ahead', 'base_commit': {'sha': OLD}, 'merge_base_commit': {'sha': OLD}, 'commits': [{'sha': NEW}]}


class GateTests(unittest.TestCase):
    def test_pending_deploy_job_does_not_deadlock_successful_verification(self):
        self.assertEqual(agent.verified_run([run_record()], NEW)['id'], 42)
        self.assertTrue(agent.verification_passed(jobs()['jobs']))

    def test_wrong_branch_event_repository_workflow_and_revision_rejected(self):
        for change in [{'head_branch': 'feature'}, {'event': 'pull_request'}, {'head_sha': OLD},
                       {'repository': {'id': 1}}, {'head_repository': {'id': 1}},
                       {'path': '.github/workflows/ios-testflight.yml'}, {'status': 'queued'},
                       {'conclusion': 'failure'}, {'conclusion': 'cancelled'}]:
            with self.subTest(change=change):
                self.assertIsNone(agent.verified_run([run_record(**change)], NEW))

    def test_newest_failed_run_blocks_old_green_run(self):
        self.assertIsNone(agent.verified_run([run_record(id=41, status='completed', conclusion='success'),
                                             run_record(status='completed', conclusion='failure')], NEW))

    def test_missing_duplicate_failed_cancelled_or_skipped_checks_never_deploy(self):
        self.assertFalse(agent.verification_passed([]))
        self.assertFalse(agent.verification_passed(jobs()['jobs'] * 2))
        for outcome in ['failure', 'cancelled', 'skipped', None]:
            self.assertFalse(agent.verification_passed(jobs(outcome)['jobs']))
        self.assertFalse(agent.verification_passed(jobs('success', 'in_progress')['jobs']))

    def test_only_fast_forward_commits_are_accepted(self):
        self.assertTrue(agent.is_forward_release(comparison(), OLD, NEW))
        for change in [{'status': 'behind'}, {'status': 'diverged'}, {'base_commit': {'sha': OTHER}},
                       {'merge_base_commit': {'sha': OTHER}}, {'commits': []}, {'commits': [{'sha': OTHER}]}]:
            value = comparison(); value.update(change)
            self.assertFalse(agent.is_forward_release(value, OLD, NEW))

    def test_revision_cannot_inject_arguments_or_urls(self):
        for value in ['main', '--help', NEW + ';id', '../../root', NEW.upper(), None]:
            with self.assertRaises(ValueError): agent.sha(value)


class TickTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.web, self.state, self.install = [self.base / p for p in ['web', 'state', 'install']]
        for p in (self.web, self.state, self.install): p.mkdir()
        self.source = self.web / 'SOURCE.json'
        self.source.write_text(json.dumps({'revision': OLD}))
        (self.install / 'update-production-web.py').write_bytes(b'reviewed operator')
        import hashlib
        (self.install / 'config.json').write_text(json.dumps({'operator_sha256': hashlib.sha256(b'reviewed operator').hexdigest()}))
        for name, value in [('WEB', self.web), ('STATE', self.state), ('INSTALL', self.install)]:
            patcher = patch.object(agent, name, value); patcher.start(); self.addCleanup(patcher.stop)
        self.head = self.mock('main_revision', return_value=NEW)
        self.api = self.mock('get_json', side_effect=[{'workflow_runs': [run_record()]}, jobs(), comparison(), {'revision': NEW}])
        self.process = self.mock('subprocess')
        self.process.run.side_effect = self.deploy
        self.disk = self.mock('shutil.disk_usage', return_value=Mock(free=10 * 1024**3))
        self.download = self.mock('urllib.request.urlopen')
        self.download.return_value.__enter__.return_value.read.return_value = b'public archive bytes'

    def mock(self, name, **kwargs):
        # Patch via the module object because the dynamically imported name is not in sys.modules.
        target = agent
        parts = name.split('.')
        for part in parts[:-1]: target = getattr(target, part)
        patcher = patch.object(target, parts[-1], **kwargs)
        result = patcher.start(); self.addCleanup(patcher.stop)
        return result

    def deploy(self, command, **kwargs):
        self.source.write_text(json.dumps({'revision': NEW}))
        return Mock(returncode=0)

    def test_verified_exact_revision_invokes_pinned_web_only_operator(self):
        self.assertEqual(agent.tick()['status'], 'deployed')
        command = self.process.run.call_args.args[0]
        self.assertIn('--web-only', command)
        self.assertEqual(command[command.index('--revision') + 1], NEW)
        self.assertEqual(command[command.index('--expected-revision') + 1], OLD)
        self.head.return_value = NEW
        self.assertEqual(agent.tick()['status'], 'up_to_date')
        self.assertEqual(json.loads((self.state / 'last-deployment.json').read_text())['run_id'], 42)

    def test_unchanged_revision_uses_no_api_and_never_rebuilds(self):
        self.head.return_value = OLD
        self.assertEqual(agent.tick()['status'], 'up_to_date')
        self.api.assert_not_called(); self.process.run.assert_not_called()

    def test_failed_checks_do_not_download_or_deploy(self):
        self.api.side_effect = [{'workflow_runs': [run_record()]}, jobs('failure')]
        self.assertEqual(agent.tick()['status'], 'waiting_for_checks')
        self.download.assert_not_called(); self.process.run.assert_not_called()

    def test_newer_push_during_preparation_supersedes_candidate(self):
        self.head.side_effect = [NEW, OTHER]
        self.assertEqual(agent.tick()['status'], 'superseded')
        self.process.run.assert_not_called()

    def test_manual_release_during_preparation_is_not_overwritten(self):
        calls = []
        def changed_head():
            calls.append(True)
            if len(calls) == 2:
                self.source.write_text(json.dumps({'revision': OTHER}))
            return NEW
        self.head.side_effect = changed_head
        self.assertEqual(agent.tick()['status'], 'superseded')
        self.process.run.assert_not_called()

    def test_operator_tampering_stops_before_deployment(self):
        (self.install / 'update-production-web.py').write_bytes(b'changed')
        with self.assertRaises(RuntimeError): agent.tick()
        self.process.run.assert_not_called()

    def test_low_disk_stops_before_download_or_deployment(self):
        self.disk.return_value = Mock(free=1024)
        with self.assertRaises(RuntimeError): agent.tick()
        self.download.assert_not_called(); self.process.run.assert_not_called()

    def test_failure_is_not_retried_until_new_run_attempt(self):
        self.process.run.side_effect = lambda *a, **k: Mock(returncode=1)
        with self.assertRaises(RuntimeError): agent.tick()
        self.assertEqual(json.loads(self.source.read_text())['revision'], OLD)
        self.api.side_effect = [{'workflow_runs': [run_record()]}, jobs()]
        self.process.run.reset_mock()
        self.assertEqual(agent.tick()['status'], 'failed_attempt_requires_rerun')
        self.process.run.assert_not_called()
        self.api.side_effect = [{'workflow_runs': [run_record(run_attempt=2)]}, jobs(), comparison(), {'revision': NEW}]
        self.process.run.side_effect = self.deploy
        self.assertEqual(agent.tick()['status'], 'deployed')

    def test_diverged_history_never_downloads_or_deploys(self):
        value = comparison(); value['status'] = 'diverged'
        self.api.side_effect = [{'workflow_runs': [run_record()]}, jobs(), value]
        self.assertEqual(agent.tick()['status'], 'non_forward_release_blocked')
        self.download.assert_not_called(); self.process.run.assert_not_called()


if __name__ == '__main__':
    unittest.main()
