import json
from pathlib import Path
import tempfile
import unittest

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
