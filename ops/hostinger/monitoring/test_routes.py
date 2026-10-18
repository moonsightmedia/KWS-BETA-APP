import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch

import route_install


class MonitoringRouteTests(unittest.TestCase):
    def test_only_exact_monitoring_slug_is_added(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'API.Caddyfile'
            path.write_text('handle_path /functions/v1/* {\n @push path /send-push-notification\n handle @push { reverse_proxy supabase-edge-functions:9000 }\n handle { respond "Unknown function" 404 }\n}\n')
            proof, original, updated = route_install.plan(path)
            self.assertEqual(updated.decode(), original.decode().replace(route_install.BEFORE, route_install.AFTER))
            self.assertIn('Unknown function', updated.decode())
            self.assertTrue(proof['jwt_checks_unchanged'])
            self.assertNotEqual(proof['before'], proof['after'])
            self.assertNotIn('Bearer', json.dumps(proof))

    def test_missing_duplicate_or_already_changed_routes_require_review(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'API.Caddyfile'
            for text in ('unknown', route_install.BEFORE + '\n' + route_install.BEFORE, route_install.AFTER):
                path.write_text(text)
                with self.assertRaisesRegex(ValueError, 'route_requires_review'):
                    route_install.plan(path)

    def test_restart_uses_disabled_admin_api_compatible_activation(self):
        runner = Mock(return_value=Mock(stdout='{"Running": true}'))
        route_install.restart(runner)
        self.assertEqual(runner.call_args_list[0].args[0], ['docker', 'restart', '--time', '10', 'kws-api-internal'])
        self.assertEqual(runner.call_args_list[1].args[0][-1], 'kws-api-internal')

    def test_restart_requires_running_container(self):
        runner = Mock(return_value=Mock(stdout='{"Running": false}'))
        with self.assertRaisesRegex(ValueError, 'api_not_running'):
            route_install.restart(runner)

    def test_failed_activation_restores_original_and_restarts(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'API.Caddyfile'
            target.write_text(route_install.BEFORE)
            reviewed, original, updated = route_install.plan(target)
            runner = Mock(return_value=Mock(stdout=json.dumps([{'Mounts': [{'Source': str(target), 'Destination': '/etc/caddy/Caddyfile'}]}])))
            with patch.object(route_install, 'TARGET', target), patch.object(route_install, 'BACKUPS', Path(directory) / 'backups'), patch.object(route_install.os, 'name', 'posix'), patch.object(route_install.os, 'geteuid', return_value=0, create=True), patch.object(route_install.socket, 'gethostname', return_value='srv2044594'), patch.object(route_install, 'restart', side_effect=[ValueError('restart_failed'), None]) as restart:
                with self.assertRaisesRegex(ValueError, 'restart_failed'):
                    route_install.execute(reviewed, original, updated, runner)
                self.assertEqual(target.read_bytes(), original)
                self.assertEqual(restart.call_count, 2)
