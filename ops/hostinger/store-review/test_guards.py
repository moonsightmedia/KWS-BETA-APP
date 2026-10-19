import copy
import importlib.util
from pathlib import Path
import unittest


def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).parent / filename)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


prepare = module('prepare_review', 'prepare.py')
routing = module('public_review', 'public-routing.py')


class ReviewGuards(unittest.TestCase):
    def config(self):
        root = Path('/isolated-review')
        services = {name: {'container_name': 'realtime-dev.kws-store-review' if name == 'realtime' else 'kws-store-review-' + name,
                           'networks': {'default': None},
                           'volumes': [{'type': 'bind', 'source': str(root / name)}]}
                    for name in prepare.SERVICES + ['video']}
        for name, port in [('api-gw', '19080'), ('video', '19081')]:
            services[name]['ports'] = [{'host_ip': '127.0.0.1', 'published': port}]
        return {'name': 'kws-store-review', 'networks': {'default': {'internal': True}},
                'services': services, 'volumes': {}}, root

    def test_only_separate_loopback_stack_is_accepted(self):
        config, root = self.config()
        prepare.validate(config, root)

    def test_production_mount_network_port_and_privilege_are_rejected(self):
        config, root = self.config()
        changes = [('volumes', [{'type': 'bind', 'source': str(root / '..' / 'production')}]),
                   ('networks', {'supabase_default': None}), ('privileged', True),
                   ('ports', [{'host_ip': '0.0.0.0', 'published': '19080'}]),
                   ('extra_hosts', ['production:host-gateway'])]
        for key, value in changes:
            with self.subTest(key=key), self.assertRaises(AssertionError):
                changed = copy.deepcopy(config)
                changed['services']['api-gw'][key] = value
                prepare.validate(changed, root)

    def test_gateway_addition_preserves_existing_sites_and_hides_studio(self):
        caddy = 'existing.example { respond "existing" }\n'
        compose = 'services:\n  caddy:\n    networks: [supabase]\nnetworks:\n  supabase:\n    external: true\n'
        new_caddy, new_compose = routing.candidate(caddy, compose)
        self.assertTrue(new_caddy.startswith(caddy.rstrip()))
        self.assertIn('respond "Unknown review API route" 404', new_caddy)
        self.assertNotIn('/pg/', routing.ROUTES)
        self.assertIn('name: kws-store-review-private', new_compose)
        with self.assertRaises(AssertionError):
            routing.candidate(new_caddy, new_compose)


if __name__ == '__main__':
    unittest.main()
