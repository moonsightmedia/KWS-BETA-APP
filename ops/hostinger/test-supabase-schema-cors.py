import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock

spec = importlib.util.spec_from_file_location('schema_cors', Path(__file__).with_name('fix-supabase-schema-cors.py'))
operator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(operator)
BASE = ('http://:80 {\n  ' + operator.ORIGIN_RULE + '\n  header @cors {\n'
        '    Access-Control-Allow-Headers "authorization, apikey, content-type, prefer"\n'
        '    Access-Control-Allow-Origin {http.request.header.Origin}\n  }\n'
        '  reverse_proxy supabase-rest:3000\n}\n').encode()


class SchemaCorsTests(unittest.TestCase):
    def test_only_requested_headers_change_and_second_run_is_noop(self):
        changed = operator.transform(BASE)
        self.assertEqual(changed.replace(b', accept-profile, content-profile', b''), BASE)
        self.assertEqual(operator.transform(changed), changed)

    def test_partial_upgrade_does_not_duplicate_headers(self):
        partial = BASE.replace(b'content-type, prefer', b'content-type, prefer, accept-profile')
        changed = operator.transform(partial)
        self.assertEqual(changed.count(b'accept-profile'), 1)
        self.assertIn(b'content-profile', changed)

    def test_refuses_wildcard_origins_and_headers_or_ambiguous_rules(self):
        for text in (BASE.replace(operator.ORIGIN_RULE.encode(), b'@cors header Origin *'),
                     BASE.replace(b'authorization, apikey', b'authorization, apikey, *'),
                     BASE.replace(b'authorization, apikey', b'authorization, apikey, apikey'),
                     BASE + BASE):
            with self.subTest(text=text), self.assertRaises(ValueError):
                operator.transform(text)

    def test_validation_failure_restores_config_without_restart(self):
        self.check_failure('validate', 0)

    def test_failed_postcheck_restores_original_and_restarts_old_config(self):
        self.check_failure('verify', 2)

    def check_failure(self, failure, activations):
        with tempfile.TemporaryDirectory() as directory:
            config = Path(directory) / 'API.Caddyfile'
            config.write_bytes(BASE)
            callbacks = {key: Mock(side_effect=RuntimeError('simulated failure') if key == failure else None)
                         for key in ('validate', 'activate', 'verify')}
            backup = Path(directory) / 'backup'
            with self.assertRaises(RuntimeError):
                operator.apply(config, BASE, operator.transform(BASE), backup, **callbacks)
            self.assertEqual(config.read_bytes(), BASE)
            self.assertEqual((backup / 'API.Caddyfile').read_bytes(), BASE)
            self.assertEqual(callbacks['activate'].call_count, activations)

    def test_success_preserves_mount_inode_and_retains_recovery_copy(self):
        with tempfile.TemporaryDirectory() as directory:
            config = Path(directory) / 'API.Caddyfile'
            config.write_bytes(BASE)
            inode = config.stat().st_ino
            changed = operator.transform(BASE)
            operator.apply(config, BASE, changed, Path(directory) / 'backup', Mock(), Mock(), Mock())
            self.assertEqual(config.stat().st_ino, inode)
            self.assertEqual(config.read_bytes(), changed)
            self.assertEqual((Path(directory) / 'backup/API.Caddyfile').read_bytes(), BASE)


if __name__ == '__main__':
    unittest.main()
