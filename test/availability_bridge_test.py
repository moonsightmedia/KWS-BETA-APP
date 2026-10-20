import hashlib
import hmac
import importlib.util
import json
from pathlib import Path
import unittest


spec = importlib.util.spec_from_file_location('availability_bridge', Path(__file__).parents[1] / 'ops/monitoring/availability-bridge.py')
bridge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)


class Reply:
    status = 200

    def __init__(self, body):
        self.body = body

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self, limit):
        return self.body[:limit]


class Opener:
    def __init__(self, body):
        self.body = body
        self.request = None

    def open(self, request, timeout):
        self.request = request
        self.timeout = timeout
        return Reply(self.body)


class AvailabilityBridgeTests(unittest.TestCase):
    def setUp(self):
        self.config = {'signing_key': 'ab' * 32, 'public_key': 'fixture-public-key'}

    def test_exact_snapshot_signature_and_fixed_destination(self):
        opener = Opener(b'{"accepted":true,"updated":true}')
        snapshot = '{"message":"Prüfung"}\n'
        self.assertEqual(bridge.publish(self.config, snapshot, opener), {'accepted': True, 'updated': True})
        body = json.loads(opener.request.data)
        self.assertEqual(body['p_snapshot'], snapshot)
        self.assertEqual(body['p_signature'], hmac.new(bytes.fromhex('ab' * 32), snapshot.encode(), hashlib.sha256).hexdigest())
        self.assertEqual(opener.request.full_url, bridge.TARGET)
        self.assertEqual(opener.timeout, 15)

    def test_rejects_false_or_unbounded_acknowledgements(self):
        for body in [b'{"accepted":false}', b'{"accepted":true,"updated":1}', b'{}', b'x' * 4097, b'{"accepted":true,"updated":true,"extra":1}']:
            with self.subTest(body=body[:50]), self.assertRaises(ValueError):
                bridge.publish(self.config, '{}', Opener(body))

    def test_rejects_invalid_configuration_or_oversized_snapshot(self):
        for config in [{}, {**self.config, 'extra': 'value'}, {**self.config, 'signing_key': 'x' * 64}, {**self.config, 'public_key': ''}]:
            with self.subTest(config=list(config)), self.assertRaises((ValueError, KeyError)):
                bridge.publish(config, '{}', Opener(b'{}'))
        with self.assertRaises(ValueError):
            bridge.publish(self.config, 'ä' * 16385, Opener(b'{}'))

    def test_refuses_redirects(self):
        with self.assertRaises(ValueError):
            bridge.NoRedirect().redirect_request(None, None, 302, 'Found', {}, 'https://example.invalid')


if __name__ == '__main__':
    unittest.main()
