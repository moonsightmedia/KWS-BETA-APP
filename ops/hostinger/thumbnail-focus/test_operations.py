"""Operator tests use temporary files and synthetic Docker data, never Docker."""
import copy
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(filename))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


gateway = load('thumbnail_gateway_routes', 'gateway-routes.py')
runtime = load('thumbnail_runtime', 'verify-runtime.py')
ORIGINAL = b'''{
    email operator@example.invalid
}
beta.kletterwelt-sauerland.de {
    header { X-Content-Type-Options nosniff }
    reverse_proxy kws-web-production:80
}
beta-api.kletterwelt-sauerland.de {
    header { Referrer-Policy no-referrer }
    reverse_proxy kws-api-internal:80
}
review-api.kletterwelt-sauerland.de {
    header Cache-Control no-store
    @app_api path /auth/v1/* /rest/v1/* /storage/v1/* /realtime/v1/*
    handle @app_api { reverse_proxy kws-store-review-api-gw:8000 }
    handle { respond "Unknown review API route" 404 }
}
unrelated.example.invalid {
    basic_auth { operator NOT-A-REAL-PASSWORD-HASH }
    header X-Fixture "{quoted braces}"
    reverse_proxy unchanged:80
}
'''
COMPOSE = b'''services:
  caddy:
    image: caddy:fixture
    networks: [supabase, store_review]
networks:
  store_review:
    external: true
    name: kws-store-review-private
  supabase:
    external: true
    name: supabase_default
'''


