"""Lightweight HTTP/auth/model-boundary tests; no ONNX downloads or inference."""
import base64
import hashlib
import http.client
import importlib.util
import io
import json
import os
from pathlib import Path
import socket
import sys
import tempfile
import threading
import types
import unittest
from unittest.mock import Mock, patch
from PIL import Image
import download_models
import server

UID = '11111111-1111-4111-8111-111111111111'
APP = 'https://beta.kletterwelt-sauerland.de'
NATIVE = ('https://localhost', 'capacitor://localhost', 'http://localhost')
ENV = {'THUMBNAIL_AUTH_URL': 'https://beta-api.kletterwelt-sauerland.de', 'THUMBNAIL_PUBLIC_KEY': 'sb_publishable_fixture', 'THUMBNAIL_ALLOWED_ORIGINS': ','.join((APP, *NATIVE)), 'THUMBNAIL_ENVIRONMENT': 'production'}


class HTTPBoundary(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.env = patch.dict(os.environ, ENV)
        cls.env.start()
        server.LOCAL = False
        server.READY = True
        cls.http = server.BoundedHTTPServer(('127.0.0.1', 0), server.Handler)
        cls.thread = threading.Thread(target=cls.http.serve_forever, daemon=True)
        cls.thread.start()
        image = io.BytesIO()
        Image.new('RGB', (64, 64), '#888888').save(image, format='PNG')
        cls.payload = {'image': base64.b64encode(image.getvalue()).decode(), 'color': 'red'}

    @classmethod
    def tearDownClass(cls):
        cls.http.shutdown()
        cls.http.server_close()
        cls.thread.join()
        cls.env.stop()

    def setUp(self):
        server._RATES.clear()

    def call(self, method='POST', path='/api/analyze', body=None, headers=None):
        connection = http.client.HTTPConnection('127.0.0.1', self.http.server_port, timeout=5)
        raw = json.dumps(self.payload if body is None else body).encode() if method == 'POST' else None
        connection.request(method, path, raw, {'Content-Type': 'application/json', **(headers or {})})
        response = connection.getresponse()
        result = response.status, dict(response.getheaders()), response.read()
        connection.close()
        return result

    def test_health_is_ready_only_after_verified_cpu_loading(self):
        status, _, raw = self.call('GET', '/api/health')
        self.assertEqual(status, 200)
        data = json.loads(raw)
        self.assertEqual(data['environment'], 'production')
        self.assertEqual(data['provider'], 'CPUExecutionProvider')
        self.assertFalse(data['local_only'])
        with patch.object(server, 'READY', False):
            self.assertEqual(self.call('GET', '/api/health')[0], 503)

    def test_native_and_web_preflight_are_explicit_and_credential_free(self):
        for origin in (APP, *NATIVE):
            with self.subTest(origin=origin):
                status, headers, raw = self.call('OPTIONS', headers={'Origin': origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'Authorization, Content-Type'})
                self.assertEqual(status, 204)
                self.assertEqual(raw, b'')
                self.assertEqual(headers.get('Access-Control-Allow-Origin'), origin)
                self.assertNotIn('Access-Control-Allow-Credentials', headers)
        for headers in ({'Origin': 'https://evil.test'}, {'Origin': APP, 'Access-Control-Request-Method': 'DELETE'}, {'Origin': APP, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'x-forged-role'}):
            self.assertEqual(self.call('OPTIONS', headers=headers)[0], 403)

    def test_origin_is_checked_before_authentication_or_analysis(self):
        with patch.object(server, 'authenticated_user') as auth, patch.object(server, 'analyze') as analyze:
            status, headers, _ = self.call(headers={'Origin': 'https://evil.test'})
            self.assertEqual(status, 403)
            self.assertNotIn('Access-Control-Allow-Origin', headers)
            auth.assert_not_called()
            analyze.assert_not_called()

    def test_missing_token_never_runs_inference(self):
        with patch.object(server, 'analyze') as analyze:
            self.assertEqual(self.call()[0], 403)
            analyze.assert_not_called()

    def test_authorized_image_has_cors_no_store_and_no_photo_write(self):
        with patch.object(server, 'authenticated_user', return_value=UID), patch.object(server, 'analyze', return_value={'selected': [], 'candidates': []}) as analyze:
            status, headers, raw = self.call(headers={'Origin': 'capacitor://localhost'})
            self.assertEqual(status, 200)
            self.assertEqual(headers['Cache-Control'], 'no-store')
            self.assertEqual(headers['Access-Control-Allow-Origin'], 'capacitor://localhost')
            self.assertEqual(json.loads(raw)['selected'], [])
            analyze.assert_called_once()

    def test_invalid_payloads_never_reach_model(self):
        gif = io.BytesIO()
        Image.new('RGB', (64, 64)).save(gif, format='GIF')
        cases = [{}, {**self.payload, 'image': 'bad!'}, {**self.payload, 'point': [True, 0]}, {**self.payload, 'point': [float('nan'), 0]}, {**self.payload, 'point': [1.1, 0]}, {**self.payload, 'color': 'manual'}, {**self.payload, 'image': base64.b64encode(gif.getvalue()).decode()}]
        with patch.object(server, 'authenticated_user', return_value=UID), patch.object(server, 'analyze') as analyze:
            for value in cases:
                self.assertEqual(self.call(body=value)[0], 400)
            analyze.assert_not_called()
        self.assertEqual(self.call(headers={'Content-Type': 'text/plain'})[0], 415)

    def test_busy_and_rate_limits_have_retry_after(self):
        with patch.object(server, 'authenticated_user', return_value=UID):
            server.LOCK.acquire()
            try:
                status, headers, _ = self.call()
                self.assertEqual(status, 429)
                self.assertEqual(headers['Retry-After'], '2')
            finally:
                server.LOCK.release()
            with patch.object(server, 'RATE_LIMIT', 1):
                self.assertEqual(self.call()[0], 429)

    def test_http_workers_are_bounded_before_auth(self):
        # A fresh server has no just-finished thread releasing its slot from a
        # previous test's response, so the configured capacity is deterministic.
        bounded = server.BoundedHTTPServer(('127.0.0.1', 0), server.Handler)
        worker = threading.Thread(target=bounded.serve_forever, daemon=True)
        worker.start()
        held = []
        while bounded.workers.acquire(False):
            held.append(True)
        try:
            self.assertEqual(len(held), 4)
            connection = http.client.HTTPConnection('127.0.0.1', bounded.server_port, timeout=5)
            connection.request('GET', '/api/health')
            self.assertEqual(connection.getresponse().status, 429)
            connection.close()
        finally:
            for _ in held:
                bounded.workers.release()
            bounded.shutdown()
            bounded.server_close()
            worker.join()

    def test_duplicate_lengths_chunked_and_oversized_headers_rejected(self):
        for lines, expected in [('Content-Length: 1\r\nContent-Length: 2', 400), ('Transfer-Encoding: chunked\r\nContent-Length: 1', 400), ('Content-Length: 17000001', 413)]:
            with socket.create_connection(('127.0.0.1', self.http.server_port), timeout=5) as connection:
                connection.sendall((f'POST /api/analyze HTTP/1.0\r\nHost: localhost\r\nContent-Type: application/json\r\n{lines}\r\n\r\n').encode())
                self.assertIn(f' {expected} '.encode(), connection.recv(4096).split(b'\r\n')[0])


class AuthAndConfiguration(unittest.TestCase):
    def test_gotrue_and_rls_own_roles_both_must_confirm_current_user(self):
        with patch.object(server, 'LOCAL', False), patch.dict(os.environ, ENV):
            for role in ('setter', 'admin'):
                with self.subTest(allowed_role=role), patch.object(server, 'auth_json', side_effect=[{'id': UID}, [{'role': role}]]) as auth:
                    self.assertEqual(server.authenticated_user('Bearer fixture'), UID)
                    calls = [call.args[0] for call in auth.call_args_list]
                    self.assertEqual(len(calls), 2)
                    self.assertEqual(calls[0].full_url, ENV['THUMBNAIL_AUTH_URL'] + '/auth/v1/user')
                    self.assertEqual(calls[1].full_url, ENV['THUMBNAIL_AUTH_URL'] + '/rest/v1/user_roles?select=role&user_id=eq.' + UID + '&role=in.(setter,admin)&limit=1')
                    self.assertTrue(all(request.get_method() == 'GET' and request.data is None for request in calls))
                    self.assertTrue(all(request.get_header('Authorization') == 'Bearer fixture' and request.get_header('Apikey') == ENV['THUMBNAIL_PUBLIC_KEY'] for request in calls))
            for roles in ([], False, True, None, {}, {'role': 'admin'}, ['setter'], [{}], [{'role': 'user'}], [{'role': 'SETTER'}], [{'role': True}], [{'role': 'admin'}, {'role': 'setter'}]):
                with self.subTest(rejected_roles=roles), patch.object(server, 'auth_json', side_effect=[{'id': UID}, roles]):
                    self.assertIsNone(server.authenticated_user('Bearer fixture'))
            for invalid_user in ({'id': 'not-a-uuid'}, {'id': UID + '&role=eq.admin'}, {'role': 'admin'}):
                with patch.object(server, 'auth_json', return_value=invalid_user) as auth:
                    self.assertIsNone(server.authenticated_user('Bearer fixture'))
                    self.assertEqual(auth.call_count, 1)
            with patch.object(server, 'auth_json', side_effect=OSError('unavailable')):
                self.assertIsNone(server.authenticated_user('Bearer fixture'))
            self.assertIsNone(server.NoRedirect().redirect_request(None, None, None, None, None, None))

    def test_private_container_guard_and_no_service_role(self):
        with patch.object(server, 'LOCAL', False), patch.object(server, 'BIND', '0.0.0.0'), patch.dict(os.environ, {**ENV, 'THUMBNAIL_CONTAINER_PRIVATE': 'true'}):
            server.validate_configuration()
            with patch.dict(os.environ, {'THUMBNAIL_CONTAINER_PRIVATE': ''}):
                self.assertRaises(ValueError, server.validate_configuration)
            with patch.dict(os.environ, {'THUMBNAIL_PUBLIC_KEY': 'sb_secret_forbidden'}):
                self.assertRaises(ValueError, server.validate_configuration)
            jwt = 'fixture.' + base64.urlsafe_b64encode(b'{"role":"service_role"}').decode().rstrip('=') + '.signature'
            with patch.dict(os.environ, {'THUMBNAIL_PUBLIC_KEY': jwt}):
                self.assertRaises(ValueError, server.validate_configuration)
            for origin in ['*', 'https://evil.test/path', 'https://u:p@example.test', 'https://example.test?key=x', 'http://example.test']:
                with patch.dict(os.environ, {'THUMBNAIL_ALLOWED_ORIGINS': origin}):
                    self.assertRaises(ValueError, server.validate_configuration)
        with patch.object(server, 'LOCAL', True), patch.dict(os.environ, ENV):
            self.assertRaises(ValueError, server.validate_configuration)

    def test_rate_state_is_bounded_and_expires(self):
        server._RATES.clear()
        with patch.object(server, 'RATE_USERS', 2), patch.object(server, 'RATE_LIMIT', 2):
            self.assertTrue(server.rate_allowed('one', 1))
            self.assertTrue(server.rate_allowed('one', 2))
            self.assertFalse(server.rate_allowed('one', 3))
            self.assertTrue(server.rate_allowed('two', 4))
            self.assertFalse(server.rate_allowed('three', 5))
            self.assertTrue(server.rate_allowed('three', 65))
            self.assertLessEqual(len(server._RATES), 2)


class Models(unittest.TestCase):
    def test_download_and_runtime_reject_changed_sizes_hashes_and_old_partial(self):
        raw = b'fixed-model-fixture'
        models = {'fixture.onnx': (len(raw), hashlib.sha256(raw).hexdigest())}
        with tempfile.TemporaryDirectory() as directory, patch.object(download_models, 'MODELS', models):
            root = Path(directory)
            self.assertRaises(ValueError, download_models.verify_models, root)
            (root / 'fixture.onnx').write_bytes(raw)
            self.assertTrue(download_models.verify_models(root))
            (root / 'fixture.onnx').write_bytes(b'x' * len(raw))
            self.assertRaises(ValueError, download_models.verify_models, root)
            with patch.object(download_models.urllib.request, 'urlopen', return_value=io.BytesIO(raw + b'x')):
                self.assertRaises(ValueError, download_models.download, root)
            self.assertFalse((root / 'fixture.download').exists())
            (root / 'fixture.download').write_bytes(b'operator-partial')
            self.assertRaises(ValueError, download_models.download, root)
            self.assertEqual((root / 'fixture.download').read_bytes(), b'operator-partial')
            (root / 'fixture.download').unlink()
            with patch.object(download_models.urllib.request, 'urlopen', return_value=io.BytesIO(raw)) as request:
                download_models.download(root)
            self.assertIn(download_models.REVISION, request.call_args.args[0])
            self.assertTrue(download_models.verify_models(root))

    def test_cpu_only_sessions_verify_before_loading(self):
        cpu = Mock(get_providers=lambda: ['CPUExecutionProvider'])
        lifecycle = Mock()
        runtime = types.SimpleNamespace(SessionOptions=types.SimpleNamespace, disable_telemetry_events=lifecycle.telemetry_off, InferenceSession=lifecycle.session)
        runtime.InferenceSession.return_value = cpu
        with patch.dict(sys.modules, {'onnxruntime': runtime, 'numpy': types.ModuleType('numpy'), 'cv2': types.ModuleType('cv2')}):
            spec = importlib.util.spec_from_file_location('isolated_sam_runtime', Path(__file__).with_name('sam_local.py'))
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            with patch.object(module, 'verify_models') as verify:
                module.sessions()
                verify.assert_called_once_with(module.ROOT)
            self.assertEqual([call[0] for call in lifecycle.mock_calls], ['telemetry_off', 'session', 'session'])
            runtime.disable_telemetry_events.assert_called_once_with()
            self.assertTrue(all(call.kwargs['providers'] == ['CPUExecutionProvider'] for call in runtime.InferenceSession.call_args_list))
            module._SESSIONS = None
            runtime.InferenceSession.reset_mock()
            runtime.disable_telemetry_events.reset_mock()
            with patch.object(module, 'verify_models', side_effect=ValueError('bad hash')):
                self.assertRaises(ValueError, module.sessions)
            runtime.InferenceSession.assert_not_called()
            runtime.disable_telemetry_events.assert_not_called()


if __name__ == '__main__':
    unittest.main()