class GatewayTests(unittest.TestCase):
    def test_compose_only_replaces_exact_network_list_with_private_aliases(self):
        changed = gateway.transform_compose(COMPOSE)
        self.assertIn(b'aliases: [beta-api.kletterwelt-sauerland.de]', changed)
        self.assertIn(b'aliases: [review-api.kletterwelt-sauerland.de]', changed)
        self.assertEqual(changed[changed.index(b'\nnetworks:'):], COMPOSE[COMPOSE.index(b'\nnetworks:'):])
        self.assertRaises(ValueError, gateway.transform_compose, changed)
        self.assertRaises(ValueError, gateway.transform_compose, COMPOSE.replace(b'name: kws-store-review-private', b'name: unexpected'))

    def test_atomic_pair_validation_or_recreate_failure_restores_both_files(self):
        for failure in ('validation', 'recreate', 'verify'):
            with tempfile.TemporaryDirectory() as directory:
                target, compose = Path(directory) / 'Caddyfile', Path(directory) / 'docker-compose.yml'
                target.write_bytes(ORIGINAL)
                compose.write_bytes(COMPOSE)
                inodes = (target.stat().st_ino, compose.stat().st_ino)
                validate = Mock(side_effect=RuntimeError('invalid') if failure == 'validation' else None)
                activate = Mock(side_effect=[RuntimeError('failed'), None] if failure == 'recreate' else None)
                verify = Mock(side_effect=RuntimeError('failed') if failure == 'verify' else None)
                self.assertRaises(RuntimeError, gateway.apply_pair, target, compose, ORIGINAL, COMPOSE, gateway.transform(ORIGINAL), gateway.transform_compose(COMPOSE), Path(directory) / 'backup', validate, activate, verify)
                self.assertEqual(target.read_bytes(), ORIGINAL)
                self.assertEqual(compose.read_bytes(), COMPOSE)
                self.assertEqual((target.stat().st_ino, compose.stat().st_ino), inodes)
                self.assertEqual(activate.call_count, 0 if failure == 'validation' else 2)

    def test_exact_three_routes_preserve_all_existing_bytes(self):
        changed = gateway.transform(ORIGINAL)
        self.assertEqual(changed.count(b'KWS THUMBNAIL FOCUS BEGIN'), 3)
        self.assertEqual(changed.count(b'reverse_proxy kws-thumbnail-focus-production:5227'), 2)
        self.assertEqual(changed.count(b'reverse_proxy kws-thumbnail-focus-review:5228'), 1)
        restored = gateway.re.sub(rb'\n\t# KWS THUMBNAIL FOCUS BEGIN\n.*?\t# KWS THUMBNAIL FOCUS END\n', b'', changed, flags=gateway.re.S)
        self.assertEqual(restored, ORIGINAL)
        self.assertRaises(ValueError, gateway.transform, changed)
        self.assertRaises(ValueError, gateway.transform, ORIGINAL + ORIGINAL)
        self.assertRaises(ValueError, gateway.transform, ORIGINAL.replace(b'kws-api-internal:80', b'unknown:80'))

    def test_failed_activation_and_failed_verification_restore_original(self):
        for fail_at in ('activation', 'verification'):
            with tempfile.TemporaryDirectory() as directory:
                target = Path(directory) / 'Caddyfile'
                target.write_bytes(ORIGINAL)
                inode = target.stat().st_ino
                activation = Mock(side_effect=[RuntimeError('failed'), None] if fail_at == 'activation' else None)
                verify = Mock(side_effect=RuntimeError('failed') if fail_at == 'verification' else None)
                backup = Path(directory) / 'backup'
                self.assertRaises(RuntimeError, gateway.apply, target, ORIGINAL, gateway.transform(ORIGINAL), backup, activation, verify)
                self.assertEqual(target.read_bytes(), ORIGINAL)
                self.assertEqual(target.stat().st_ino, inode)
                self.assertEqual((backup / 'Caddyfile').read_bytes(), ORIGINAL)
                self.assertEqual(activation.call_count, 2)

    def test_compare_and_swap_refuses_newer_configuration(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'Caddyfile'
            target.write_bytes(ORIGINAL + b'# newer\n')
            backup = Path(directory) / 'backup'
            self.assertRaises(ValueError, gateway.apply, target, ORIGINAL, gateway.transform(ORIGINAL), backup, Mock(), Mock())
            self.assertFalse(backup.exists())
            self.assertTrue(target.read_bytes().endswith(b'# newer\n'))


class RuntimeTests(unittest.TestCase):
    def fixture(self, environment='production'):
        container, network, auth, port = runtime.CONTEXTS[environment]
        env = {'THUMBNAIL_ENVIRONMENT': environment, 'THUMBNAIL_LOCAL_ONLY': 'false', 'THUMBNAIL_CONTAINER_PRIVATE': 'true', 'THUMBNAIL_BIND': '0.0.0.0', 'THUMBNAIL_PORT': port, 'THUMBNAIL_AUTH_URL': auth, 'THUMBNAIL_ALLOWED_ORIGINS': ','.join(runtime.ORIGINS)}
        return {'Name': container, 'Image': 'sha256:fixture', 'State': {'Running': True, 'Health': {'Status': 'healthy'}}, 'Config': {'User': '10001:10001', 'Env': [key + '=' + value for key, value in env.items()]}, 'HostConfig': {'NetworkMode': network, 'PortBindings': {}, 'ReadonlyRootfs': True, 'Privileged': False, 'CapDrop': ['ALL'], 'SecurityOpt': ['no-new-privileges'], 'Memory': 1610612736, 'NanoCpus': 1000000000, 'PidsLimit': 64}, 'NetworkSettings': {'Networks': {network: {}}, 'Ports': {}}, 'Mounts': [{'Destination': '/models', 'Source': str(Path('synthetic-model-directory').resolve()), 'Type': 'bind', 'RW': False}]}

    def test_separate_private_contexts_and_resource_guards(self):
        for environment in ('production', 'review'):
            data = self.fixture(environment)
            env = runtime.inspect_container(data, environment, 'sha256:fixture', Path('synthetic-model-directory'))
            self.assertEqual(env['THUMBNAIL_ENVIRONMENT'], environment)
            for mutate in (lambda row: row['NetworkSettings']['Networks'].update({'bridge': {}}), lambda row: row['HostConfig'].update(Privileged=True), lambda row: row['Config'].update(User='root'), lambda row: row['HostConfig'].update(PortBindings={'5227/tcp': [{'HostPort': '5227'}]}), lambda row: row['HostConfig'].update(Memory=0), lambda row: row['HostConfig'].update(NanoCpus=0), lambda row: row['Mounts'][0].update(RW=True), lambda row: row['Config']['Env'].append('THUMBNAIL_LOCAL_ONLY=true')):
                changed = copy.deepcopy(data)
                mutate(changed)
                self.assertRaises(ValueError, runtime.inspect_container, changed, environment, 'sha256:fixture', Path('synthetic-model-directory'))
        self.assertRaises(ValueError, runtime.inspect_container, self.fixture('review'), 'production', 'sha256:fixture', Path('synthetic-model-directory'))

    def test_operator_photo_is_in_memory_png_not_an_external_url(self):
        data = runtime.json.loads(runtime.synthetic_photo())
        self.assertEqual(data['color'], 'red')
        raw = runtime.base64.b64decode(data['image'])
        self.assertTrue(raw.startswith(b'\x89PNG\r\n\x1a\n'))
        self.assertLess(len(raw), 1000)


if __name__ == '__main__':
    unittest.main()
